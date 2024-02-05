// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

// prettier-ignore

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function permit(
        address owner,
        address spender,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function deposit() external payable; // weth
    function withdraw(uint256 amount) external; // weth

    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}
