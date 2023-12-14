// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;

import "../interfaces/exchanges/GMXV1/IPositionRouter.sol";
import "../interfaces/exchanges/GMXV1/IRouter.sol";
import "../interfaces/exchanges/GMXV1/IVault.sol";
import "../interfaces/tokens/IERC20.sol";
import "../interfaces/IAdapter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol"; // test
import "hardhat/console.sol";

contract GMXV1 is IAdapter {
    // gmx contracts
    address immutable private _positionRouter;
    address immutable private _router;
    address immutable private _vault;
    address immutable private _swapRouter; // test

    address constant private WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    address constant private USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;

    constructor(
        address positionRouter,
        address router,
        address vault,
        address swapRouter
    ) {
        _positionRouter = positionRouter;
        _router = router;
        _vault = vault;
        _swapRouter = swapRouter; // test
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
            fundingRate: position.entryFundingRate
        });
    }

    function _increase(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) private {
        if (!IRouter(_router).approvedPlugins(address(this), _positionRouter)) {
            IRouter(_router).approvePlugin(_positionRouter);
        }

        uint256 price =
            isLong ?
            IVault(_vault).getMaxPrice(index) :
            IVault(_vault).getMinPrice(index);
        uint256 fee = IPositionRouter(_positionRouter).minExecutionFee();

        if (isLong) {
            address[] memory path;
            if (collateral == index) {
                path = new address[](1);
                path[0] = collateral;
            } else {
                path = new address[](2);
                path[0] = collateral;
                path[1] = index;
            }

            // WETH
            if (collateral == WETH) {
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
            address[] memory path;

            if (collateral == WETH) {
                // todo: distinguish stable and non-stable
                path = new address[](2);
                path[0] = collateral;
                path[1] = USDC; // NOTE: default to USDC

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
                if (collateral != USDC) { // TODO: if the collateral stable coin other than USDC
                    path = new address[](2);
                    path[0] = collateral;
                    path[1] = USDC;
                } else {
                    path = new address[](1);
                    path[0] = collateral;
                }

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
    }

    function _decrease(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) private {
        uint256 price =
            isLong ?
            IVault(_vault).getMinPrice(index) :
            IVault(_vault).getMaxPrice(index);
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
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) override payable public {
        _increase(
            collateral,
            index,
            collateralAmount,
            size,
            isLong
        );
    }

    function decreasePosition(
        address collateral,
        address index,
        // uint256 collateralAmount, // TODO: remove collateralAmount (issue 3)
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
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong
    ) override payable public {
        _increase(
            collateral,
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
        // uint256 size,
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

    // function get_fee() public;
}
