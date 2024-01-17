// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IERC20} from "./interfaces/IERC20.sol";
import {IAccount} from "./interfaces/IAccount.sol";
import {IAdapter} from "./interfaces/IAdapter.sol";
import {IExchange} from "./interfaces/IExchange.sol";
import {IWarehouse} from "./interfaces/IWarehouse.sol";
import {Governable} from "./access/Governable.sol";

contract Warehouse is IWarehouse, Governable {
    uint256 private constant BASIS_POINTS_DIVISOR = 10000;

    address private constant _weth = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;

    mapping(bytes32 => TriggerOrder[]) private _triggerOrders;
    mapping(address => LimitOrder[])   private _limitOrders; // prettier-ignore
    mapping(address => mapping(address => uint256)) public override lockedBalance; // prettier-ignore

    address public exchange;
    mapping(address => bool) public isOrderKeeper;

    uint256 public priceMinDeviation = 500; // 5%

    modifier onlyExchange() {
        require(msg.sender == exchange, "msg.sender: not exchange");
        _;
    }

    modifier onlyOrderKeeper() {
        require(isOrderKeeper[msg.sender], "msg.sender: not orderKeeper");
        _;
    }

    function setExchange(address _exchange) external onlyGov {
        require(_exchange != address(0), "exchange: zero address");

        exchange = _exchange;
        emit ExchangeSet(_exchange);
    }

    function setOrderKeeper(
        address orderKeeper,
        bool isActive
    ) external onlyGov {
        require(orderKeeper != address(0), "exchange: zero address");

        isOrderKeeper[orderKeeper] = isActive;
        emit OrderKeeperSet(orderKeeper, isActive);
    }

    function setPriceMinDeviation(uint256 deviation) external onlyGov {
        require(
            deviation <= BASIS_POINTS_DIVISOR,
            "priceMinDeviation: exceed limit"
        );

        priceMinDeviation = deviation;
        emit PriceMinDeviationSet(deviation);
    }

    function getPositionKey(
        address account,
        address adapter,
        address collateral,
        address index,
        bool isLong
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(account, adapter, collateral, index, isLong)
            );
    }

    function getTriggerOrders(
        bytes32 positionKey
    ) public view returns (TriggerOrder[] memory) {
        return _triggerOrders[positionKey];
    }

    function getTriggerOrder(
        bytes32 positionKey,
        uint256 id
    ) public view override returns (TriggerOrder memory) {
        return _triggerOrders[positionKey][id];
    }

    function getLimitOrders(
        address account
    ) public view override returns (LimitOrder[] memory) {
        return _limitOrders[account];
    }

    function getLimitOrder(
        address account,
        uint256 id
    ) public view override returns (LimitOrder memory) {
        return _limitOrders[account][id];
    }

    function createTriggerOrder(
        address account,
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        TriggerOrderType orderType,
        uint256 triggerPrice, // 1e18
        uint256 acceptablePrice, // 1e18
        uint256 executionFee
    ) external payable override onlyExchange {
        require(
            (isLong && triggerPrice >= acceptablePrice) ||
                (!isLong && triggerPrice <= acceptablePrice),
            "triggerPrice: invalid"
        );

        if (priceMinDeviation > 0) {
            uint256 minDeviation = (triggerPrice * priceMinDeviation) /
                BASIS_POINTS_DIVISOR;
            require(
                (isLong && triggerPrice - acceptablePrice <= minDeviation) ||
                    (!isLong && acceptablePrice - triggerPrice <= minDeviation),
                "acceptablePrice: out of deviation"
            );
        }

        uint256 minExeuctionFee = IAdapter(adapter).getMinExecutionFee();
        require(executionFee == msg.value, "executionFee: not match");
        require(executionFee >= minExeuctionFee, "executionFee: not enough");

        IAdapter.Position memory position = IAdapter(adapter).getPosition(
            account,
            collateral,
            index,
            isLong
        );
        require(position.size > 0, "position: not exist");

        bytes32 positionKey = getPositionKey(
            account,
            adapter,
            collateral,
            index,
            isLong
        );

        TriggerOrder memory triggerOrder = TriggerOrder({
            id: _triggerOrders[positionKey].length,
            state: TriggerOrderState.Pending,
            account: account,
            adapter: adapter,
            collateral: collateral,
            index: index,
            isLong: isLong,
            size: size,
            orderType: orderType,
            triggerPrice: triggerPrice,
            acceptablePrice: acceptablePrice,
            createdAt: block.timestamp
        });
        _triggerOrders[positionKey].push(triggerOrder);
        emit TriggerOrderCreated(account, positionKey, triggerOrder.id);
    }

    function cancelTriggerOrder(
        bytes32 positionKey,
        uint256 id
    ) external override onlyExchange {
        require(
            _triggerOrders[positionKey].length >= id + 1,
            "id: out of range"
        );

        TriggerOrder memory triggerOrder = _triggerOrders[positionKey][id];
        require(
            triggerOrder.state == TriggerOrderState.Pending,
            "triggerOrder: not pending"
        );

        _triggerOrders[positionKey][id].state = TriggerOrderState.Canceled;
        emit TriggerOrderCanceled(triggerOrder.account, positionKey, id);
    }

    function executeTriggerOrder(
        bytes32 positionKey,
        uint256 id
    ) external payable onlyOrderKeeper {
        require(
            _triggerOrders[positionKey].length >= id + 1,
            "id: out of range"
        );

        TriggerOrder memory triggerOrder = _triggerOrders[positionKey][id];
        require(
            triggerOrder.state == TriggerOrderState.Pending,
            "state: not pending"
        );

        uint256 markPrice = IAdapter(triggerOrder.adapter).getWrapPrice(
            triggerOrder.index,
            triggerOrder.isLong
        );
        require(
            (triggerOrder.isLong &&
                markPrice >= triggerOrder.acceptablePrice) ||
                (!triggerOrder.isLong &&
                    markPrice <= triggerOrder.acceptablePrice),
            "price: not acceptable"
        );

        uint256 minExecutionFee = IAdapter(triggerOrder.adapter)
            .getMinExecutionFee();
        require(address(this).balance >= minExecutionFee, "fee: insufficient");

        _triggerOrders[positionKey][id].state = TriggerOrderState.Executed;
        emit TriggerOrderExecuted(triggerOrder.account, positionKey, id);

        address[] memory path = new address[](1);
        path[0] = triggerOrder.collateral;

        IExchange.MarketOrder memory marketOrder = IExchange.MarketOrder({
            path: path,
            index: triggerOrder.index,
            collateralAmount: 0,
            size: triggerOrder.size,
            isLong: triggerOrder.isLong
        });
        IExchange(exchange).executeTriggerOrder{value: minExecutionFee}(
            triggerOrder.adapter,
            triggerOrder.account,
            marketOrder
        );
    }

    function createLimitOrder(
        address account,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 triggerPrice,
        uint256 acceptablePrice,
        uint256 executionFee
    ) external payable override onlyExchange {
        require(
            (isLong && triggerPrice <= acceptablePrice) ||
                (!isLong && triggerPrice >= acceptablePrice),
            "triggerPrice: invalid"
        );
        require(executionFee == msg.value, "executionFee: mismatch");

        uint256 balance = collateral == _weth
            ? IAccount(account).getBalance(address(0))
            : IAccount(account).getBalance(collateral);
        require(
            balance - lockedBalance[account][collateral] >= collateralAmount,
            "collateralAmount: over balance"
        );
        lockedBalance[account][collateral] += collateralAmount;

        LimitOrder memory limitOrder = LimitOrder({
            id: _limitOrders[account].length,
            state: LimitOrderState.Pending,
            collateral: collateral,
            index: index,
            collateralAmount: collateralAmount,
            size: size,
            isLong: isLong,
            triggerPrice: triggerPrice,
            acceptablePrice: acceptablePrice,
            createdAt: block.timestamp
        });
        _limitOrders[account].push(limitOrder);
        emit LimitOrderCreated(account, limitOrder.id);
    }

    function cancelLimitOrder(
        address account,
        uint256 id
    ) external override onlyExchange {
        require(_limitOrders[account].length > id, "id: out of range");

        LimitOrder memory limitOrder = _limitOrders[account][id];
        require(
            limitOrder.state == LimitOrderState.Pending,
            "state: not pending"
        );
        _limitOrders[account][id].state = LimitOrderState.Canceled;
        emit LimitOrderCanceled(account, id);

        lockedBalance[account][limitOrder.collateral] -= limitOrder.collateralAmount; // prettier-ignore
    }

    function executeLimitOrder(
        address adapter,
        address account,
        uint256 id
    ) external payable onlyExchange {
        IWarehouse.LimitOrder memory limitOrder = _limitOrders[account][id]; // prettier-ignore
        require(
            limitOrder.state == LimitOrderState.Pending,
            "state: not pending"
        );

        uint256 minExecutionFee = IAdapter(adapter).getMinExecutionFee();
        require(address(this).balance >= minExecutionFee, "fee: insufficient");

        uint256 markPrice = IAdapter(adapter).getWrapPrice(
            limitOrder.index,
            limitOrder.isLong
        );
        require(
            (limitOrder.isLong && markPrice >= limitOrder.acceptablePrice) ||
                (!limitOrder.isLong && markPrice <= limitOrder.acceptablePrice),
            "price: not acceptable"
        );
        _limitOrders[account][id].state = LimitOrderState.Executed;
        emit LimitOrderExecuted(account, id);

        lockedBalance[account][limitOrder.collateral] -= limitOrder.collateralAmount; // prettier-ignore

        IExchange.MarketOrder memory marketOrder = IAdapter(adapter)
            .makeMarketOrder(
                limitOrder.collateral,
                limitOrder.index,
                limitOrder.collateralAmount,
                limitOrder.size,
                limitOrder.isLong
            );
        IAccount(account).increasePosition{value: minExecutionFee}(
            adapter,
            marketOrder
        );
    }

    function withdraw(
        address receiver,
        address token,
        uint256 amount
    ) external {
        require(msg.sender == gov, "msg.sender: not gov");

        require(receiver != address(0), "receiver: zero address");
        require(amount > 0, "amount: zero");

        if (token == address(0)) {
            payable(msg.sender).transfer(amount);
        } else {
            IERC20(token).transfer(msg.sender, amount);
        }
        emit Withdrawn(msg.sender, token, amount);
    }
}
