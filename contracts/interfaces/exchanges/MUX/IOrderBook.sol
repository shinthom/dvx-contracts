// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IOrderBook {
    struct PositionOrderExtra {
        uint96 tpPrice; // take-profit price. decimals = 18. only valid when flags.POSITION_TPSL_STRATEGY.
        uint96 slPrice; // stop-loss price. decimals = 18. only valid when flags.POSITION_TPSL_STRATEGY.
        uint8 tpslProfitTokenId; // only valid when flags.POSITION_TPSL_STRATEGY.
        uint32 tpslDeadline; // only valid when flags.POSITION_TPSL_STRATEGY.
    }

    function nextOrderId() external view returns (uint256);
    function getOrder(uint64 orderId) external view returns (bytes32[3] memory, bool);

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

    function depositCollateral(
        bytes32 subAccountId,
        uint256 rawAmount // NOTE: OrderBook SHOULD transfer rawAmount collateral to LiquidityPool
    ) external payable;

    function placeWithdrawalOrder(
        bytes32 subAccountId,
        uint96 rawAmount, // erc20.decimals
        uint8 profitTokenId,
        bool isProfit
    ) external;

    // test, only brokder
    function fillPositionOrder(
        uint64 orderId,
        uint96 collateralPrice,
        uint96 assetPrice,
        uint96 profitAssetPrice // only used when !isLong
    ) external;

    function fillWithdrawalOrder(
        uint64 orderId,
        uint96 collateralPrice,
        uint96 assetPrice,
        uint96 profitAssetPrice // only used when !isLong
    ) external;
}
