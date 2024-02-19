// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IAdapter} from "../interfaces/IAdapter.sol";
import {IExchange} from "../interfaces/IExchange.sol";
import {IWETH} from "../interfaces/IWETH.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface ILiquidityPool {
    enum ReferenceOracleType {
        None,
        Chainlink
    }

    struct Asset {
        // slot
        // assets with the same symbol in different chains are the same asset. they shares the same muxToken. so debts of the same symbol
        // can be accumulated across chains (see Reader.AssetState.deduct). ex: ERC20(fBNB).symbol should be "BNB", so that BNBs of
        // different chains are the same.
        // since muxToken of all stable coins is the same and is calculated separately (see Reader.ChainState.stableDeduct), stable coin
        // symbol can be different (ex: "USDT", "USDT.e" and "fUSDT").
        bytes32 symbol;
        // slot
        address tokenAddress; // erc20.address
        uint8 id;
        uint8 decimals; // erc20.decimals
        uint56 flags; // a bitset of ASSET_*
        uint24 _flagsPadding;
        // slot
        uint32 initialMarginRate; // 1e5
        uint32 maintenanceMarginRate; // 1e5
        uint32 minProfitRate; // 1e5
        uint32 minProfitTime; // 1e0
        uint32 positionFeeRate; // 1e5
        // note: 96 bits remaining
        // slot
        address referenceOracle;
        uint32 referenceDeviation; // 1e5
        uint8 referenceOracleType;
        uint32 halfSpread; // 1e5
        // note: 24 bits remaining
        // slot
        uint96 credit;
        uint128 _reserved2;
        // slot
        uint96 collectedFee;
        uint32 liquidationFeeRate; // 1e5
        uint96 spotLiquidity;
        // note: 32 bits remaining
        // slot
        uint96 maxLongPositionSize;
        uint96 totalLongPosition;
        // note: 64 bits remaining
        // slot
        uint96 averageLongPrice;
        uint96 maxShortPositionSize;
        // note: 64 bits remaining
        // slot
        uint96 totalShortPosition;
        uint96 averageShortPrice;
        // note: 64 bits remaining
        // slot, less used
        address muxTokenAddress; // muxToken.address. all stable coins share the same muxTokenAddress
        uint32 spotWeight; // 1e0
        uint32 longFundingBaseRate8H; // 1e5
        uint32 longFundingLimitRate8H; // 1e5
        // slot
        uint128 longCumulativeFundingRate; // Σ_t fundingRate_t
        uint128 shortCumulativeFunding; // Σ_t fundingRate_t * indexPrice_t
    }

    function getAllAssetInfo() external view returns (Asset[] memory);

    function getAssetInfo(uint8 assetId) external view returns (Asset memory);

    function getSubAccount(
        bytes32 subAccountId
    )
        external
        view
        returns (
            uint96 collateral,
            uint96 size,
            uint32 lastIncreasedTime,
            uint96 price,
            uint128 entryFunding
        );

    function setReferenceOracle(
        uint8 assetId,
        ReferenceOracleType referenceOracleType,
        address referenceOracle,
        uint32 referenceDeviation // 1e5
    ) external;
}

interface IOrderBook {
    struct PositionOrderExtra {
        uint96 tpPrice;
        uint96 slPrice;
        uint8 tpslProfitTokenId;
        uint32 tpslDeadline;
    }

    function placePositionOrder3(
        bytes32 subAccountId,
        uint96 collateralAmount, // erc20.decimals
        uint96 size, // 1e18
        uint96 price, // 1e18
        uint8 profitTokenId,
        uint8 flags,
        uint32 deadline, // 1e0
        bytes32 referralCode,
        PositionOrderExtra memory extra
    ) external payable;

    function placeWithdrawalOrder(
        bytes32 subAccountId,
        uint96 rawAmount, // erc20.decimals
        uint8 profitTokenId,
        bool isProfit
    ) external;

