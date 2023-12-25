// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../interfaces/exchanges/GMXV1/IPositionRouter.sol";
import "../interfaces/exchanges/GMXV1/IRouter.sol";
import "../interfaces/exchanges/GMXV1/IVault.sol";
import "../interfaces/tokens/IERC20.sol";
import "../interfaces/IExchange.sol";
import "../interfaces/IAdapter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol"; // test
import "hardhat/console.sol"; // test

contract GMXV1 is IAdapter {
    address constant private WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    address constant private USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;

    uint256 constant public PRICE_DECIMALS = 30;
    uint256 constant public USD = 1 * (10 ** PRICE_DECIMALS);

    // gmx contracts
    address immutable private _positionRouter;
    address immutable private _router;
    address immutable private _vault;
    address immutable private _swapRouter; // test
    address immutable private _exchange; // test

    constructor(
        address positionRouter,
        address router,
        address vault,
        address swapRouter,
        address exchange
    ) {
        _positionRouter = positionRouter;
        _router = router;
        _vault = vault;
        _swapRouter = swapRouter; // test
        _exchange = exchange;
    }

    function priceDecimals() override public pure returns (uint256) {
        return PRICE_DECIMALS;
    }

    // test
    function executeIncreasePosition(
        bytes32 key,
        address _feeReceiver
    ) public {
        IPositionRouter(_positionRouter).executeIncreasePosition(
            key, payable(_feeReceiver)
        );
    }

    // test
    function executeDecreasePosition(
        bytes32 key,
        address _feeReceiver
    ) public {
        IPositionRouter(_positionRouter).executeDecreasePosition(
            key, payable(_feeReceiver)
        );
    }

    // test
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amount
    ) external {
        IERC20(tokenIn).approve(_swapRouter, amount);

        ISwapRouter(_swapRouter).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: 3000,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }

    function makePositionOrder(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 leverage,
        bool isLong,
        uint256 /* collateralPrice */,
        uint256 /* indexPrice */
    ) override public view returns (IExchange.PositionOrder memory) {
        uint8 collateralDecimals = IERC20(collateral).decimals();
        uint256 collateralPrice
            = collateral == USDC ? USD :
            (isLong ?
                IVault(_vault).getMaxPrice(collateral) :
                IVault(_vault).getMinPrice(collateral));
        uint256 collateralAmountUsd
            = collateralAmount * collateralPrice / (10 ** collateralDecimals);

        address[] memory path;
        if (isLong) {
            if (collateral == index) {
                path = new address[](1);
                path[0] = collateral;
            } else {
                path = new address[](2);
                path[0] = collateral;
                path[1] = WETH;
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

        return IExchange.PositionOrder({
            orderType: IExchange.OrderType.IncreasePosition,
            path: path,
            index: index,
            collateralAmount: collateralAmount,
            size: collateralAmountUsd * leverage,
            isLong: isLong
        });
    }

    function getPrice(
        address token,
        uint256 /* price */,
        bool isLong
    ) override public view returns (uint256) {
        uint256 tokenPrice
            = token == USDC ? USD :
            (isLong ?
                IVault(_vault).getMaxPrice(token) :
                IVault(_vault).getMinPrice(token));

        return tokenPrice;
    }

    // function getDepositFee(
    //     address collateral,
    //     uint256 collateralAmount
    // ) override public view returns (uint256) {
    //     // todo: compare with original leverage

    //     uint256 collateralDecimals = IERC20(collateral).decimals();
    //     uint256 minPrice = IVault(_vault).getMinPrice(collateral);

    //     uint256 depositFeeBasisPoints = IPositionRouter(_positionRouter).depositFee();
    //     uint256 collateralAmountAfterDepositFee = collateralAmount * depositFeeBasisPoints / 10000;

    //     return collateralAmountAfterDepositFee * minPrice / (10 ** collateralDecimals);
    // }

    function getPositionFee(
        address /* index */,
        uint256 /* indexPrice */,
        uint256 size
    ) override public view returns (uint256) {
        {
            uint256 marginFeeBasisPoints = IVault(_vault).marginFeeBasisPoints();
            console.log("marginFeeBasisPoints: %s", marginFeeBasisPoints); // 40
        }
        return IVault(_vault).getPositionFee(size);
    }

    function getFundingFee(
        address collateral,
        address /* index */,
        uint256 size,
        uint256 entryFundingRate,
        bool /* isLong */,
        uint256 /* indexPrice */
    ) override public view returns (uint256) {
        if (size == 0) {
            return 0;
        }

        return IVault(_vault).getFundingFee(
            collateral,
            size,
            entryFundingRate
        );
    }

    function getAvailableLiquidity(
        address index,
        bool isLong
    ) override public view returns (uint256) {
        uint256 availableLiquidityUsd = isLong ?
            IPositionRouter(_positionRouter).maxGlobalLongSizes(index) - IVault(_vault).guaranteedUsd(index) :
            IPositionRouter(_positionRouter).maxGlobalShortSizes(index) - IVault(_vault).globalShortSizes(index);

        uint8 indexDecimals = IERC20(index).decimals();
        return isLong ?
            availableLiquidityUsd / IVault(_vault).getMaxPrice(index) * (10 ** indexDecimals):
            availableLiquidityUsd / IVault(_vault).getMinPrice(index) * (10 ** indexDecimals);
    }

    // quote
    function minExcutionFeeUsd() external view returns (uint256) {
        return IPositionRouter(_positionRouter).minExecutionFee();
    }

    function getPosition(
        address account,
        address collateral,
        address index,
        bool isLong
    ) override public view returns (IAdapter.Position memory) {
        bytes32 positionKey = IVault(_vault).getPositionKey(
            account,
            collateral,
            index,
            isLong
        );
        IVault.Position memory position = IVault(_vault).positions(positionKey);

        return IAdapter.Position({
            collateralAmount: position.collateral,
            size: position.size,
            lastIncreasedTime: position.lastIncreasedTime,
            price: position.averagePrice,
            fundingRate: position.entryFundingRate,
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
        isLong ?
            require(collateral == index, "INVALID_PATH") :
            require(collateral == USDC, "INVALID_PATH");

        if (path.length == 2) {
            require(path[0] != path[1], "INVALID_PATH");

            console.log("before swap");
            IERC20(path[0]).approve(_exchange, type(uint256).max);
            collateralAmount
                = IExchange(_exchange).swap(path[0], path[1], collateralAmount);
            console.log("after swap: %s", collateralAmount);

            // note: WETH will be withrawn to this contract as ETH
            // if (path[1] == WETH) {
            //     IERC20(path[1]).withdraw(collateralAmount);
            // }
        }

        uint256 price =
            isLong ?
            IVault(_vault).getMaxPrice(index) :
            IVault(_vault).getMinPrice(index);
        uint256 fee = IPositionRouter(_positionRouter).minExecutionFee();
        console.log(fee);

        // initialize path variable
        path = new address[](1);
        path[0] = collateral;

        if (isLong) {
            if (collateral == WETH) {
                console.log("collateralAmount: %s", collateralAmount);
                console.log("fee: %s", fee);
                IPositionRouter(_positionRouter).createIncreasePositionETH{value: collateralAmount + fee}(
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
        uint256 price =
            isLong ? IVault(_vault).getMinPrice(index) : IVault(_vault).getMaxPrice(index);
        uint256 fee = IPositionRouter(_positionRouter).minExecutionFee();

        address[] memory path;
        if (collateral == WETH) {
            path = new address[](1);
            path[0] = collateral;
        } else {
            path = new address[](2);
            path[0] = collateral;
            path[1] = WETH;
        }

        IPositionRouter(_positionRouter).createDecreasePosition{value: fee}(
            path,
            index,
            collateralAmount,
            size,
            isLong,
            address(this), // receiver
            price,
            0,
            fee,
            true, // withdrawETH
            address(0)
        );
    }

    function increasePosition(
        address[] memory path,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) override payable public {
        if (!IRouter(_router).approvedPlugins(address(this), _positionRouter)) {
            IRouter(_router).approvePlugin(_positionRouter);
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
    ) override payable public {
        _decrease(
            collateral,
            index,
            0,
            size,
            isLong
        );
    }

    function increaseCollateral(
        address[] memory path,
        address index,
        uint256 collateralAmount,
        bool isLong
    ) override payable public {
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
    ) override payable public {
        _decrease(
            collateral,
            index,
            collateralAmount,
            0,
            isLong
        );
    }
}
