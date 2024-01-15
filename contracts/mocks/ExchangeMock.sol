// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {Exchange} from "../Exchange.sol";

contract ExchangeMock is Exchange {
    function increaseLockedBalance(
        address account,
        address token,
        uint256 amount
    ) external {
        lockedBalances[account][token] += amount;
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external payable override returns (uint256 amountOut) {
        amountOut = 10;
    }
}
