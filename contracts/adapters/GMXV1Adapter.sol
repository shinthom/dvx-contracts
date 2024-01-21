// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IAdapter} from "../interfaces/IAdapter.sol";
import {IExchange} from "../interfaces/IExchange.sol";
import {IERC20} from "../interfaces/IERC20.sol";
import "hardhat/console.sol";

interface IVault {
    struct Position {
        uint256 size;
        uint256 collateral;
        uint256 averagePrice;
        uint256 entryFundingRate;
        uint256 reserveAmount;
        int256 realisedPnl;
        uint256 lastIncreasedTime;
    }

    function positions(
        bytes32 _positionKey
    ) external view returns (Position memory);

    function tokenToUsdMin(
        address _token,
        uint256 _tokenAmount
    ) external view returns (uint256);

    function guaranteedUsd(address _token) external view returns (uint256);

    function globalShortSizes(address _token) external view returns (uint256);

    function getFundingFee(
        address _collateralToken,
        uint256 _size,
        uint256 _entryFundingRate
    ) external view returns (uint256);

    function getMaxPrice(address _token) external view returns (uint256);

    function getMinPrice(address _token) external view returns (uint256);

    function getPosition(
        address _account,
        address _collateralToken,
        address _indexToken,
        bool _isLong
    )
        external
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            bool,
            uint256
        );

    function getPositionKey(
        address _account,
        address _collateralToken,
        address _indexToken,
        bool _isLong
    ) external view returns (bytes32);
}

interface IRouter {
    function approvedPlugins(
        address _plugin,
        address _protocol
    ) external view returns (bool);

    function approvePlugin(address _plugin) external;
}

interface IPositionRouter {
    function depositFee() external view returns (uint256);

    function minExecutionFee() external view returns (uint256);

    function increasePositionBufferBps() external view returns (uint256);

    function maxGlobalLongSizes(address _token) external view returns (uint256);

    function maxGlobalShortSizes(
        address _token
    ) external view returns (uint256);

    function createIncreasePosition(
        address[] memory _path,
        address _indexToken,
        uint256 _amountIn,
        uint256 _minOut,
        uint256 _size,
        bool _isLong,
        uint256 _acceptablePrice,
        uint256 _executionFee,
        bytes32 _referralCode,
        address _callbackTarget
    ) external payable returns (bytes32);

    function createIncreasePositionETH(
        address[] memory _path,
        address _indexToken,
        uint256 _minOut,
        uint256 _size,
        bool _isLong,
        uint256 _acceptablePrice,
        uint256 _executionFee,
        bytes32 _referralCode,
        address _callbackTarget
    ) external payable returns (bytes32);

    function createDecreasePosition(
        address[] memory _path,
        address _indexToken,
        uint256 _collateralDelta,
        uint256 _size,
        bool _isLong,
        address _receiver,
        uint256 _acceptablePrice,
        uint256 _minOut,
        uint256 _executionFee,
        bool _withdrawETH,
        address _callbackTarget
    ) external payable returns (bytes32);

    // test
    function executeIncreasePosition(
        bytes32 key,
        address payable feeReceiver
    ) external;

    function executeDecreasePosition(
        bytes32 _key,
        address payable _executionFeeReceiver
    ) external returns (bool);

    function increasePositionsIndex(
        address _account
    ) external view returns (uint256);

    function decreasePositionsIndex(
        address _account
    ) external view returns (uint256);

    function setDelayValues(
        uint256 _minBlockDelayKeeper,
        uint256 _minTimeDelayPublic,
        uint256 _maxTimeDelay
    ) external;

    function setPositionKeeper(address _account, bool _isActive) external;

    function isPositionKeeper(address _account) external view returns (bool);

    function getRequestKey(
        address _account,
        uint256 _index
    ) external pure returns (bytes32);
}

interface IFastPriceFeed {
    function setPrices(
        address[] memory _tokens,
        uint256[] memory _prices,
        uint256 _timestamp
    ) external;

    function maxTimeDeviation() external view returns (uint256);
}

interface IVaultPriceFeed {
    function setSecondaryPriceFeed(address _secondaryPriceFeed) external;
}

