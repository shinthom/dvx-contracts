// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);

    function decimals() external view returns (uint8);

    function approve(address spender, uint256 amount) external returns (bool);

    function transfer(address to, uint256 value) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function deposit() external payable; // weth

    function withdraw(uint256 amount) external; // weth
}
