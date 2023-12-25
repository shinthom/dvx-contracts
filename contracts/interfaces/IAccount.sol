// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./IExchange.sol";

interface IAccount {
    event Deposited(address indexed account, address indexed token, uint256 amount);
    event Withdrawn(address indexed account, address indexed token, uint256 amount);
    event OrderCreated(address indexed account, address indexed exchange, IExchange.PositionOrder order);

    function getBalance(address token) external view returns (uint256);

    function deposit(address token, uint256 amount) payable external;
    function withdraw(address token, uint256 amount) external;

    function createOrders(
        address[] calldata adapters,
        IExchange.PositionOrder[] calldata orders
    ) payable external;

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amount
    ) external returns (uint256 amountOut);
}