contract GmxV1Adapter is IAdapter {
    uint256 public constant BASIS_POINTS_DIVISOR = 10000;

    uint256 public constant PRICE_DECIMALS = 30;
    uint256 public constant USD = 1 * (10 ** PRICE_DECIMALS);

    address private constant _weth = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    // address private constant _defaultStableToken =
    //     0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8; // usdc.e
    address private constant _defaultStableToken =
        0xaf88d065e77c8cC2239327C5EDb3A432268e5831; // usdc

    address private immutable _positionRouter;
    address private immutable _router;
    address private immutable _vault;
    address private immutable _exchange;

    constructor(
        address positionRouter,
        address router,
        address vault,
        address exchange
    ) {
        require(positionRouter != address(0), "positionRouter: zero address");
        require(router != address(0), "router: zero address");
        require(vault != address(0), "vault: zero address");
        require(exchange != address(0), "exchange: zero address");

        _positionRouter = positionRouter;
        _router = router;
        _vault = vault;
        _exchange = exchange;
    }

    function getMinExecutionFee() external view override returns (uint256) {
        return IPositionRouter(_positionRouter).minExecutionFee();
    }

    function getPriceDecimals() external pure override returns (uint256) {
        return PRICE_DECIMALS;
    }

    function getPrice(
        address token,
        bool isLong
    ) public view override returns (uint256) {
        if (IExchange(_exchange).isStableToken(token)) {
            return USD;
        }
        return
            isLong
                ? IVault(_vault).getMaxPrice(token)
                : IVault(_vault).getMinPrice(token);
    }

    function getWrapPrice(
        address token,
        bool isLong
    ) external view override returns (uint256) {
        uint256 price = getPrice(token, isLong);
        return price / (10 ** 12); // 1e18
    }

    function getDepositFee(
        address account,
        IExchange.MarketOrder memory marketOrder
    ) external view override returns (uint256) {
        if (!marketOrder.isLong) {
            return 0;
        }
        address collateral = marketOrder.path[marketOrder.path.length - 1];
        IAdapter.Position memory position = getPosition(
            account,
            collateral,
            marketOrder.index,
            marketOrder.isLong
        );
        if (position.size == 0) {
            return 0;
        }

        uint256 increasePositionBufferBps
            = IPositionRouter(_positionRouter).increasePositionBufferBps(); // prettier-ignore
        uint256 collateralAmountUsd = IVault(_vault).tokenToUsdMin(
            collateral,
            marketOrder.collateralAmount
        );

        uint256 nextSize = position.size + marketOrder.size;
        uint256 nextCollateralAmount = position.collateralAmount +
            collateralAmountUsd;

        uint256 prevLeverage = (position.size * BASIS_POINTS_DIVISOR) /
            position.collateralAmount;
        uint256 nextLeverage = (nextSize *
            (BASIS_POINTS_DIVISOR + increasePositionBufferBps)) /
            nextCollateralAmount;

        if (nextLeverage > prevLeverage) {
            return 0;
        }

        uint256 collateralDecimals = IERC20(collateral).decimals();
        uint256 minPrice = IVault(_vault).getMinPrice(collateral);

        uint256 depositFeeBasisPoints
            = IPositionRouter(_positionRouter).depositFee(); // prettier-ignore
        uint256 collateralAmountAfterDepositFee = (marketOrder
            .collateralAmount * depositFeeBasisPoints) / BASIS_POINTS_DIVISOR;

        return
            (collateralAmountAfterDepositFee * minPrice) /
            (10 ** collateralDecimals);
    }

    function getPositionFee(
        address /* index */,
        uint256 size
    ) external pure override returns (uint256) {
        return (size * 10) / BASIS_POINTS_DIVISOR;
    }

    function getFundingFee(
        address collateral,
        address /* index */,
        uint256 size,
        uint256 fundingRate,
        bool /* isLong */
    ) external view override returns (uint256) {
        if (size == 0) {
            return 0;
        }

        return IVault(_vault).getFundingFee(collateral, size, fundingRate);
    }

    function getAvailableLiquidity(
        address index,
        bool isLong
    ) external view override returns (uint256) {
        uint256 availableLiquidityUsd = isLong
            ? IPositionRouter(_positionRouter).maxGlobalLongSizes(index) -
                IVault(_vault).guaranteedUsd(index)
            : IPositionRouter(_positionRouter).maxGlobalShortSizes(index) -
                IVault(_vault).globalShortSizes(index);

        uint8 indexDecimals = IERC20(index).decimals();
        return
            (availableLiquidityUsd * (10 ** indexDecimals)) /
            getPrice(index, isLong);
    }

    function getPosition(
        address account,
        address collateral,
        address index,
        bool isLong
    ) public view override returns (IAdapter.Position memory) {
        bytes32 positionKey = IVault(_vault).getPositionKey(
            account,
            collateral,
            index,
            isLong
        );
        IVault.Position memory position = IVault(_vault).positions(positionKey);

        return
            IAdapter.Position({
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
    ) external view override returns (IAdapter.Position memory) {
        IAdapter.Position memory position = getPosition(
            account,
            collateral,
            index,
            isLong
        );

        if (position.size == 0) {
            return
                IAdapter.Position({
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
            return
                IAdapter.Position({
                    collateralAmount: (position.collateralAmount *
                        (10 ** indexDecimals)) / position.price,
                    size: (position.size * (10 ** indexDecimals)) /
                        position.price,
                    lastIncreasedTime: position.lastIncreasedTime,
                    price: position.price,
                    fundingRate: position.fundingRate,
                    isLong: isLong
                });
        } else {
            uint8 collateralDecimals = IERC20(collateral).decimals();
            uint8 indexDecimals = IERC20(index).decimals();
            return
                IAdapter.Position({
                    collateralAmount: position.collateralAmount /
                        (10 ** (PRICE_DECIMALS - collateralDecimals)),
                    size: (position.size * (10 ** indexDecimals)) /
                        position.price,
                    lastIncreasedTime: position.lastIncreasedTime,
                    price: position.price,
                    fundingRate: position.fundingRate,
                    isLong: isLong
                });
        }
    }

    function makeMarketOrder(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    )
        external
        view
        override
        returns (IExchange.MarketOrder memory marketOrder)
    {
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
            if (IExchange(_exchange).isStableToken(collateral)) {
                path = new address[](1);
                path[0] = collateral;
            } else {
                path = new address[](2);
                path[0] = collateral;
                path[1] = _defaultStableToken;
            }
        }

        uint8 indexDecimal = IERC20(index).decimals();
        uint256 indexPrice = getPrice(index, isLong);

        uint256 sizeUsd = (size * indexPrice) / (10 ** indexDecimal);
        marketOrder = IExchange.MarketOrder({
            path: path,
            index: index,
            collateralAmount: collateralAmount,
            size: sizeUsd,
            isLong: isLong
        });
    }

    function increasePosition(
        address[] memory path,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) public payable {
        if (!IRouter(_router).approvedPlugins(address(this), _positionRouter)) {
            IRouter(_router).approvePlugin(_positionRouter);
        }

        _increase(path, index, collateralAmount, size, isLong);
    }

    function decreasePosition(
        address collateral,
        address index,
        uint256 size,
        bool isLong
    ) public payable {
        Position memory position = getPosition(
            address(this),
            collateral,
            index,
            isLong
        );
        uint256 sizeUsd = (position.price * size) /
            (10 ** IERC20(index).decimals());

        if (position.collateralAmount > position.size - sizeUsd) {
            sizeUsd = position.size;
        }

        _decrease(collateral, index, 0, sizeUsd, isLong);
    }

    function increaseCollateral(
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong
    ) public payable {
        address[] memory path = new address[](1);
        path[0] = collateral;

        _increase(path, index, collateralAmount, 0, isLong);
    }

    function decreaseCollateral(
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong
    ) public payable {
        uint256 collateralAmountUsd;

        if (isLong) {
            collateralAmountUsd = IVault(_vault).tokenToUsdMin(
                collateral,
                collateralAmount
            );
        } else {
            require(
                IExchange(_exchange).isStableToken(collateral),
                "INVALID_COLLATERAL"
            );
            collateralAmountUsd = collateralAmount * (10 ** 24);
        }

        _decrease(collateral, index, collateralAmountUsd, 0, isLong);
    }

    function _increase(
        address[] memory path,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) private {
        require(path.length == 1 || path.length == 2, "path: invalid length");

        address collateral = path[path.length - 1];
        isLong
            ? require(collateral == index, "collateral: not index")
            : require(
                IExchange(_exchange).isStableToken(collateral),
                "collateral: not stable token"
            );

        if (path.length == 2) {
            require(path[0] != path[1], "path: should be different");

            if (path[0] == _weth) {
                IERC20(path[0]).deposit{value: collateralAmount}();
            }
            IERC20(path[0]).approve(_exchange, collateralAmount);
            collateralAmount = IExchange(_exchange).swap(
                path[0],
                path[1],
                collateralAmount
            );
        }

        uint256 price = isLong ? type(uint256).max : 0;
        uint256 fee = IPositionRouter(_positionRouter).minExecutionFee();

        path = new address[](1);
        path[0] = collateral;

        if (isLong) {
            if (collateral == _weth) {
                IPositionRouter(_positionRouter).createIncreasePositionETH{
                    value: collateralAmount + fee
                }(path, index, 0, size, isLong, price, fee, 0x0, address(0));
            } else {
                IERC20(collateral).approve(_router, collateralAmount);
                IPositionRouter(_positionRouter).createIncreasePosition{
                    value: fee
                }(
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
            IERC20(collateral).approve(_router, collateralAmount);
            IPositionRouter(_positionRouter).createIncreasePosition{value: fee}(
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
        uint256 fee = IPositionRouter(_positionRouter).minExecutionFee();

        address[] memory path = new address[](1);
        path[0] = collateral;

        bool withdrawETH = collateral == _weth ? true : false;
        IPositionRouter(_positionRouter).createDecreasePosition{value: fee}(
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
}
