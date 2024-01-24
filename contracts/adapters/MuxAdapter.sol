// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IExchange} from "../interfaces/IExchange.sol";
import {IAdapter} from "../interfaces/IAdapter.sol";
import {IERC20} from "../interfaces/IERC20.sol";

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
            uint96 entryPrice,
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

    // function latestTimestamp() external view returns (uint256);

    // function latestRound() external view returns (uint256);

    // function getAnswer(uint256 roundId) external view returns (int256);

    // function getTimestamp(uint256 roundId) external view returns (uint256);

    // event AnswerUpdated(
    //     int256 indexed current,
    //     uint256 indexed roundId,
    //     uint256 updatedAt
    // );
    // event NewRound(
    //     uint256 indexed roundId,
    //     address indexed startedBy,
    //     uint256 startedAt
    // );
}

contract MuxAdapter is IAdapter {
    uint256 public constant PRICE_DECIMALS = 18;
    uint256 public constant USD = 1 * (10 ** PRICE_DECIMALS);

    uint8 private constant _wethId = 3;
    uint8 private immutable _defaultProfitTokenId;

    address private immutable _liquidityPool;
    address private immutable _orderBook;

    constructor(
        address orderBook,
        address liquidityPool,
        uint8 defaultProfitTokenId
    ) {
        require(orderBook != address(0), "orderBook: zero address");
        require(liquidityPool != address(0), "liquidityPool: zero address");

        _orderBook = orderBook;
        _liquidityPool = liquidityPool;
        _defaultProfitTokenId = defaultProfitTokenId;
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

    function _getPrice(address referenceOracle) private view returns (uint256) {
        int256 price = IChainlink(referenceOracle).latestAnswer();
        price *= 1e10; // decimals 8 => 18
        return uint256(price);
    }

    function getMinExecutionFee() external pure override returns (uint256) {
        return 0;
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
    ) external view override returns (uint256) {
        return getPrice(token, isLong);
    }

    // function getDepositFee(
    //     address /* account */,
    //     IExchange.MarketOrder memory /* positionOrder */
    // ) external pure override returns (uint256) {
    //     return 0;
    // }

    function getPositionFee(
        address index,
        uint256 size
    ) external view override returns (uint256) {
        uint8 indexId = _getIdFromTokenAddress(index);
        ILiquidityPool.Asset memory asset = ILiquidityPool(_liquidityPool)
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
    ) external view override returns (uint256) {
        if (size == 0) {
            return 0;
        }

        uint8 indexId = _getIdFromTokenAddress(index);
        ILiquidityPool.Asset memory asset
            = ILiquidityPool(_liquidityPool).getAssetInfo(indexId); // prettier-ignore

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

        uint8 indexDecimals = IERC20(index).decimals();
        return availableLiquidity / (10 ** (PRICE_DECIMALS - indexDecimals));
    }

    function getPosition(
        address account,
        address collateral,
        address index,
        bool isLong
    ) external view override returns (Position memory) {
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
    ) external view override returns (IAdapter.Position memory) {
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

    function increasePosition(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) external payable {
        uint8 collateralId = _getIdFromTokenAddress(collateral);
        uint8 indexId = _getIdFromTokenAddress(index);
        bytes32 subAccountId = _assembleSubAccountId(
            address(this),
            collateralId,
            indexId,
            isLong
        );

        if (collateralId == _wethId) {
            IERC20(collateral).withdraw(collateralAmount);

            IOrderBook(_orderBook).placePositionOrder3{value: collateralAmount}(
                subAccountId,
                uint96(collateralAmount),
                uint96(size),
                0,
                0,
                192,
                0,
                0x0,
                IOrderBook.PositionOrderExtra(0, 0, 0, 0)
            );
        } else {
            // slither-disable-next-line unused-return
            IERC20(collateral).approve(_orderBook, collateralAmount);
            IOrderBook(_orderBook).placePositionOrder3(
                subAccountId,
                uint96(collateralAmount),
                uint96(size),
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
        bool isLong
    ) external payable {
        uint8 collateralId = _getIdFromTokenAddress(collateral);
        uint8 indexId = _getIdFromTokenAddress(index);

        bytes32 subAccountId = _assembleSubAccountId(
            address(this),
            collateralId,
            indexId,
            isLong
        );

        IOrderBook(_orderBook).placePositionOrder3(
            subAccountId,
            0,
            uint96(size),
            0,
            _defaultProfitTokenId,
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
    ) external payable {
        uint8 collateralId = _getIdFromTokenAddress(collateral);
        uint8 indexId = _getIdFromTokenAddress(index);

        bytes32 subAccountId = _assembleSubAccountId(
            address(this),
            collateralId,
            indexId,
            isLong
        );

        if (collateralId == _wethId) {
            IERC20(collateral).withdraw(collateralAmount);

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
    ) external payable {
        uint8 collateralId = _getIdFromTokenAddress(collateral);
        uint8 indexId = _getIdFromTokenAddress(index);

        bytes32 subAccountId = _assembleSubAccountId(
            address(this),
            collateralId,
            indexId,
            isLong
        );

        IOrderBook(_orderBook).placeWithdrawalOrder(
            subAccountId,
            uint96(collateralAmount),
            _defaultProfitTokenId,
            false // isProfit
        );
    }
}
