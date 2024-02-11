// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IERC20} from "../interfaces/IERC20.sol";
import {ISwapper} from "../interfaces/ISwapper.sol";
import {IQuoterV2} from "@uniswap/v3-periphery/contracts/interfaces/IQuoterV2.sol";
import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

contract Swapper is ISwapper {
    address private constant _swapRouter =
        0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address private constant _swapQuoter =
        0x61fFE014bA17989E743c5F6cB21bF9697530B21e;

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) public override returns (uint256 amountOut) {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        IERC20(tokenIn).approve(_swapRouter, amountIn);
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: 3000,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });
        amountOut = ISwapRouter(_swapRouter).exactInputSingle(params);
    }

    function quoteExactInput(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external override returns (uint256) {
        IQuoterV2.QuoteExactInputSingleParams memory params = IQuoterV2
            .QuoteExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: 3000,
                amountIn: amountIn,
                sqrtPriceLimitX96: 0
            });

        (uint256 amountOut, , , ) = IQuoterV2(_swapQuoter)
            .quoteExactInputSingle(params);
        return amountOut;
    }

    function quoteExactOutput(
        address tokenIn,
        address tokenOut,
        uint256 amountOut
    ) external override returns (uint256) {
        IQuoterV2.QuoteExactOutputSingleParams memory params = IQuoterV2
            .QuoteExactOutputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: 3000,
                amount: amountOut,
                sqrtPriceLimitX96: 0
            });

        (uint256 amountIn, , , ) = IQuoterV2(_swapQuoter)
            .quoteExactOutputSingle(params);
        return amountIn;
    }
}
