// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

interface IAccount {
    event Deposited(
        address indexed sender,
        address indexed token,
        uint256 amount
    );

    event Withdrawn(address indexed token, uint256 amount);

    event Swapped(
        address indexed account,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    function owner() external view returns (address);

    function exchange() external view returns (address);

    function getBalance(address token) external view returns (uint256);

    function deposit(address token, uint256 amount) external;

    function withdraw(address token, uint256 amount) external;
}
