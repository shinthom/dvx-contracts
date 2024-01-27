// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IAdapter} from "../interfaces/IAdapter.sol";
import {IExchange} from "../interfaces/IExchange.sol";
import {IQuoterV2} from "@uniswap/v3-periphery/contracts/interfaces/IQuoterV2.sol";

contract Quoter {
    uint256 public constant PRICE_DECIMAL = 2;

    address private constant _weth = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    address private constant _swapQuoter =
        0x61fFE014bA17989E743c5F6cB21bF9697530B21e; // uniswap V3

    struct Request {
        address collateral;
        address index;
        uint256 collateralAmount;
        uint256 size;
        bool isLong;
    }

    struct Answer {
        address adapter;
        uint256 collateralPrice;
        uint256 indexPrice;
        uint256 fee;
        uint256 availableLiquidity;
        IExchange.MarketOrder marketOrder;
        uint256 adapterExecutionFee;
    }

    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (uint256) {
        if (tokenIn == address(0)) {
            tokenIn = _weth;
        }
        if (tokenOut == address(0)) {
            tokenOut = _weth;
        }

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

    function quoteExactOutputSingle(
        address tokenIn,
        address tokenOut,
        uint256 amountOut
    ) external returns (uint256) {
        if (tokenIn == address(0)) {
            tokenIn = _weth;
        }
        if (tokenOut == address(0)) {
            tokenOut = _weth;
        }

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

    function quote(
        address account,
        address[] memory adapters,
        Request memory request
    ) public view returns (Answer[] memory answers) {
        uint256[] memory fees = new uint256[](adapters.length);
        for (uint256 i = 0; i < adapters.length; i++) {
            fees[i] = getFee(account, adapters[i], request);
        }

        // sort by fee
        if (adapters.length > 1) {
            for (uint256 i = 0; i < adapters.length; i++) {
                for (uint256 j = i + 1; j < adapters.length; j++) {
                    if (fees[i] > fees[j]) {
                        address temp0 = adapters[i];
                        adapters[i] = adapters[j];
                        adapters[j] = temp0;
                    }
                }
            }
        }

        // todo: split answers following available liquditiy.
        answers = new Answer[](1);
        answers[0] = _get(account, adapters[0], request);
    }

    function _get(
        address account,
        address adapter,
        Request memory request
    ) private view returns (Answer memory answer) {
        answer.adapter = adapter;
        answer.collateralPrice = getPrice(
            adapter,
            request.collateral,
            request.isLong
        );
        answer.indexPrice = getPrice(adapter, request.index, request.isLong);
        answer.fee = getFee(account, adapter, request);
        answer.availableLiquidity = getAvailableLiquidity(
            adapter,
            request.index,
            request.isLong
        );
        answer.marketOrder = makeMarketOrder(adapter, request);
        answer.adapterExecutionFee = getMinExecutionFee(adapter);
    }

    function makeMarketOrder(
        address adapter,
        Request memory request
    ) public view returns (IExchange.MarketOrder memory) {
        IExchange.MarketOrder memory marketOrder = IAdapter(adapter)
            .makeMarketOrder(
                request.collateral,
                request.index,
                request.collateralAmount,
                request.size,
                request.isLong
            );

        return marketOrder;
    }

    function getPosition(
        address account,
        address adapter,
        Request memory request
    ) public view returns (IAdapter.Position memory) {
        IExchange.MarketOrder memory marketOrder = makeMarketOrder(
            adapter,
            request
        );

        return
            IAdapter(adapter).getPosition(
                account,
                marketOrder.collateral,
                marketOrder.index,
                marketOrder.isLong
            );
    }

    function getFee(
        address account,
        address adapter,
        Request memory request
    ) public view returns (uint256 fee) {
        IExchange.MarketOrder memory marketOrder = IAdapter(adapter)
            .makeMarketOrder(
                request.collateral,
                request.index,
                request.collateralAmount,
                request.size,
                request.isLong
            );
        IAdapter.Position memory currentPosition = IAdapter(adapter)
            .getPosition(
                account,
                marketOrder.collateral,
                marketOrder.index,
                marketOrder.isLong
            );

        fee = IAdapter(adapter).getPositionFee(request.index, marketOrder.size);

        // note: funding and deposit fees are not considered when routing.
        // if (currentPosition.size > 0) {
        //     fee += IAdapter(adapter).getFundingFee(
        //         marketOrder.path[marketOrder.path.length - 1],
        //         request.index,
        //         currentPosition.size,
        //         currentPosition.fundingRate,
        //         request.isLong
        //     );
        //     fee += IAdapter(adapter).getDepositFee(account, marketOrder);
        // }

        uint256 priceDecimals = IAdapter(adapter).getPriceDecimals();
        if (priceDecimals > PRICE_DECIMAL) {
            fee = fee / (10 ** (priceDecimals - PRICE_DECIMAL));
        } else {
            fee = fee * (10 ** (PRICE_DECIMAL - priceDecimals));
        }
    }

    function getPrice(
        address adapter,
        address token,
        bool isLong
    ) public view returns (uint256 price) {
        price = IAdapter(adapter).getPrice(token, isLong);

        uint256 priceDecimals = IAdapter(adapter).getPriceDecimals();
        if (priceDecimals > PRICE_DECIMAL) {
            price = price / (10 ** (priceDecimals - PRICE_DECIMAL));
        } else {
            price = price * (10 ** (PRICE_DECIMAL - priceDecimals));
        }
    }

    function getAvailableLiquidity(
        address adapter,
        address index,
        bool isLong
    ) public view returns (uint256) {
        return IAdapter(adapter).getAvailableLiquidity(index, isLong);
    }

    function getMinExecutionFee(address adapter) public view returns (uint256) {
        return IAdapter(adapter).getMinExecutionFee();
    }
}
