// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IERC20} from "../interfaces/IERC20.sol";
import {ISwapper} from "../interfaces/ISwapper.sol";
import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

contract Swapper is ISwapper {
    address private constant _swapRouter =
        0xE592427A0AEce92De3Edee1F18E0157C05861564; // uniswap V3

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) public override returns (uint256 amountOut) {
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
}
