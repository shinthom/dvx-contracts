// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;

import "./interfaces/IExchange.sol";
import "./interfaces/tokens/IERC20.sol";
import "./interfaces/exchanges/GMXV1/IVault.sol";
import "./quoters/GMXQuoter.sol";
import "./quoters/MUXQuoter.sol";

// gmx + mux
contract Quoter is GMXQuoter, MUXQuoter {
    struct Order {
        uint256 feeUsd;
        uint256 availableLiquidity;
        IExchange.Order order;
    }

    function quote(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 leverage,
        bool isLong,
        uint256 price // 1e18 (mux)
    ) external view returns (
        Order[] memory
    ) {
        Order[] memory orders = new Order[](2);
        orders[0] = quoteGMX(collateral, index, collateralAmount, leverage, isLong);
        orders[1] = quoteMUX(collateral, index, collateralAmount, leverage, isLong, price);

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
        Order memory order
    ) {
        uint256 sizeUsd = _calculateSizeUsd(
            collateral,
            collateralAmount,
            leverage,
            isLong
        );
        uint256 availableLiquidity = getAvailableLiquidity(index);

        order = Order({
            feeUsd: (getExecutionFee(isLong) + getPositionFee(sizeUsd)) / 1e12, // 1e30 -> 1e18
            availableLiquidity: availableLiquidity,
            order: IExchange.Order({
                orderType: IExchange.OrderType.IncreasePosition,
                collateral: collateral,
                index: index,
                collateralAmount: collateralAmount,
                size: sizeUsd,
                isLong: isLong
            })
        });
    }

    function quoteMUX(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 leverage,
        bool isLong,
        uint256 price // 1e18
    )
    public
    view
    returns (
        Order memory order
    ) {
        uint256 sizeUsd = _calculateSizeUsd(
            collateral,
            collateralAmount,
            leverage,
            isLong
        );

        uint8 indexDecimals = IERC20(index).decimals();
        uint256 indexPrice = getPrice(index, isLong);
        uint256 size = sizeUsd * (10 ** indexDecimals) / indexPrice;

        order = Order({
            feeUsd: getPositionFee(price, index, size),
            availableLiquidity: 0,
            order: IExchange.Order({
                orderType: IExchange.OrderType.IncreasePosition,
                collateral: collateral,
                index: index,
                collateralAmount: collateralAmount,
                size: size,
                isLong: isLong
            })
        });
    }

    function _calculateSizeUsd(
        address collateral,
        uint256 collateralAmount,
        uint256 leverage,
        bool isLong
    ) private view returns (uint256) {
        uint8 collateralDecimals = IERC20(collateral).decimals();

        // TODO: if the token is stable token, we just use 1 USD as price.
        uint256 collateralPrice = getPrice(collateral, isLong);
        uint256 collateralAmountUsd
            = collateralAmount * collateralPrice / (10 ** collateralDecimals);
        return collateralAmountUsd * leverage;
    }
}
