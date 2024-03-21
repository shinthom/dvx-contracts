// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// 1:1 (configurable ratio) swapper. Must be pre-funded with the output token.
contract MockSwapper {
    uint256 public rateNumerator = 1;
    uint256 public rateDenominator = 1;

    function setRate(uint256 numerator, uint256 denominator) external {
        rateNumerator = numerator;
        rateDenominator = denominator;
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (uint256 amountOut) {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        amountOut = (amountIn * rateNumerator) / rateDenominator;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
    }

    function quoteExactInput(
        address,
        address,
        uint256 amountIn
    ) external view returns (uint256) {
        return (amountIn * rateNumerator) / rateDenominator;
    }

    function quoteExactOutput(
        address,
        address,
        uint256 amountOut
    ) external view returns (uint256) {
        return (amountOut * rateDenominator) / rateNumerator;
    }
}
