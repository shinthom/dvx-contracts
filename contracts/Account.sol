// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IERC20 } from "./interfaces/tokens/IERC20.sol";
import { IAccount } from "./interfaces/IAccount.sol";
import { IAdapter } from  "./interfaces/IAdapter.sol";
import { IExchange } from "./interfaces/IExchange.sol";
import { IWarehouse } from  "./interfaces/IWarehouse.sol";

contract Account is IAccount {
    // todo: remove this
    address constant private ETH = address(0);
    address constant private WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;

    address private _owner;
    address private _exchange;

    mapping(address => uint256) private _lockedBalances;

    receive() external payable {}

    constructor(address owner_, address exchange_) {
        _owner = owner_;
        _exchange = exchange_;
    }

    modifier onlyOwner() {
        require(
            _owner == msg.sender,
            "Account: NOT_OWNER"
        );
        _;
    }

    function owner() override public view returns (address) { return _owner; }

    function exchange() override public view returns (address) { return _exchange; }

    function getPositions(
        address adapter,
        address[] memory collaterals,
        address[] memory indexs
    ) override public view returns (IAdapter.Position[] memory) {
        bool[] memory isLongs = new bool[](2);
        isLongs[0] = true;
        isLongs[1] = false;

        IAdapter.Position[] memory positions
            = new IAdapter.Position[](collaterals.length * indexs.length * isLongs.length);

        for (uint256 i = 0; i < collaterals.length; i++) {
            for (uint256 j = 0; j < indexs.length; j++) {
                for (uint256 k = 0; k < isLongs.length; k++) {
                    positions[i * indexs.length * isLongs.length + j * isLongs.length + k]
                        = IAdapter(adapter).getPosition(address(this), collaterals[i], indexs[j], isLongs[k]);
                }
            }
        }
        return positions;
    }

    function getPosition(
        address adapter,
        address collateral,
        address index,
        bool isLong
    ) override public view returns (IAdapter.Position memory) {
        return IAdapter(adapter).getPosition(address(this), collateral, index, isLong);
    }

    function getBalance(address token) override public view returns (uint256) {
        if (token == address(0)) {
            return address(this).balance;
        } else {
            return IERC20(token).balanceOf(address(this));
        }
    }

    function getLockedBalance(address token) override public view returns (uint256) {
        return _lockedBalances[token];
    }

    function deposit(address token, uint256 amount) override external payable {
        require(amount > 0, "Account: ZERO_AMOUNT");

        if (token == address(0)) {
            require(amount == msg.value, "Account: INVALID_AMOUNT");
        } else {
            IERC20(token).transferFrom(msg.sender, address(this), amount );
        }
        emit Deposited(msg.sender, token, amount);
    }

    function withdraw(address token, uint256 amount) override external onlyOwner  {
        require(amount > 0, "Account: ZERO_AMOUNT");

        if (token == address(0)) {
            payable(msg.sender).transfer(amount);
        } else {
            IERC20(token).transfer(msg.sender, amount);
        }
        emit Withdrawn(msg.sender, token, amount);
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) override external onlyOwner returns (uint256 amountOut) {
        require(tokenIn != tokenOut, "Account: SAME_TOKEN");

        if (tokenIn == address(0)) {
            require(address(this).balance >= amountIn, "INSUFFICIENT_BALANCE");
            amountOut = IExchange(_exchange).swap{value: amountIn}(tokenIn, tokenOut, amountIn);
        } else {
            IERC20(tokenIn).approve(_exchange, amountIn);
            amountOut = IExchange(_exchange).swap(tokenIn, tokenOut, amountIn);
        }
    }

    function _createMarketOrder(
        address adapter,
        IExchange.PositionOrder calldata order
    ) private returns (bool success, bytes memory data) {
        IExchange.OrderType orderType = order.orderType;

        // // todo: fix
        // uint256 fee;
        // if (_exchange != address(0)) {
        //     fee = IExchange(_exchange).getFee(
        //         orderType,
        //         order
        //     );
        // }

        if (orderType == IExchange.OrderType.IncreasePosition) {
            return adapter.delegatecall(
                abi.encodeWithSignature(
                    "increasePosition(address[],address,uint256,uint256,bool)",
                    order.path,
                    order.index,
                    order.collateralAmount,
                    order.size,
                    order.isLong
                )
            );
        } else if (orderType == IExchange.OrderType.DecreasePosition) {
            require(order.path.length == 1, "INVALID_PATH");
            return adapter.delegatecall(
                abi.encodeWithSignature(
                    "decreasePosition(address,address,uint256,bool)",
                    order.path[0],
                    order.index,
                    order.size,
                    order.isLong
                )
            );
        } else if (orderType == IExchange.OrderType.IncreaseCollateral) {
            return adapter.delegatecall(
                abi.encodeWithSignature(
                    "increaseCollateral(address[],address,uint256,bool)",
                    order.path,
                    order.index,
                    order.collateralAmount,
                    order.isLong
                )
            );
        } else if (orderType == IExchange.OrderType.DecreaseCollateral) {
            require(order.path.length == 1, "INVALID_PATH");
            return adapter.delegatecall(
                abi.encodeWithSignature(
                    "decreaseCollateral(address,address,uint256,bool)",
                    order.path[0],
                    order.index,
                    order.collateralAmount,
                    order.isLong
                )
            );
        }
        emit MarketOrderCreated(address(this), adapter, order);
    }

    function createMarketOrders(
        address[] calldata adapters,
        IExchange.PositionOrder[] calldata orders
    ) override external payable onlyOwner {
        for (uint256 i = 0; i < adapters.length; i++) {
            (bool success, bytes memory data) = _createMarketOrder(
                adapters[i],
                orders[i]
            );
            require(success, string(data));
        }
    }

    function _validateCollateralAmount(address collateral, uint256 collateralAmount) private view returns (bool) {
        uint256 balance;
        uint256 lockedBalance;
        if (collateral == WETH) {
            balance = getBalance(ETH);
            lockedBalance = getLockedBalance(ETH);
        } else {
            balance = getBalance(collateral);
            lockedBalance = getLockedBalance(collateral);
        }

        return balance - lockedBalance >= collateralAmount;
    }

    // function createLimitOrder(
    //     address collateral,
    //     address index,
    //     uint256 collateralAmount,
    //     uint256 size,
    //     bool isLong,
    //     uint256 price
    // ) override public onlyOwner {
    //     require(
    //         _validateCollateralAmount(collateral, collateralAmount),
    //         "invalid collateral amount"
    //     );
    //     if (collateral == WETH) {
    //         _lockedBalances[ETH] += collateralAmount;
    //     } else {
    //         _lockedBalances[collateral] += collateralAmount;
    //     }

    //     address warehouse = IExchange(_exchange).warehouse();
    //     IWarehouse(warehouse).createLimitOrder(
    //         collateral,
    //         index,
    //         collateralAmount,
    //         size,
    //         isLong,
    //         price
    //     );
    // }

    // function cancelLimitOrder(uint256 orderIndex) override public onlyOwner {
    //     address warehouse = IExchange(_exchange).warehouse();
    //     IExchange.LimitOrder memory limitOrder = IWarehouse(warehouse).getLimitOrder(address(this), orderIndex);
    //     require(limitOrder.size > 0, "Warehouse: non-existent limit order");

    //     if (limitOrder.collateral == WETH) {
    //         _lockedBalances[ETH] -= limitOrder.collateralAmount;
    //     } else {
    //         _lockedBalances[limitOrder.collateral] -= limitOrder.collateralAmount;
    //     }

    //     IWarehouse(warehouse).cancelLimitOrder(orderIndex);
    // }

    // function executeLimitOrder(
    //     address[] calldata adapters,
    //     IExchange.PositionOrder[] calldata orders
    // ) override public payable {
    //     address warehouse = IExchange(_exchange).warehouse();
    //     require(msg.sender == warehouse, "NOT_WAREHOUSE");

    //     uint256 collateralAmount;
    //     for (uint256 i = 0; i < orders.length; i++) {
    //         collateralAmount += orders[i].collateralAmount;
    //     }

    //     address collateral = orders[0].path[orders[0].path.length - 1];
    //     if (collateral == WETH) {
    //         _lockedBalances[ETH] -= collateralAmount;
    //     } else {
    //         _lockedBalances[collateral] -= collateralAmount;
    //     }

    //     for (uint256 i = 0; i < adapters.length; i++) {
    //         (bool success, bytes memory data) = _createMarketOrder(
    //             adapters[i],
    //             orders[i]
    //         );
    //         require(success, string(data));
    //     }
    // }

    function createTriggerOrder(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        IWarehouse.TriggerOrderType orderType,
        uint256 triggerPrice,
        uint256 acceptablePrice,
        uint256 executionFee
    ) override public payable onlyOwner {
        require(size > 0, "Account: ZERO_SIZE");

        require(msg.value == executionFee, "Account: FEE_MISMATCH");
        require(
            executionFee >= IAdapter(adapter).getMinExecutionFee(),
            "Account: INSUFFICIENT_FEE"
        );

        address warehouse = IExchange(_exchange).warehouse();
        IWarehouse(warehouse).createTriggerOrder{value: executionFee}(
            adapter,
            collateral,
            index,
            isLong,
            size,
            orderType,
            triggerPrice,
            acceptablePrice
        );
    }

    function cancelTriggerOrder(bytes32 positionKey, uint256 id) override public onlyOwner {
        address warehouse = IExchange(_exchange).warehouse();
        IWarehouse(warehouse).cancelTriggerOrder(positionKey, id);
    }

    function executeTriggerOrder(
        address adapter,
        IExchange.PositionOrder calldata order
    ) override public payable {
        address warehouse = IExchange(_exchange).warehouse();
        require(msg.sender == warehouse, "NOT_WAREHOUSE");

        (bool success, bytes memory data) = _createMarketOrder(adapter, order);
        require(success, string(data));
    }

    // todo
    // function manageMargins() onlyExchange;
}
