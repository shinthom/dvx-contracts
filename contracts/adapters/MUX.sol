// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {IChainlink} from "../interfaces/exchanges/MUX/IChainlink.sol";
import {ILiquidityPool} from "../interfaces/exchanges/MUX/ILiquidityPool.sol";
import {IOrderBook} from "../interfaces/exchanges/MUX/IOrderBook.sol";
import {IERC20} from "../interfaces/tokens/IERC20.sol";
import {IAdapter} from "../interfaces/IAdapter.sol";
import {IExchange} from "../interfaces/IExchange.sol";
import "hardhat/console.sol";

contract MUX is IAdapter {
    address private constant weth = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    uint8 private constant _defaultProfitTokenId = 0; // USDC.e

    uint256 public constant PRICE_DECIMALS = 18;
    uint256 public constant USD = 1 * (10 ** PRICE_DECIMALS);

    address private immutable ORDER_BOOK;
    address private immutable LIQUIDITY_POOL;

    receive() external payable {}

    constructor(address orderBook, address liquidityPool) {
        ORDER_BOOK = orderBook;
        LIQUIDITY_POOL = liquidityPool;
    }

    function getMinExecutionFee() public pure override returns (uint256) {
        return 0;
    }

    function getPriceDecimals() public pure override returns (uint256) {
        return PRICE_DECIMALS;
    }

    function getPrice(
        address token,
        bool /* isLong */
    ) public view override returns (uint256) {
        uint8 tokenId = _getIdFromTokenAddress(token);
        ILiquidityPool.Asset memory asset = ILiquidityPool(LIQUIDITY_POOL)
            .getAssetInfo(tokenId);
        return _getPrice(asset.referenceOracle);
    }

    function getDepositFee(
        address /* account */,
        IExchange.PositionOrder memory /* positionOrder */
    ) public pure override returns (uint256) {
        return 0;
    }

    function getPositionFee(
        address index,
        uint256 size
    ) public view override returns (uint256) {
        uint8 indexId = _getIdFromTokenAddress(index);
        ILiquidityPool.Asset memory asset = ILiquidityPool(LIQUIDITY_POOL)
            .getAssetInfo(indexId);

        uint256 price = _getPrice(asset.referenceOracle);
        uint256 decimals = IERC20(index).decimals();
        return
            ((price * asset.positionFeeRate) * size) / 1e5 / (10 ** decimals);
    }

    function getFundingFee(
        address /* collateral */,
        address index,
        uint256 size,
        uint256 fundingRate,
        bool isLong
    ) public view override returns (uint256) {
        if (size == 0) {
            return 0;
        }

        uint8 indexId = _getIdFromTokenAddress(index);
        ILiquidityPool.Asset memory asset = ILiquidityPool(LIQUIDITY_POOL)
            .getAssetInfo(indexId);

        int256 price = IChainlink(asset.referenceOracle).latestAnswer();
        price *= 1e10; // decimals 8 => 18

        uint256 cumulativeFunding;
        if (isLong) {
            cumulativeFunding = asset.longCumulativeFundingRate - fundingRate;
            cumulativeFunding = (cumulativeFunding * uint256(price)) / 1e18;
        } else {
            cumulativeFunding = asset.shortCumulativeFunding - fundingRate;
        }
        return (cumulativeFunding * size) / 1e18;
    }

    function getAvailableLiquidity(
        address index,
        bool isLong
    ) public view override returns (uint256) {
        uint8 indexId = _getIdFromTokenAddress(index);
        ILiquidityPool.Asset memory asset = ILiquidityPool(LIQUIDITY_POOL)
            .getAssetInfo(indexId);

        uint256 availableLiquidity;
        if (isLong) {
            // note: asset.maxLongPositionSize?
            availableLiquidity = asset.spotLiquidity - asset.totalLongPosition;
        } else {
            availableLiquidity =
                asset.maxShortPositionSize -
                asset.totalShortPosition;
        }

        uint8 indexDecimals = IERC20(index).decimals();
        return availableLiquidity / (10 ** (PRICE_DECIMALS - indexDecimals));
    }

    function getPosition(
        address account,
        address collateral,
        address index,
        bool isLong
    ) public view override returns (IAdapter.Position memory) {
        bytes32 subAccountId = _getSubAccountId(
            account,
            collateral,
            index,
            isLong
        );
        (
            uint256 collateralAmount,
            uint256 size,
            uint256 lastIncreasedTime,
            uint256 price,
            uint256 fundingRate
        ) = ILiquidityPool(LIQUIDITY_POOL).getSubAccount(subAccountId);

        return
            IAdapter.Position(
                collateralAmount,
                size,
                lastIncreasedTime,
                price,
                fundingRate,
                isLong
            );
    }

    function getWrapPosition(
        address account,
        address collateral,
        address index,
        bool isLong
    ) public view override returns (IAdapter.Position memory) {
        bytes32 subAccountId = _getSubAccountId(
            account,
            collateral,
            index,
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
        collateralAmount =
            collateralAmount /
            (10 ** (PRICE_DECIMALS - collateralDecimals));

        return
            IAdapter.Position(
                collateralAmount,
                size,
                lastIncreasedTime,
                price,
                fundingRate,
                isLong
            );
    }

    function makePositionOrder(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) public pure override returns (IExchange.PositionOrder memory) {
        address[] memory path = new address[](1);
        path[0] = collateral;

        return
            IExchange.PositionOrder({
                orderType: IExchange.OrderType.IncreasePosition,
                path: path,
                index: index,
                collateralAmount: collateralAmount,
                size: size,
                isLong: isLong
            });
    }

    function increasePosition(
        address[] memory path,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) public payable override {
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
    ) public payable override {
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
            0, // collateralAmount
            uint96(size),
            0, // price
            _defaultProfitTokenId,
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
    ) public payable override {
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

        if (collateral == weth) {
            IOrderBook(ORDER_BOOK).depositCollateral{value: collateralAmount}(
                subAccountId,
                collateralAmount
            );
        } else {
            IERC20(collateral).approve(ORDER_BOOK, collateralAmount);
            IOrderBook(ORDER_BOOK).depositCollateral(
                subAccountId,
                collateralAmount
            );
        }
    }

    function decreaseCollateral(
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong
    ) public payable override {
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
            _defaultProfitTokenId,
            false // isProfit
        );
    }

    function _getPrice(address referenceOracle) private view returns (uint256) {
        int256 price = IChainlink(referenceOracle).latestAnswer();
        price *= 1e10; // decimals 8 => 18
        return uint256(price);
    }

    function _getSubAccountId(
        address account,
        address collateral,
        address index,
        bool isLong
    ) private view returns (bytes32) {
        uint8 collateralId = _getIdFromTokenAddress(collateral);
        uint8 indexId = _getIdFromTokenAddress(index);

        return _assembleSubAccountId(account, collateralId, indexId, isLong);
    }

    function _getIdFromTokenAddress(
        address tokenAddress
    ) private view returns (uint8) {
        ILiquidityPool.Asset[] memory assets = ILiquidityPool(LIQUIDITY_POOL)
            .getAllAssetInfo();
        for (uint256 i = 0; i < assets.length; i++) {
            if (assets[i].tokenAddress == tokenAddress) {
                return assets[i].id;
            }
        }
        revert("NOT_FOUND");
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
