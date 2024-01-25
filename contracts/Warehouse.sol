// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IAdapter} from "./interfaces/IAdapter.sol";
import {IWarehouse} from "./interfaces/IWarehouse.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract Warehouse is IWarehouse, OwnableUpgradeable, UUPSUpgradeable {
    uint256 private constant BASIS_POINTS_DIVISOR = 10000;

    address private constant _weth = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;

    mapping(bytes32 => TriggerOrder[]) private _triggerOrders;
    mapping(address => LimitOrder[]) private _limitOrders;

    address public exchange;

    uint256 public priceMinDeviation;

    modifier onlyExchange() {
        require(msg.sender == exchange, "msg.sender: not exchange");
        _;
    }

    function initialize() external virtual initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    function setExchange(address _exchange) external onlyOwner {
        require(_exchange != address(0), "exchange: zero address");

        exchange = _exchange;
        emit ExchangeSet(_exchange);
    }

    function setPriceMinDeviation(uint256 deviation) external onlyOwner {
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
    ) public pure override returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(account, adapter, collateral, index, isLong)
            );
    }

    function getTriggerOrders(
        bytes32 positionKey
    ) public view override returns (TriggerOrder[] memory) {
        return _triggerOrders[positionKey];
    }

    function getTriggerOrder(
        bytes32 positionKey,
        uint256 orderId
    ) public view override returns (TriggerOrder memory) {
        return _triggerOrders[positionKey][orderId];
    }

    function getLimitOrders(
        address account
    ) public view override returns (LimitOrder[] memory) {
        return _limitOrders[account];
    }

    function getLimitOrder(
        address account,
        uint256 orderId
    ) public view override returns (LimitOrder memory) {
        return _limitOrders[account][orderId];
    }

    function createLimitOrder(
        address account,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 triggerPrice,
        uint256 acceptablePrice
    ) external payable override onlyExchange {
        LimitOrder memory limitOrder = LimitOrder({
            orderId: _limitOrders[account].length,
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
        emit LimitOrderCreated(account, limitOrder.orderId);
    }

    function cancelLimitOrder(
        address account,
        uint256 orderId
    )
        external
        override
        onlyExchange
        returns (IWarehouse.LimitOrder memory limitOrder)
    {
        limitOrder = _limitOrders[account][orderId];
        require(
            limitOrder.state == LimitOrderState.Pending,
            "state: not pending"
        );

        _limitOrders[account][orderId].state = LimitOrderState.Canceled;
        emit LimitOrderCanceled(account, orderId);
    }

    function executeLimitOrder(
        address account,
        address adapter,
        uint256 orderId
    )
        external
        payable
        override
        onlyExchange
        returns (IWarehouse.LimitOrder memory limitOrder)
    {
        limitOrder = _limitOrders[account][orderId];
        require(
            limitOrder.state == LimitOrderState.Pending,
            "state: not pending"
        );

        uint256 markPrice = IAdapter(adapter).getWrapPrice(
            limitOrder.index,
            limitOrder.isLong
        );
        require(
            (limitOrder.isLong && markPrice <= limitOrder.acceptablePrice) ||
                (!limitOrder.isLong && markPrice >= limitOrder.acceptablePrice),
            "price: not acceptable"
        );

        _limitOrders[account][orderId].state = LimitOrderState.Executed;
        emit LimitOrderExecuted(account, orderId);
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
            orderId: _triggerOrders[positionKey].length,
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
            executionFee: executionFee,
            createdAt: block.timestamp
        });
        _triggerOrders[positionKey].push(triggerOrder);
        emit TriggerOrderCreated(account, positionKey, triggerOrder.orderId);
    }

    function cancelTriggerOrder(
        address account,
        bytes32 positionKey,
        uint256 orderId
    ) external override onlyExchange {
        TriggerOrder memory triggerOrder = _triggerOrders[positionKey][orderId];
        require(
            triggerOrder.account == account,
            "triggerOrder: not belong to account"
        );
        require(
            triggerOrder.state == TriggerOrderState.Pending,
            "triggerOrder: not pending"
        );

        _triggerOrders[positionKey][orderId].state = TriggerOrderState.Canceled;
        emit TriggerOrderCanceled(triggerOrder.account, positionKey, orderId);
    }

    function executeTriggerOrder(
        bytes32 positionKey,
        uint256 orderId
    )
        external
        override
        onlyExchange
        returns (TriggerOrder memory triggerOrder)
    {
        triggerOrder = _triggerOrders[positionKey][orderId];
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

        _triggerOrders[positionKey][orderId].state = TriggerOrderState.Executed;
        emit TriggerOrderExecuted(triggerOrder.account, positionKey, orderId);
    }
}
