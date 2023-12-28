// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./IExchange.sol";

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

    function getBalance(address token) external view returns (uint256);

    function deposit(address token, uint256 amount) payable external;
    function withdraw(address token, uint256 amount) external;
    function swap(address tokenIn, address tokenOut, uint256 amount) external returns (uint256 amountOut);

    function createMarketOrders(address[] calldata adapters, IExchange.PositionOrder[] calldata orders) payable external;
    function executeLimitOrder(address[] memory adapters, IExchange.PositionOrder[] calldata orders) payable external;
    function executeTriggerOrder(address adapter, IExchange.PositionOrder calldata order) payable external;

    // function cancelLimitOrder(uint256 limitOrderId) external;
    // function executeLimitOrder(uint256 limitOrderId) external;
    // function cancelTriggerOrder(uint256 triggerOrderId) external;
    // function executeTriggerOrder(uint256 triggerOrderId) external;
}