// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { ILiquidityPool } from "../interfaces/exchanges/MUX/ILiquidityPool.sol";
import { IOrderBook } from "../interfaces/exchanges/MUX/IOrderBook.sol";
import { IERC20 } from "../interfaces/tokens/IERC20.sol";
import { IAdapter } from "../interfaces/IAdapter.sol";
import { IExchange } from "../interfaces/IExchange.sol";

contract MUX is IAdapter {
    address constant private WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    address constant private USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;

    uint256 constant public PRICE_DECIMALS = 18;
    uint256 constant public USD = 1 * (10 ** PRICE_DECIMALS);

    address immutable private ORDER_BOOK;
    address immutable private LIQUIDITY_POOL;

    receive() external payable {}

    constructor(address orderBook, address liquidityPool) {
        ORDER_BOOK = orderBook;
        LIQUIDITY_POOL = liquidityPool;
    }

    function getPriceDecimals() override public pure returns (uint256) {
        return PRICE_DECIMALS;
    }

    function getPosition(
        address account,
        address collateral,
        address index,
        bool isLong
    ) override public view returns (IAdapter.Position memory) {
        uint8 collateralId = _getIdFromTokenAddress(collateral);
        uint8 indexId = _getIdFromTokenAddress(index);

        bytes32 subAccountId = _assembleSubAccountId(
            account,
            collateralId,
            indexId,
            isLong
        );
        (
            uint256 collateralAmount,
            uint256 size,
            uint256 lastIncreasedTime,
            uint256 price,
            uint256 fundingRate
        ) = ILiquidityPool(LIQUIDITY_POOL).getSubAccount(subAccountId);

        uint8 collateralDecimals = IERC20(collateral).decimals();
        collateralAmount = collateralAmount / (10 ** (PRICE_DECIMALS - collateralDecimals));

        return IAdapter.Position(
            collateralAmount,
            size,
            lastIncreasedTime,
            price,
            fundingRate,
            isLong
        );
    }

    function getPrice(
        address /* collateral */,
        uint256 price,
        bool /* isLong */
    ) override public pure returns (uint256) {
        return price;
    }

    function getDepositFee(
        address /* account */,
        IExchange.PositionOrder memory /* positionOrder */
    ) override public pure returns (uint256) {
        return 0;
    }

    function getPositionFee(
        address index,
        uint256 indexPrice,
        uint256 size
    ) override public view returns (uint256) {
        uint8 indexId = _getIdFromTokenAddress(index);
        uint32 positionFeeRate
            = (ILiquidityPool(LIQUIDITY_POOL).getAssetInfo(indexId)).positionFeeRate;

        uint256 decimals = IERC20(index).decimals();
        return ((indexPrice * positionFeeRate) * size) / 1e5 / (10 ** decimals);
    }

    function getFundingFee(
        address /* collateral */,
        address index,
        uint256 size,
        uint256 fundingRate,
        bool isLong,
        uint256 indexPrice
    ) override public view returns (uint256) {
        uint8 indexId = _getIdFromTokenAddress(index);
        ILiquidityPool.Asset memory asset = ILiquidityPool(LIQUIDITY_POOL).getAssetInfo(indexId);

        uint256 cumulativeFunding;
        if (isLong) {
            cumulativeFunding = asset.longCumulativeFundingRate - fundingRate;
            cumulativeFunding = cumulativeFunding * indexPrice;
        } else {
            cumulativeFunding = asset.shortCumulativeFunding - fundingRate;
        }

        return cumulativeFunding * size;
    }

    function getAvailableLiquidity(
        address index,
        bool isLong
    ) override public view returns (uint256) {
        uint8 indexId = _getIdFromTokenAddress(index);
        ILiquidityPool.Asset memory asset = ILiquidityPool(LIQUIDITY_POOL).getAssetInfo(indexId);

        uint256 availableLiquidity;
        if (isLong) {
            // note: asset.maxLongPositionSize?
            availableLiquidity = asset.spotLiquidity - asset.totalLongPosition;
        } else {
            availableLiquidity = asset.maxShortPositionSize - asset.totalShortPosition;
        }

        uint8 indexDecimals = IERC20(index).decimals();
        return availableLiquidity / (10 ** (PRICE_DECIMALS - indexDecimals));
    }

    function makePositionOrder(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 leverage,
        bool isLong,
        uint256 collateralPrice,
        uint256 indexPrice
    ) override public view returns (IExchange.PositionOrder memory) {
        require(
            collateralPrice != 0 && indexPrice != 0,
            "EMPTY_PRICE"
        );

        uint8 collateralDecimals = IERC20(collateral).decimals();
        uint8 indexDecimals = IERC20(index).decimals();

        uint256 collateralAmountUsd = collateralAmount * collateralPrice / (10 ** collateralDecimals);
        uint256 sizeUsd = collateralAmountUsd * leverage;

        address[] memory path = new address[](1);
        path[0] = collateral;

        return IExchange.PositionOrder({
            orderType: IExchange.OrderType.IncreasePosition,
            path: path,
            index: index,
            collateralAmount: collateralAmount,
            size: sizeUsd * (10 ** indexDecimals) / indexPrice,
            isLong: isLong
        });
    }

    function _getIdFromTokenAddress(address tokenAddress) private view returns (uint8) {
        ILiquidityPool.Asset[] memory assets = ILiquidityPool(LIQUIDITY_POOL).getAllAssetInfo();
        for (uint256 i = 0; i < assets.length; i++) {
            if (assets[i].tokenAddress == tokenAddress) {
                return assets[i].id;
            }
        }
        revert("NOT_FOUND");
    }

    function increasePosition(
        address[] memory path,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) override public payable {
        require(path.length == 1, "INVALID_PATH");
        address collateral = path[0];

        uint8 collateralId = _getIdFromTokenAddress(collateral);
        uint8 indexId = _getIdFromTokenAddress(index);

        bytes32 subAccountId = _assembleSubAccountId(
            address(this),
            collateralId,
            indexId,
            isLong
        );

        // ETH
        if (collateralId == 3) {
            IOrderBook(ORDER_BOOK).placePositionOrder3{value: collateralAmount}(
                subAccountId,
                uint96(collateralAmount),
                uint96(size),
                0, // price
                0, // profitTokenId
                192, // flags
                0,
                0x0,
                IOrderBook.PositionOrderExtra(0, 0, 0, 0)
            );
        } else {
            IERC20(collateral).approve(ORDER_BOOK, collateralAmount);
            IOrderBook(ORDER_BOOK).placePositionOrder3(
                subAccountId,
                uint96(collateralAmount),
                uint96(size),
                0, // price
                0, // profitTokenId
                192, // flags
                0,
                0x0,
                IOrderBook.PositionOrderExtra(0, 0, 0, 0)
            );
        }
    }

    function decreasePosition(
        address collateral,
        address index,
        uint256 size,
        bool isLong
    ) override public payable {
        uint8 collateralId = _getIdFromTokenAddress(collateral);
        uint8 indexId = _getIdFromTokenAddress(index);

        bytes32 subAccountId = _assembleSubAccountId(
            address(this),
            collateralId,
            indexId,
            isLong
        );

        IOrderBook(ORDER_BOOK).placePositionOrder3(
            subAccountId,
            0, // collateral
            uint96(size),
            0, // price
            0, // profitTokenId
            96, // flags
            0,
            0x0,
            IOrderBook.PositionOrderExtra(0, 0, 0, 0)
        );
    }

    function increaseCollateral(
        address[] memory path,
        address index,
        uint256 collateralAmount,
        bool isLong
    ) override public payable {
        require(path.length == 1, "INVALID_PATH");
        address collateral = path[0];

        uint8 collateralId = _getIdFromTokenAddress(collateral);
        uint8 indexId = _getIdFromTokenAddress(index);

        bytes32 subAccountId = _assembleSubAccountId(
            address(this),
            collateralId,
            indexId,
            isLong
        );

        if (collateral == WETH) {
            IOrderBook(ORDER_BOOK).depositCollateral{value: collateralAmount}(subAccountId, collateralAmount);
        } else {
            IERC20(collateral).approve(ORDER_BOOK, collateralAmount);
            IOrderBook(ORDER_BOOK).depositCollateral(subAccountId, collateralAmount);
        }
    }

    function decreaseCollateral(
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong
    ) override public payable {
        uint8 collateralId = _getIdFromTokenAddress(collateral);
        uint8 indexId = _getIdFromTokenAddress(index);

        bytes32 subAccountId = _assembleSubAccountId(
            address(this),
            collateralId,
            indexId,
            isLong
        );

        IOrderBook(ORDER_BOOK).placeWithdrawalOrder(
            subAccountId,
            uint96(collateralAmount),
            0, // profitTokenId
            // TODO: check logic in mux protocol
            false // isProfit
        );
    }

    function _assembleSubAccountId(
        address account,
        uint8 collateralId,
        uint8 assetId,
        bool isLong
    ) private pure returns (bytes32 subAccountId) {
        subAccountId = bytes32(uint256(uint160(account)) << 96);
        subAccountId |= bytes32(uint256(collateralId) << 88);
        subAccountId |= bytes32(uint256(assetId) << 80);
        subAccountId |= bytes32(uint256(isLong ? 1 : 0) << 72);
    }
}
