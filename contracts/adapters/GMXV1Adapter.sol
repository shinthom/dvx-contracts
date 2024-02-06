// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IAdapter} from "../interfaces/IAdapter.sol";
import {IExchange} from "../interfaces/IExchange.sol";
import {IERC20} from "../interfaces/IERC20.sol";
import {BaseAdapter} from "./BaseAdapter.sol";

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

    function marginFeeBasisPoints() external view returns (uint256);

    function liquidationFeeUsd() external view returns (uint256);

    function maxLeverage() external view returns (uint256);

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

    function getPositionDelta(
        address _account,
        address _collateralToken,
        address _indexToken,
        bool _isLong
    ) external view returns (bool, uint256);

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

contract GmxV1Adapter is BaseAdapter {
    uint256 public constant BASIS_POINTS_DIVISOR = 10_000;

    uint256 public constant PRICE_DECIMALS = 30;
    uint256 public constant USD = 1 * (10 ** PRICE_DECIMALS);

    address private constant _weth = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;

    address private immutable _positionRouter;
    address private immutable _router;
    address private immutable _vault;
    address private immutable _exchange;

    address private immutable _this;

    constructor(
        address positionRouter,
        address router,
        address vault,
        address exchange,
        address logger
    ) BaseAdapter(logger) {
        require(positionRouter != address(0), "positionRouter: zero address");
        require(router != address(0), "router: zero address");
        require(vault != address(0), "vault: zero address");
        require(exchange != address(0), "exchange: zero address");

        _positionRouter = positionRouter;
        _router = router;
        _vault = vault;
        _exchange = exchange;

        _this = address(this);
    }

    function increasePosition(
        uint256 marketOrderId,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        uint256 acceptablePrice,
        bool isLong
    ) public payable override {
        if (!IRouter(_router).approvedPlugins(address(this), _positionRouter)) {
            IRouter(_router).approvePlugin(_positionRouter);
        }
        require(collateral != address(0), "collateral: zero address");
        require(index != address(0), "index: zero address");

        uint8 indexDecimal = IERC20(index).decimals();
        uint256 indexPrice = getPrice(index, isLong);

        uint256 sizeUsd = (size * indexPrice) / (10 ** indexDecimal);

        acceptablePrice *= 1e12; // 1e30
        _increase(collateral, index, collateralAmount, sizeUsd, acceptablePrice, isLong);

        uint256 entryPrice = indexPrice / 1e12; // 1e18
        logIncreasePosition(
            marketOrderId,
            address(this),
            _this,
            collateral,
            index,
            collateralAmount,
            size,
            isLong,
            entryPrice,
            acceptablePrice
        );
    }

    function decreasePosition(
        address collateral,
        address index,
        uint256 size,
        bool isLong
    ) public payable override {
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

        logDecreasePosition(
            address(this),
            _this,
            collateral,
            index,
            size,
            isLong
        );
    }

    function increaseCollateral(
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong
    ) public payable override {
        require(collateral != address(0), "collateral: zero address");
        require(index != address(0), "index: zero address");

        _increase(collateral, index, collateralAmount, 0, 0, isLong);

        logIncreaseCollateral(
            address(this),
            _this,
            collateral,
            index,
            collateralAmount,
            isLong
        );
    }

    function decreaseCollateral(
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong
    ) public payable override {
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

        logDecreaseCollateral(
            address(this),
            _this,
            collateral,
            index,
            collateralAmount,
            isLong
        );
    }

    function addAcmmMargin(
        address collateral,
        address index,
        bool isLong,
        uint256 marginAmount
    ) public payable override {
        require(collateral != address(0), "collateral: zero address");
        require(index != address(0), "index: zero address");

        _increase(collateral, index, marginAmount, 0, 0, isLong);

        logAddAcmmMargin(address(this), _this, collateral, index, marginAmount);
    }

    function subAcmmMargin(
        address collateral,
        address index,
        bool isLong,
        uint256 marginAmount
    ) external payable override {
        uint256 marginAmountUsd;
        if (isLong) {
            marginAmountUsd = IVault(_vault).tokenToUsdMin(
                collateral,
                marginAmount
            );
        } else {
            require(
                IExchange(_exchange).isStableToken(collateral),
                "INVALID_COLLATERAL"
            );
            marginAmountUsd = marginAmount * (10 ** 24);
        }

        _decrease(collateral, index, marginAmountUsd, 0, isLong);

        logSubAcmmMargin(address(this), _this, collateral, index, marginAmount);
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
        uint8 indexDecimal = IERC20(index).decimals();
        uint256 indexPrice = getPrice(index, isLong);

        uint256 sizeUsd = (size * indexPrice) / (10 ** indexDecimal);
        marketOrder = IExchange.MarketOrder({
            collateral: collateral,
            index: index,
            collateralAmount: collateralAmount,
            size: sizeUsd,
            isLong: isLong
        });
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
    ) public view override returns (IAdapter.Position memory) {
        // note: The position of GMX in the Reader contract should appear to be one.
        // if (isLong) {
        //     collateral = index;
        // } else {
        //     if (!IExchange(_exchange).isStableToken(collateral)) {
        //         collateral = IExchange(_exchange).defaultStableToken();
        //     }
        // }

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
                    price: position.price / 1e12, // 1e18
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
                    price: position.price / 1e12, // 1e18
                    fundingRate: position.fundingRate,
                    isLong: isLong
                });
        }
    }

    function getProfitToken(
        address collateral,
        address index,
        bool isLong
    ) external view override returns (address) {
        if (isLong) {
            return index;
        } else {
            if (IExchange(_exchange).isStableToken(collateral)) {
                return collateral;
            }
            return IExchange(_exchange).defaultStableToken();
        }
    }

    function getPositionPnlUsd(
        address account,
        address collateral,
        address index,
        bool isLong
    ) public view override returns (bool hasProfit, uint256 pnlUsd) {
        (hasProfit, pnlUsd) = IVault(_vault).getPositionDelta(
            account,
            collateral,
            index,
            isLong
        );
    }

    function getWrapPositionPnlUsd(
        address account,
        address collateral,
        address index,
        bool isLong
    ) external view override returns (bool, uint256) {
        (bool hasProfit, uint256 pnlUsd) = getPositionPnlUsd(
            account,
            collateral,
            index,
            isLong
        );

        return (hasProfit, pnlUsd / (10 ** 12));
    }

    function getMinExecutionFee() external view override returns (uint256) {
        return IPositionRouter(_positionRouter).minExecutionFee();
    }

    function getPositionFee(
        address /* index */,
        uint256 size
    ) external pure override returns (uint256) {
        return (size * 10) / BASIS_POINTS_DIVISOR;
    }

    function getDepositFee(
        address account,
        IExchange.MarketOrder memory marketOrder
    ) external view override returns (uint256) {
        if (!marketOrder.isLong) {
            return 0;
        }
        address collateral = marketOrder.collateral;
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

    function getFundingFee(
        address collateral,
        address /* index */,
        uint256 size,
        uint256 fundingRate,
        bool /* isLong */
    ) public view override returns (uint256) {
        if (size == 0) {
            return 0;
        }

        return IVault(_vault).getFundingFee(collateral, size, fundingRate);
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

    function getLiquidationPrice(
        address account,
        address collateral,
        address index,
        bool isLong
    ) external view override returns (int256) {
        IAdapter.Position memory position = getPosition(
            account,
            collateral,
            index,
            isLong
        );
        if (position.size == 0) {
            return 0;
        }

        uint256 fundingFee = getFundingFee(collateral, index, position.size, position.fundingRate, isLong);
        uint256 totalFees = _calculateTotalFees(position.size, fundingFee);

        uint256 liquidationPriceForFees = _getLiquidationPriceFromDelta(
            totalFees, position.size, position.collateralAmount, position.price, isLong
        );

        uint256 maxLeverage = IVault(_vault).maxLeverage();
        uint256 liquidationPriceForMaxLevearge = _getLiquidationPriceFromDelta(
            position.size * BASIS_POINTS_DIVISOR / maxLeverage, position.size, position.collateralAmount, position.price, isLong
        );

        uint256 p;
        if (isLong) {
            p = liquidationPriceForFees > liquidationPriceForMaxLevearge ? liquidationPriceForFees : liquidationPriceForMaxLevearge;
        } else {
            p = liquidationPriceForFees < liquidationPriceForMaxLevearge ? liquidationPriceForFees : liquidationPriceForMaxLevearge;
        }

        // 1e30 -> 1e18
        return int256(p / 1e12);
    }

    function _calculateTotalFees(uint256 size, uint256 fundingFee) private view returns (uint256) {
        uint256 marginFeeBasisPoints = IVault(_vault).marginFeeBasisPoints();
        uint256 liquidationFeeUsd = IVault(_vault).liquidationFeeUsd();

        return (size * marginFeeBasisPoints) / BASIS_POINTS_DIVISOR + fundingFee + liquidationFeeUsd;
    }

    function _getLiquidationPriceFromDelta(
        uint256 liquidationAmount,
        uint256 size,
        uint256 collateralAmount,
        uint256 averagePrice,
        bool isLong
    ) private view returns (uint256) {
        if (liquidationAmount > collateralAmount) {
            uint256 liquidationDelta = liquidationAmount - collateralAmount;
            uint256 priceDelta = liquidationDelta * averagePrice / size;

            return isLong ? averagePrice + priceDelta : averagePrice - priceDelta;
        }

        uint256 liquidationDelta = collateralAmount - liquidationAmount;
        uint256 priceDelta = liquidationDelta * averagePrice / size;

        return isLong ? averagePrice - priceDelta : averagePrice + priceDelta;
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

    function _increase(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        uint256 acceptablePrice,
        bool isLong
    ) private {
        if (isLong && (collateral != index)) {
            IERC20(collateral).approve(_exchange, collateralAmount);
            uint256 amountOut = IExchange(_exchange).swap(
                collateral,
                index,
                collateralAmount
            );

            collateralAmount = amountOut;
            collateral = index;
        }

        if (!isLong && !(IExchange(_exchange).isStableToken(collateral))) {
            address defaultStableToken
                = IExchange(_exchange).defaultStableToken(); // prettier-ignore

            IERC20(collateral).approve(_exchange, collateralAmount);

            uint256 amountOut = IExchange(_exchange).swap(
                collateral,
                defaultStableToken,
                collateralAmount
            );

            collateralAmount = amountOut;
            collateral = defaultStableToken;
        }

        uint256 executionFee = IPositionRouter(_positionRouter)
            .minExecutionFee();

        address[] memory path = new address[](1);
        path[0] = collateral;

        if (acceptablePrice == 0) {
            acceptablePrice = isLong ? type(uint256).max : 0;
        }

        IERC20(collateral).approve(_router, collateralAmount);
        IPositionRouter(_positionRouter).createIncreasePosition{
            value: executionFee
        }(
            path,
            index,
            collateralAmount,
            0,
            size,
            isLong,
            acceptablePrice,
            executionFee,
            0x0,
            address(0)
        );
    }

    function _decrease(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) private {
        uint256 price = isLong ? 0 : type(uint256).max;
        uint256 executionFee = IPositionRouter(_positionRouter)
            .minExecutionFee();

        address[] memory path = new address[](1);
        path[0] = collateral;

        IPositionRouter(_positionRouter).createDecreasePosition{
            value: executionFee
        }(
            path,
            index,
            collateralAmount,
            size,
            isLong,
            address(this),
            price,
            0,
            executionFee,
            false, // withdrawETH,
            address(0)
        );
    }
}
