// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

interface ISwapper {
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (uint256 amountOut);

    function quoteExactInput(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (uint256);

    function quoteExactOutput(
        address tokenIn,
        address tokenOut,
        uint256 amountOut
    ) external returns (uint256);
}
