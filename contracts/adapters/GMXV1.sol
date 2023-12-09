// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;

import "../interfaces/exchanges/GMXV1/IPositionRouter.sol";
import "../interfaces/exchanges/GMXV1/IRouter.sol";
import "../interfaces/exchanges/GMXV1/IVault.sol";
import "../interfaces/tokens/IERC20.sol";
import "../interfaces/IAdapter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol"; // test
import "hardhat/console.sol"; // test

contract GMXV1 is IAdapter {
    // gmx contracts
    address immutable private _positionRouter;
    address immutable private _router;
    address immutable private _vault;
    address immutable private _swapRouter; // test

    // gmx variables
    uint256 immutable private _fee;

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

        _fee = 180_000_000_000_000;
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
        address collateral,
        address index,
        bool isLong
    ) override public view returns (
        uint256,    // collateralAmount,
        uint256,    // size,
        uint256,    // lastIncreasedTime,
        uint256,    // price,
        uint256     // fundingRate
    ) {
        bytes32 positionKey = IVault(_vault).getPositionKey(
            address(this),
            collateral,
            index,
            isLong
        );

        IVault.Position memory position = IVault(_vault).positions(positionKey);
        return (
            position.collateral,
            position.size,
            position.lastIncreasedTime,
            position.averagePrice,
            position.entryFundingRate
        );
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

        IERC20(collateral).transferFrom(msg.sender, address(this), collateralAmount);
        // NOTE: approve to router not positionRouter
        IERC20(collateral).approve(_router, collateralAmount);

        address[] memory path = new address[](1);
        path[0] = collateral;

        uint256 price =
            isLong ?
            IVault(_vault).getMaxPrice(index) :
            IVault(_vault).getMinPrice(index);

        IPositionRouter(_positionRouter).createIncreasePosition{value: msg.value}(
            path,
            index,
            collateralAmount,
            0,
            size,
            isLong,
            price,
            _fee,
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
        address[] memory path = new address[](1);
        path[0] = collateral;

        uint256 price =
            isLong ?
            IVault(_vault).getMinPrice(index) :
            IVault(_vault).getMaxPrice(index);

        IPositionRouter(_positionRouter).createDecreasePosition{value: msg.value}(
            path,
            index,
            collateralAmount,
            size,
            isLong,
            msg.sender, // receiver
            price,
            0,
            _fee,
            false, // withdrawETH
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
