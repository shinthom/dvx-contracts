// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IPositionRouter } from "../interfaces/exchanges/GMXV1/IPositionRouter.sol";
import { IRouter } from "../interfaces/exchanges/GMXV1/IRouter.sol";
import { IVault } from "../interfaces/exchanges/GMXV1/IVault.sol";
import { IGMXOrderBook } from "../interfaces/exchanges/GMXV1/IGMXOrderBook.sol";
import { IERC20 } from "../interfaces/tokens/IERC20.sol";
import { IExchange } from "../interfaces/IExchange.sol";
import { IAdapter } from "../interfaces/IAdapter.sol";
import "hardhat/console.sol";

contract GMXV1 is IAdapter {
    address constant private WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    address constant private WBTC = 0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f;
    address constant private USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;

    address immutable private POSITION_ROUTER;
    address immutable private ROUTER ;
    address immutable private VAULT;
    address immutable private EXCHANGE;

    uint256 public constant BASIS_POINTS_DIVISOR = 10000;
    uint256 constant public PRICE_DECIMALS = 30;
    uint256 constant public USD = 1 * (10 ** PRICE_DECIMALS);

    constructor(
        address positionRouter,
        address router,
        address vault,
        address exchange
    ) {
        POSITION_ROUTER = positionRouter;
        ROUTER = router;
        VAULT = vault;
        EXCHANGE = exchange;
    }

    function getMinExecutionFee() override public view returns (uint256) {
        return IPositionRouter(POSITION_ROUTER).minExecutionFee();
    }

    function getPriceDecimals() override public pure returns (uint256) {
        return PRICE_DECIMALS;
    }

    function getPrice(address token, bool isLong) override public view returns (uint256) {
        if (token == USDC) {
            return USD;
        }
        return isLong ? IVault(VAULT).getMaxPrice(token) : IVault(VAULT).getMinPrice(token);
    }

    function getDepositFee(
        address account,
        IExchange.PositionOrder memory positionOrder
    ) override public view returns (uint256) {
        if (!positionOrder.isLong) {
            return 0;
        }
        address collateral = positionOrder.path[positionOrder.path.length - 1];
        IAdapter.Position memory position
            = getPosition(account, collateral, positionOrder.index, positionOrder.isLong);
        if (position.size == 0) {
            return 0;
        }

        uint256 increasePositionBufferBps = IPositionRouter(POSITION_ROUTER).increasePositionBufferBps();
        uint256 collateralAmountUsd = IVault(VAULT).tokenToUsdMin(collateral, positionOrder.collateralAmount);

        uint256 nextSize = position.size + positionOrder.size;
        uint256 nextCollateralAmount = position.collateralAmount + collateralAmountUsd;

        uint256 prevLeverage = position.size * BASIS_POINTS_DIVISOR / position.collateralAmount;
        uint256 nextLeverage = nextSize * (BASIS_POINTS_DIVISOR + increasePositionBufferBps) / nextCollateralAmount;

        if (nextLeverage > prevLeverage) {
            return 0;
        }

        uint256 collateralDecimals = IERC20(collateral).decimals();
        uint256 minPrice = IVault(VAULT).getMinPrice(collateral);

        uint256 depositFeeBasisPoints = IPositionRouter(POSITION_ROUTER).depositFee();
        uint256 collateralAmountAfterDepositFee
            = positionOrder.collateralAmount * depositFeeBasisPoints / BASIS_POINTS_DIVISOR;

        return collateralAmountAfterDepositFee * minPrice / (10 ** collateralDecimals);
    }

    function getPositionFee(
        address /* index */,
        uint256 size
    ) override public pure returns (uint256) {
        return size * 10 / BASIS_POINTS_DIVISOR;
    }

    function getFundingFee(
        address collateral,
        address /* index */,
        uint256 size,
        uint256 fundingRate,
        bool /* isLong */
    ) override public view returns (uint256) {
        if (size == 0) {
            return 0;
        }

        return IVault(VAULT).getFundingFee(
            collateral,
            size,
            fundingRate
        );
    }

    function getAvailableLiquidity(
        address index,
        bool isLong
    ) override public view returns (uint256) {
        uint256 availableLiquidityUsd = isLong ?
            IPositionRouter(POSITION_ROUTER).maxGlobalLongSizes(index) - IVault(VAULT).guaranteedUsd(index) :
            IPositionRouter(POSITION_ROUTER).maxGlobalShortSizes(index) - IVault(VAULT).globalShortSizes(index);

        uint8 indexDecimals = IERC20(index).decimals();
        return availableLiquidityUsd * (10 ** indexDecimals) / getPrice(index, isLong);
    }

    function getPosition(
        address account,
        address collateral,
        address index,
        bool isLong
    ) override public view returns (IAdapter.Position memory) {
        bytes32 positionKey = IVault(VAULT).getPositionKey(
            account,
            collateral,
            index,
            isLong
        );
        IVault.Position memory position = IVault(VAULT).positions(positionKey);

        return IAdapter.Position({
            collateralAmount: position.collateral,
            size: position.size,
            lastIncreasedTime: position.lastIncreasedTime,
            price: position.averagePrice,
            fundingRate: position.entryFundingRate,
            isLong: isLong
        });
    }

    function getWrapPosition(
        address account,
        address collateral,
        address index,
        bool isLong
    ) override public view returns (IAdapter.Position memory) {
        IAdapter.Position memory position
            = getPosition(account, collateral, index, isLong);

        if (position.size == 0) {
            return IAdapter.Position({
                collateralAmount: position.collateralAmount,
                size: position.size,
                lastIncreasedTime: position.lastIncreasedTime,
                price: position.price,
                fundingRate: position.fundingRate,
                isLong: isLong
            });
        }

        if (isLong) {
            uint8 indexDecimals = IERC20(index).decimals();
            return IAdapter.Position({
                collateralAmount: position.collateralAmount * (10 ** indexDecimals) / position.price,
                size: position.size * (10 ** indexDecimals) / position.price,
                lastIncreasedTime: position.lastIncreasedTime,
                price: position.price,
                fundingRate: position.fundingRate,
                isLong: isLong
            });
        } else {
            uint8 collateralDecimals = IERC20(collateral).decimals();
            uint8 indexDecimals = IERC20(index).decimals();
            return IAdapter.Position({
                collateralAmount: position.collateralAmount / (10 ** (PRICE_DECIMALS - collateralDecimals)),
                size: position.size * (10 ** indexDecimals) / position.price,
                lastIncreasedTime: position.lastIncreasedTime,
                price: position.price,
                fundingRate: position.fundingRate,
                isLong: isLong
            });
        }
    }

    function makePositionOrder(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) override public view returns (IExchange.PositionOrder memory positionOrder) {
        address[] memory path;
        if (isLong) {
            if (collateral == index) {
                path = new address[](1);
                path[0] = collateral;
            } else {
                path = new address[](2);
                path[0] = collateral;
                path[1] = index;
            }
        } else {
            if (collateral == USDC) {
                path = new address[](1);
                path[0] = collateral;
            } else {
                path = new address[](2);
                path[0] = collateral;
                path[1] = USDC;
            }
        }

        uint8 indexDecimal = IERC20(index).decimals();
        uint256 indexPrice = getPrice(index, isLong);
        uint256 sizeUsd = size * indexPrice / (10 ** indexDecimal);
        positionOrder = IExchange.PositionOrder({
            orderType: IExchange.OrderType.IncreasePosition,
            path: path,
            index: index,
            collateralAmount: collateralAmount,
            size: sizeUsd,
            isLong: isLong
        });
    }

    function _increase(
        address[] memory path,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) private {
        require(
            path.length == 1 || path.length == 2,
            "INVALID_PATH"
        );

        address collateral = path[path.length - 1];
        isLong ? require(collateral == index, "INVALID_PATH") : require(collateral == USDC, "INVALID_PATH");

        if (path.length == 2) {
            require(path[0] != path[1], "INVALID_PATH");

            if (path[0] == WETH) {
                IERC20(path[0]).deposit{value: collateralAmount}();
            }
            IERC20(path[0]).approve(EXCHANGE, collateralAmount);
            collateralAmount
                = IExchange(EXCHANGE).swap(path[0], path[1], collateralAmount);
        }

        // todo: check if GMX keepers execute this position.
        uint256 price = isLong ? type(uint256).max : 0;
        uint256 fee = IPositionRouter(POSITION_ROUTER).minExecutionFee();

        // initialize path variable
        path = new address[](1);
        path[0] = collateral;

        if (isLong) {
            if (collateral == WETH) {
                IPositionRouter(POSITION_ROUTER).createIncreasePositionETH{value: collateralAmount + fee}(
                    path,
                    index,
                    0,
                    size,
                    isLong,
                    price,
                    fee,
                    0x0,
                    address(0)
                );
            } else {
                IERC20(collateral).approve(ROUTER, collateralAmount);
                IPositionRouter(POSITION_ROUTER).createIncreasePosition{value: fee}(
                    path,
                    index,
                    collateralAmount,
                    0,
                    size,
                    isLong,
                    price,
                    fee,
                    0x0,
                    address(0)
                );
            }
        } else {
            IERC20(collateral).approve(ROUTER, collateralAmount);
            IPositionRouter(POSITION_ROUTER).createIncreasePosition{value: fee}(
                path,
                index,
                collateralAmount,
                0,
                size,
                isLong,
                price,
                fee,
                0x0,
                address(0)
            );
        }
    }

    function _decrease(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) private {
        uint256 price = isLong ? 0 : type(uint256).max;
        uint256 fee = IPositionRouter(POSITION_ROUTER).minExecutionFee();

        address[] memory path = new address[](1);
        path[0] = collateral;

        bool withdrawETH = collateral == WETH ? true : false;
        IPositionRouter(POSITION_ROUTER).createDecreasePosition{value: fee}(
            path,
            index,
            collateralAmount,
            size,
            isLong,
            address(this),
            price,
            0,
            fee,
            withdrawETH,
            address(0)
        );
    }

    function increasePosition(
        address[] memory path,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) override public payable {
        if (!IRouter(ROUTER).approvedPlugins(address(this), POSITION_ROUTER)) {
            IRouter(ROUTER).approvePlugin(POSITION_ROUTER);
        }

        _increase(
            path,
            index,
            collateralAmount,
            size,
            isLong
        );
    }

    function decreasePosition(
        address collateral,
        address index,
        uint256 size,
        bool isLong
    ) override public payable {
        Position memory position
            = getPosition(address(this), collateral, index, isLong);
        uint256 sizeUsd
            = position.price * size / (10 ** IERC20(index).decimals());

        if (position.collateralAmount > position.size - sizeUsd) {
            sizeUsd = position.size;
        }

        _decrease(
            collateral,
            index,
            0,
            sizeUsd,
            isLong
        );
    }

    function increaseCollateral(
        address[] memory path,
        address index,
        uint256 collateralAmount,
        bool isLong
    ) override public payable {
        _increase(
            path,
            index,
            collateralAmount,
            0,
            isLong
        );
    }

    function decreaseCollateral(
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong
    ) override public payable {
        uint256 collateralAmountUsd;

        if (isLong) {
            collateralAmountUsd = IVault(VAULT).tokenToUsdMin(collateral, collateralAmount);
        } else {
            require(
                collateral == USDC,
                "INVALID_COLLATERAL"
            );
            collateralAmountUsd = collateralAmount * (10 ** 24);
        }

        _decrease(
            collateral,
            index,
            collateralAmountUsd,
            0,
            isLong
        );
    }
}
