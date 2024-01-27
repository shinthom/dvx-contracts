// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

interface IAccount {
    function owner() external view returns (address);

    function exchange() external view returns (address);

    function getBalance(address token) external view returns (uint256);

    function getLockedBalance(address token) external view returns (uint256);

    function getWithdrawableBalance(
        address token
    ) external view returns (uint256);

    function deposit(address token, uint256 amount) external;

    function withdraw(address token, uint256 amount) external;
}
