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
    bytes32 public requestKey; // test

    address private _positionRouter;
    address private _router;
    address private _vault;
    address private _swapRouter; // test

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
        address feeReceiver
    ) public {
        IPositionRouter(_positionRouter).executeIncreasePosition(
            key, payable(feeReceiver)
        );
    }

    // test
    function executeDecreasePosition(
        bytes32 key,
        address feeReceiver
    ) public {
        IPositionRouter(_positionRouter).executeDecreasePosition(
            key, payable(feeReceiver)
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
    ) override public view returns (IVault.Position memory) {
        bytes32 positionKey = IVault(_vault).getPositionKey(
            address(this),
            collateral,
            index,
            isLong
        );

        return IVault(_vault).positions(positionKey);
    }

    function _increase(
        address collateral,
        address index,
        uint256 amount,
        uint256 size,
        bool isLong,
        uint256 fee
    ) private {
        if (!IRouter(_router).approvedPlugins(address(this), _positionRouter)) {
            IRouter(_router).approvePlugin(_positionRouter);
        }

        IERC20(collateral).transferFrom(msg.sender, address(this), amount);
        // NOTE: approve to router not positionRouter
        IERC20(collateral).approve(_router, amount);

        address[] memory path = new address[](1);
        path[0] = collateral;

        uint256 price =
            isLong ?
            IVault(_vault).getMaxPrice(index) :
            IVault(_vault).getMinPrice(index);

        requestKey = IPositionRouter(_positionRouter).createIncreasePosition{value: msg.value}(
            path,
            index,
            amount,
            0,
            size,
            isLong,
            price,
            fee,
            0x0,
            address(0)
        );
    }

    function _decrease(
        address collateral,
        address index,
        uint256 amount,
        uint256 size,
        bool isLong,
        uint256 fee
    ) private {
        address[] memory path = new address[](1);
        path[0] = collateral;

        uint256 price =
            isLong ?
            IVault(_vault).getMinPrice(index) :
            IVault(_vault).getMaxPrice(index);

        requestKey = IPositionRouter(_positionRouter).createDecreasePosition{value: msg.value}(
            path,
            index,
            amount,
            size,
            isLong,
            msg.sender, // receiver
            price,
            0,
            fee,
            false, // withdrawETH
            address(0)
        );
    }

    function increasePosition(
        address collateral,
        address index,
        uint256 amount,
        uint256 size,
        bool isLong,
        uint256 fee
    ) override payable public {
        _increase(
            collateral,
            index,
            amount,
            size,
            isLong,
            fee
        );
    }

    function decreasePosition(
        address collateral,
        address index,
        // uint256 amount, // TODO: remove amount (issue 3)
        uint256 size,
        bool isLong,
        uint256 fee
    ) override payable public {
        _decrease(
            collateral,
            index,
            0,
            size,
            isLong,
            fee
        );
    }

    function increaseCollateral(
        address collateral,
        address index,
        uint256 amount,
        bool isLong,
        uint256 fee
    ) override payable public {
        _increase(
            collateral,
            index,
            amount,
            0,
            isLong,
            fee
        );
    }

    function decreaseCollateral(
        address collateral,
        address index,
        uint256 amount,
        // uint256 size,
        bool isLong,
        uint256 fee
    ) override payable public {
        _decrease(
            collateral,
            index,
            amount,
            0,
            isLong,
            fee
        );
    }

    // function getFee() public;
}
