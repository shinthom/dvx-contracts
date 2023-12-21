// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;

import "./interfaces/IExchange.sol";
import "./interfaces/tokens/IERC20.sol";
import "./interfaces/exchanges/GMXV1/IVault.sol";

contract Quoter {
    address private _vault = 0x489ee077994B6658eAfA855C308275EAd8097C4A;

    // todo: quoter only calculate fee and OI, not create order.

    function quote(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 leverage,
        bool isLong
    ) external view returns (
        IExchange.Order[] memory
    ) {
        IExchange.Order[] memory orders = new IExchange.Order[](2);

        // note: collateralAmount / 2
        orders[0] = quoteGMX(collateral, index, collateralAmount / 2, leverage, isLong);
        orders[1] = quoteMUX(collateral, index, collateralAmount / 2, leverage, isLong);
        return orders;
    }

    function quoteGMX(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 leverage,
        bool isLong
    )
    public
    view
    returns (
        IExchange.Order memory order
    ) {
        uint256 sizeUsd = _calculateSizeUsd(
            collateral,
            index,
            collateralAmount,
            leverage,
            isLong
        );

        order.orderType = IExchange.OrderType.IncreasePosition;
        order.collateral = collateral;
        order.index = index;
        order.collateralAmount = collateralAmount;
        order.size = sizeUsd;
        order.isLong = isLong;
    }

    function quoteMUX(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 leverage,
        bool isLong
    )
    public
    view
    returns (
        IExchange.Order memory order
    ) {
        uint256 sizeUsd = _calculateSizeUsd(
            collateral,
            index,
            collateralAmount,
            leverage,
            isLong
        );
        uint256 indexPrice =
            isLong ? IVault(_vault).getMaxPrice(index) : IVault(_vault).getMinPrice(index);

        uint8 indexDecimals = IERC20(index).decimals();
        uint256 size = sizeUsd * (10 ** indexDecimals) / indexPrice;

        order.orderType = IExchange.OrderType.IncreasePosition;
        order.collateral = collateral;
        order.index = index;
        order.collateralAmount = collateralAmount;
        order.size = size;
        order.isLong = isLong;
    }

    function _calculateSizeUsd(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 leverage,
        bool isLong
    ) private view returns (uint256) {
        uint8 collateralDecimals = IERC20(collateral).decimals();

        // TODO: if the token is stable token, we just use 1 USD as price.
        uint256 collateralPrice =
            isLong ? IVault(_vault).getMaxPrice(collateral) : IVault(_vault).getMinPrice(collateral);
        uint256 collateralAmountUsd = collateralAmount * collateralPrice / (10 ** collateralDecimals);

        return collateralAmountUsd * leverage;
    }
}