    function depositCollateral(
        bytes32 subAccountId,
        uint256 rawAmount // NOTE: OrderBook SHOULD transfer rawAmount collateral to LiquidityPool
    ) external payable;

    function updateFundingState(
        uint32 stableUtilization, // 1e5
        uint8[] calldata unstableTokenIds,
        uint32[] calldata unstableUtilizations, // 1e5
        uint96[] calldata unstablePrices
    ) external;

    // test
    function nextOrderId() external view returns (uint256);

    // test
    function fillPositionOrder(
        uint64 orderId,
        uint96 collateralPrice,
        uint96 assetPrice,
        uint96 profitAssetPrice // only used when !isLong
    ) external;

    // test
    function fillWithdrawalOrder(
        uint64 orderId,
        uint96 collateralPrice,
        uint96 assetPrice,
        uint96 profitAssetPrice // only used when !isLong
    ) external;
}

interface IChainlink {
    function latestAnswer() external view returns (int256);
}

contract MuxAdapter is IAdapter {
    uint256 public constant TOKEN_DEFAULT_DECIMALS = 18;

    uint256 public constant PRICE_DECIMALS = 18;
    uint256 public constant USD = 1 * (10 ** PRICE_DECIMALS);

    uint8 private constant _wethTokenId = 3;

    address private immutable _liquidityPool;
    address private immutable _orderBook;
    address private immutable _exchange;

    constructor(address orderBook, address liquidityPool, address exchange) {
        require(orderBook != address(0), "orderBook: zero address");
        require(liquidityPool != address(0), "liquidityPool: zero address");

        _orderBook = orderBook;
        _liquidityPool = liquidityPool;
        _exchange = exchange;
    }

    function increasePosition(
        uint256 marketOrderId,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        uint256 acceptablePrice,
        bool isLong
    ) external payable override {
        uint8 collateralId = _getIdFromTokenAddress(collateral);
        uint8 indexId = _getIdFromTokenAddress(index);
        bytes32 subAccountId = _assembleSubAccountId(
            address(this),
            collateralId,
            indexId,
            isLong
        );

        if (collateralId == _wethTokenId) {
            IWETH(collateral).withdraw(collateralAmount);

            // slither-disable-next-line arbitrary-send-eth
            IOrderBook(_orderBook).placePositionOrder3{value: collateralAmount}(
                subAccountId,
                uint96(collateralAmount),
                uint96(_adjustSizeDecimal(index, size)), // stack too deep
                0,
                0,
                192,
                0,
                0x0,
                IOrderBook.PositionOrderExtra(0, 0, 0, 0)
            );
        } else {
            IERC20(collateral).approve(_orderBook, collateralAmount);

            IOrderBook(_orderBook).placePositionOrder3(
                subAccountId,
                uint96(collateralAmount),
                uint96(_adjustSizeDecimal(index, size)), // stack too deep
                0,
                0,
                192,
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
        bool isLong,
        uint256 acceptablePrice
    ) external payable override {
        uint8 collateralId = _getIdFromTokenAddress(collateral);
        uint8 indexId = _getIdFromTokenAddress(index);

        bytes32 subAccountId = _assembleSubAccountId(
            address(this),
            collateralId,
            indexId,
            isLong
        );

        // https://github.com/mux-world/mux-protocol/blob/e93946a555a59fcd9532517c88fff980d382a279/contracts/orderbook/OrderBook.sol#L137
        uint256 adjustedSize = _adjustSizeDecimal(index, size);

        address defaultStableToken = IExchange(_exchange).defaultStableToken();
        uint8 profitTokenId = _getIdFromTokenAddress(defaultStableToken);

        IOrderBook(_orderBook).placePositionOrder3(
            subAccountId,
            0,
            uint96(adjustedSize),
            0,
            profitTokenId,
            96,
            0,
            0x0,
            IOrderBook.PositionOrderExtra(0, 0, 0, 0)
        );
    }

    function increaseCollateral(
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong
    ) external payable override {
        uint8 collateralId = _getIdFromTokenAddress(collateral);
        uint8 indexId = _getIdFromTokenAddress(index);

        bytes32 subAccountId = _assembleSubAccountId(
            address(this),
            collateralId,
            indexId,
            isLong
        );

        if (collateralId == _wethTokenId) {
            IWETH(collateral).withdraw(collateralAmount);

            // slither-disable-next-line arbitrary-send-eth
            IOrderBook(_orderBook).depositCollateral{value: collateralAmount}(
                subAccountId,
                collateralAmount
            );
        } else {
            // slither-disable-next-line unused-return
            IERC20(collateral).approve(_orderBook, collateralAmount);
            IOrderBook(_orderBook).depositCollateral(
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
    ) external payable override {
        uint8 collateralId = _getIdFromTokenAddress(collateral);
        uint8 indexId = _getIdFromTokenAddress(index);

        bytes32 subAccountId = _assembleSubAccountId(
            address(this),
            collateralId,
            indexId,
            isLong
        );

        address defaultStableToken = IExchange(_exchange).defaultStableToken();
        uint8 profitTokenId = _getIdFromTokenAddress(defaultStableToken);

        IOrderBook(_orderBook).placeWithdrawalOrder(
            subAccountId,
            uint96(collateralAmount),
            profitTokenId,
            false // isProfit
        );
    }

    function addAcmmMargin(
        address collateral,
        address index,
        bool isLong,
        uint256 marginAmount
    ) external payable override {
        uint8 collateralId = _getIdFromTokenAddress(collateral);
        uint8 indexId = _getIdFromTokenAddress(index);

        bytes32 subAccountId = _assembleSubAccountId(
            address(this),
            collateralId,
            indexId,
            isLong
        );

        if (collateralId == _wethTokenId) {
            IWETH(collateral).withdraw(marginAmount);

            // slither-disable-next-line arbitrary-send-eth
            IOrderBook(_orderBook).depositCollateral{value: marginAmount}(
                subAccountId,
                marginAmount
            );
        } else {
            // slither-disable-next-line unused-return
            IERC20(collateral).approve(_orderBook, marginAmount);
            IOrderBook(_orderBook).depositCollateral(
                subAccountId,
                marginAmount
            );
        }
    }

    function subAcmmMargin(
        address collateral,
        address index,
        bool isLong,
        uint256 profitAmount
    ) external payable override {
        uint8 collateralId = _getIdFromTokenAddress(collateral);
        uint8 indexId = _getIdFromTokenAddress(index);

        bytes32 subAccountId = _assembleSubAccountId(
            address(this),
            collateralId,
            indexId,
            isLong
        );

        address defaultStableToken = IExchange(_exchange).defaultStableToken();
        uint8 profitTokenId = _getIdFromTokenAddress(defaultStableToken);

        IOrderBook(_orderBook).placeWithdrawalOrder(
            subAccountId,
            uint96(profitAmount),
            profitTokenId,
            true // isProfit
        );
    }

    function makeMarketOrder(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) public pure override returns (IExchange.MarketOrder memory) {
        return
            IExchange.MarketOrder({
                collateral: collateral,
                index: index,
                collateralAmount: collateralAmount,
                size: size,
                isLong: isLong
            });
    }

    function getPosition(
        address account,
        address collateral,
        address index,
        bool isLong
    ) public view override returns (Position memory) {
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
        ) = ILiquidityPool(_liquidityPool).getSubAccount(subAccountId);

        return
            Position(
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
        ) = ILiquidityPool(_liquidityPool).getSubAccount(subAccountId);

        uint8 collateralDecimals = IERC20Metadata(collateral).decimals();
        collateralAmount =
            collateralAmount /
            (10 ** (TOKEN_DEFAULT_DECIMALS - collateralDecimals));

        uint8 indexDecimals = IERC20Metadata(index).decimals();
        size = size / (10 ** (TOKEN_DEFAULT_DECIMALS - indexDecimals));

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

    function getPositionNetValueUsd(
        address account,
        address collateral,
        address index,
        bool isLong
    ) public view override returns (address, uint256, address, uint256) {
        IAdapter.Position memory position = getPosition(
            account,
            collateral,
            index,
            isLong
        );

        (uint256 positionFeeUsd, uint256 fundingFeeUsd) = getCloseFee(
            account,
            collateral,
            index,
            isLong
        );
        (bool hasProfit, uint256 pnlUsd) = getPositionPnlUsd(
            account,
            collateral,
            index,
            isLong
        );

        uint256 collateralAmountUsd = (position.collateralAmount *
            getPrice(collateral, isLong)) / 1e18;
        address profitToken = getProfitToken(collateral, index, isLong);

        uint256 totalFee = positionFeeUsd + fundingFeeUsd;
        if (hasProfit) {
            if (pnlUsd >= totalFee) {
                pnlUsd -= totalFee;
            } else {
                uint256 feeAfterPnl = totalFee - pnlUsd;
                pnlUsd = 0;

                if (collateralAmountUsd >= feeAfterPnl) {
                    collateralAmountUsd -= feeAfterPnl;
                } else {
                    collateralAmountUsd = 0;
                }
            }

            return (collateral, collateralAmountUsd, profitToken, pnlUsd);
        } else {
            if (collateralAmountUsd >= totalFee) {
                collateralAmountUsd -= totalFee;
            } else {
                collateralAmountUsd = 0;
            }

            if (collateralAmountUsd >= pnlUsd) {
                collateralAmountUsd -= pnlUsd;
            } else {
                collateralAmountUsd = 0;
            }

            return (collateral, collateralAmountUsd, profitToken, 0);
        }
    }

    function getPositionWrapNetValueUsd(
        address account,
        address collateral,
        address index,
        bool isLong
    ) external view override returns (address, uint256, address, uint256) {
        return getPositionNetValueUsd(account, collateral, index, isLong);
    }

    function getPositionNetValueToken(
        address account,
        address collateral,
        address index,
        bool isLong
    ) external view override returns (address, uint256, address, uint256) {
        (
            ,
            uint256 collateralAmountUsd,
            address profitToken,
            uint256 pnlUsd
        ) = getPositionNetValueUsd(account, collateral, index, isLong);

        uint8 collateralDecimals = IERC20Metadata(collateral).decimals();
        uint8 profitDecimals = IERC20Metadata(profitToken).decimals();

        uint256 collateralPrice = getPrice(collateral, isLong);
        uint256 profitTokenPrice = getPrice(profitToken, isLong);

        uint256 collateralAmount = (collateralAmountUsd *
            (10 ** collateralDecimals)) / collateralPrice;
        uint256 profitAmount = (pnlUsd * (10 ** profitDecimals)) /
            profitTokenPrice;

        return (collateral, collateralAmount, profitToken, profitAmount);
    }

    function getProfitToken(
        address collateral,
        address index,
        bool isLong
    ) public view override returns (address) {
        if (isLong) {
            return index;
        } else {
            return IExchange(_exchange).defaultStableToken();
        }
    }

    function getPositionPnlUsd(
        address account,
        address collateral,
        address index,
        bool isLong
    ) public view override returns (bool hasProfit, uint256 pnlUsd) {
        Position memory position = getPosition(
            account,
            collateral,
            index,
            isLong
        );
        if (position.size == 0) {
            return (false, 0);
        }

        uint256 markPrice = getPrice(index, isLong);
        hasProfit = isLong
            ? markPrice > position.price
            : markPrice < position.price;
        uint256 priceDelta = markPrice >= position.price
            ? markPrice - position.price
            : position.price - markPrice;

        pnlUsd = (priceDelta * position.size) / (10 ** PRICE_DECIMALS);
    }

    function getWrapPositionPnlUsd(
        address account,
        address collateral,
        address index,
        bool isLong
    ) public view override returns (bool hasProfit, uint256 pnlUsd) {
        return getPositionPnlUsd(account, collateral, index, isLong);
    }

    function getMinExecutionFee() external pure override returns (uint256) {
        return 0;
    }

    function getPositionFee(
        address index,
        uint256 size
    ) public view override returns (uint256) {
        uint8 indexId = _getIdFromTokenAddress(index);
        ILiquidityPool.Asset memory asset = ILiquidityPool(_liquidityPool)
            .getAssetInfo(indexId);

        uint256 price = _getPrice(asset.referenceOracle);
        uint256 decimals = IERC20Metadata(index).decimals();

        return ((price * asset.positionFeeRate) * size) / 1e5 / 1e18;
    }

    function getDepositFee(
        address /* account */,
        IExchange.MarketOrder memory /* positionOrder */
    ) external pure override returns (uint256) {
        return 0;
    }

    function getFundingFee(
        address account,
        address collateral,
        address index,
        bool isLong
    ) public view override returns (uint256) {
        IAdapter.Position memory position = getPosition(
            account,
            collateral,
            index,
            isLong
        );
        if (position.size == 0) {
            return 0;
        }

        uint8 indexId = _getIdFromTokenAddress(index);
        ILiquidityPool.Asset memory asset
            = ILiquidityPool(_liquidityPool).getAssetInfo(indexId); // prettier-ignore

        int256 price = IChainlink(asset.referenceOracle).latestAnswer();
        price *= 1e10; // decimals 8 => 18

        uint256 cumulativeFunding;
        if (isLong) {
            cumulativeFunding =
                asset.longCumulativeFundingRate -
                position.fundingRate;
            cumulativeFunding = (cumulativeFunding * uint256(price)) / 1e18;
        } else {
            cumulativeFunding =
                asset.shortCumulativeFunding -
                position.fundingRate;
        }
        return (cumulativeFunding * position.size) / 1e18;
    }

    function getCloseFee(
        address account,
        address collateral,
        address index,
        bool isLong
    ) public view override returns (uint256, uint256) {
        IAdapter.Position memory position = getPosition(
            account,
            collateral,
            index,
            isLong
        );
        if (position.size == 0) {
            return (0, 0);
        }

        uint256 positionFee = getPositionFee(index, position.size);
        uint256 fundingFee = getFundingFee(account, collateral, index, isLong);

        return (positionFee, fundingFee);
    }

    function getPriceDecimals() external pure override returns (uint256) {
        return PRICE_DECIMALS;
    }

    function getPrice(
        address token,
        bool /* isLong */
    ) public view override returns (uint256) {
        uint8 tokenId = _getIdFromTokenAddress(token);
        ILiquidityPool.Asset memory asset
            = ILiquidityPool(_liquidityPool).getAssetInfo(tokenId); // prettier-ignore
        return _getPrice(asset.referenceOracle);
    }

    function getWrapPrice(
        address token,
        bool isLong
    ) public view override returns (uint256) {
        return getPrice(token, isLong);
    }

    function getLiquidationPrice(
        address account,
        address collateral,
        address index,
        bool isLong
    ) external view override returns (uint256) {
        IAdapter.Position memory position = getPosition(
            account,
            collateral,
            index,
            isLong
        );
        if (position.size == 0) {
            return 0;
        }

        int256 maintenanceMarginRate = int256(_getMaintenanceMarginRate(index));

        int256 longFactor = isLong ? int256(1e5) : int256(-1e5);
        int256 t = ((longFactor - maintenanceMarginRate) *
            int256(position.size)) / 1e5;

        int256 p;
        if (collateral == index) {
            p =
                (longFactor * int256(position.price) * int256(position.size)) /
                1e18 /
                1e5;

            int256 fundingFee = int256(
                getFundingFee(account, collateral, index, isLong)
            );
            p += fundingFee;

            p *= 1e18;
            p /= t + int256(position.collateralAmount);
        } else {
            p =
                (longFactor * int256(position.price) * int256(position.size)) /
                1e18 /
                1e5;

            int256 fundingFee = int256(
                getFundingFee(account, collateral, index, isLong)
            );
            p += fundingFee;

            int256 collateralPrice = int256(getPrice(collateral, isLong));
            p -= (collateralPrice * int256(position.collateralAmount)) / 1e18; // https://github.com/mux-world/mux-protocol/blob/21103d644d4c4c3d4a18dd51182ee981efc94453/contracts/core/Account.sol#L51

            p = (p * 1e18) / t;
        }

        return p >= 0 ? uint256(p) : 0;
    }

    function estimateLiquidationPrice(
        address account,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) external view override returns (uint256) {
        int256 maintenanceMarginRate = int256(_getMaintenanceMarginRate(index));

        uint256 price = getPrice(index, isLong);
        collateralAmount = _adjustSizeDecimal(collateral, collateralAmount);
        size = _adjustSizeDecimal(index, size);

        int256 longFactor = isLong ? int256(1e5) : int256(-1e5);
        int256 t = ((longFactor - maintenanceMarginRate) * int256(size)) / 1e5;

        int256 p;
        if (collateral == index) {
            p = (longFactor * int256(price) * int256(size)) / 1e18 / 1e5;

            int256 fundingFee = int256(
                getFundingFee(account, collateral, index, isLong)
            );
            p += fundingFee;

            p *= 1e18;
            p /= t + int256(collateralAmount);
        } else {
            p = (longFactor * int256(price) * int256(size)) / 1e18 / 1e5;

            int256 fundingFee = int256(
                getFundingFee(account, collateral, index, isLong)
            );
            p += fundingFee;

            int256 collateralPrice = int256(getPrice(collateral, isLong));
            p -= (collateralPrice * int256(collateralAmount)) / 1e18; // https://github.com/mux-world/mux-protocol/blob/21103d644d4c4c3d4a18dd51182ee981efc94453/contracts/core/Account.sol#L51

            p = (p * 1e18) / t;
        }

        return p >= 0 ? uint256(p) : 0;
    }

    function getAvailableLiquidity(
        address index,
        bool isLong
    ) external view override returns (uint256) {
        uint8 indexId = _getIdFromTokenAddress(index);
        ILiquidityPool.Asset memory asset = ILiquidityPool(_liquidityPool)
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

        uint8 indexDecimals = IERC20Metadata(index).decimals();
        return availableLiquidity / (10 ** (PRICE_DECIMALS - indexDecimals));
    }

    // https://github.com/mux-world/mux-protocol/blob/e93946a555a59fcd9532517c88fff980d382a279/contracts/orderbook/OrderBook.sol#L137
    function _adjustSizeDecimal(
        address token,
        uint256 size
    ) private view returns (uint256) {
        uint8 decimals = IERC20Metadata(token).decimals();

        if (decimals <= 18) {
            return size * (10 ** (18 - decimals));
        } else {
            return size / (10 ** (decimals - 18));
        }
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
        ILiquidityPool.Asset[] memory assets = ILiquidityPool(_liquidityPool)
            .getAllAssetInfo();
        for (uint256 i = 0; i < assets.length; i++) {
            if (assets[i].tokenAddress == tokenAddress) {
                return assets[i].id;
            }
        }
        revert("id: not found");
    }

    function _getMaintenanceMarginRate(
        address tokenAddress
    ) private view returns (uint256) {
        uint8 tokenId = _getIdFromTokenAddress(tokenAddress);
        ILiquidityPool.Asset memory asset
            = ILiquidityPool(_liquidityPool).getAssetInfo(tokenId); // prettier-ignore
        return asset.maintenanceMarginRate;
    }

    function _getPrice(address referenceOracle) private view returns (uint256) {
        int256 price = IChainlink(referenceOracle).latestAnswer();
        price *= 1e10; // decimals 8 => 18
        return uint256(price);
    }
}
