// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {Exchange} from "../Exchange.sol";

contract ExchangeMock is Exchange {
    constructor(address _logger) {
        logger = _logger;
    }

    function swap(
        address account,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) public override returns (uint256 amountOut, uint256 swapFee) {
        super.swap(msg.sender, tokenIn, tokenOut, amountIn);
        return (100, 0);
    }

    function setSwapper(address _swapper) public override {
        swapper = _swapper;
    }
}
