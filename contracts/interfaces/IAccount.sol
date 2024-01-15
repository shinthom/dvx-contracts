// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IAdapter } from "./IAdapter.sol";
import { IWarehouse } from "./IWarehouse.sol";
import { IExchange } from "./IExchange.sol";

interface IAccount {
    event Deposited(address indexed account, address indexed token, uint256 amount);
    event Withdrawn(address indexed account, address indexed token, uint256 amount);

    event MarketOrderCreated(address indexed account, address indexed exchange, IExchange.PositionOrder order);
    event LimitOrderCreated(address indexed account, uint256 limitOrderId, IExchange.LimitOrder order);
    event LimitOrderCanceled(address indexed account, uint256 limitOrderId);
    event LimitOrderExecuted(address indexed keeper, address indexed account, uint256 limitOrderId);

    event TriggerOrderCreated(address indexed account, uint256 triggerOrderId, IExchange.TriggerOrder order);
    event TriggerOrderCanceled(address indexed account, uint256 triggerOrderId);
    event TriggerOrderExecuted(address indexed keeper, address indexed account, uint256 triggerOrderId);

    function owner() external view returns (address);
    function exchange() external view returns (address);
    function getPositions(
        address adapter,
        address[] memory collaterals,
        address[] memory indexs
    ) external view returns (IAdapter.Position[] memory);
    function getPosition(
        address adapter,
        address collateral,
        address index,
        bool isLong
    ) external view returns (IAdapter.Position memory);
    function getWrapPosition(
        address adapter,
        address collateral,
        address index,
        bool isLong
    ) external view returns (IAdapter.Position memory);
    function getBalance(address token) external view returns (uint256);
    function getLockedBalance(address token) external view returns (uint256);

    function deposit(address token, uint256 amount) payable external;
    function withdraw(address token, uint256 amount) external;
    function swap(address tokenIn, address tokenOut, uint256 amount) external returns (uint256 amountOut);
    function createMarketOrders(address[] calldata adapters, IExchange.PositionOrder[] calldata orders) payable external;
    // function createLimitOrder(
    //     address collateral,
    //     address index,
    //     uint256 collateralAmount,
    //     uint256 size,
    //     bool isLong,
    //     uint256 price
    // ) external;
    // function cancelLimitOrder(uint256 orderIndex) external;
    // function executeLimitOrder(
    //     address[] memory adapters,
    //     IExchange.PositionOrder[] calldata orders
    // ) payable external;
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
    ) external payable;
    function cancelTriggerOrder(bytes32 positionKey, uint256 id) external;
    function executeTriggerOrder(address adapter, IExchange.PositionOrder calldata order) external payable;
}