// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IExchange} from "./IExchange.sol";

interface IAccount {
    event Deposited(
        address indexed account,
        address indexed token,
        uint256 amount
    );

    event Withdrawn(
        address indexed account,
        address indexed token,
        uint256 amount
    );

    function getBalance(address token) external view returns (uint256);

    function deposit(address token, uint256 amount) external payable;

    function withdraw(address token, uint256 amount) external;

    function increasePosition(
        address adapter,
        IExchange.MarketOrder calldata marketOrder
    ) external payable;

    function decreasePosition(
        address adapter,
        IExchange.MarketOrder calldata marketOrder
    ) external payable;

    function increaseCollateral(
        address adapter,
        IExchange.MarketOrder calldata marketOrder
    ) external payable;

    function decreaseCollateral(
        address adapter,
        IExchange.MarketOrder calldata marketOrder
    ) external payable;
}
