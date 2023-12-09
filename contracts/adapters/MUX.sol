// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;

import "../interfaces/exchanges/MUX/ILiquidityPool.sol";
import "../interfaces/exchanges/MUX/IOrderBook.sol";
import "../interfaces/IAdapter.sol";
import "hardhat/console.sol"; // test

contract MUX is IAdapter {
    uint256 public orderId; // test

    address private _orderBook;
    address private _liquidityPool;

    constructor(address orderBook, address liquidityPool) {
        _orderBook = orderBook;
        _liquidityPool = liquidityPool;
    }

    function getPosition(
        address c, // TODO: naming
        address index,
        bool isLong
    ) public view returns (uint96 collateral, uint96 size, uint32 lastIncreasedTime, uint96 entryPrice, uint128 entryFunding) {
        bytes32 subAccountId = _assembleSubAccountId(
            address(this), // TODO: set msg.sender to account
            3, // WETH
            3, // WETH
            isLong
        );

        (collateral, size, lastIncreasedTime, entryPrice, entryFunding)
            = ILiquidityPool(_liquidityPool).getSubAccount(subAccountId);
    }

    function increasePosition(
        address collateral,
        address index,
        uint256 amount,
        uint256 size,
        bool isLong,
        uint256 fee
    ) override payable public {
        // todo: mapping token address to asset id
        bytes32 subAccountId = _assembleSubAccountId(
            address(this), // TODO: set msg.sender to account
            3, // WETH
            3, // WETH
            isLong
        );
        console.logBytes32(subAccountId);

        IOrderBook(_orderBook).placePositionOrder3{value: amount}(
            subAccountId,
            uint96(amount),
            uint96(size),
            uint96(0), // price
            0, // profitTokenId
            192, // flags
            uint32(0),
            0x0,
            IOrderBook.PositionOrderExtra(0, 0, 0, 0)
        );

        orderId = IOrderBook(_orderBook).nextOrderId() - 1; // test
    }

    function decreasePosition(
        address collateral,
        address index,
        // uint256 amount, // TODO: remove amount (issue 3)
        uint256 size,
        bool isLong,
        uint256 fee
    ) override payable public {
        console.log("1");
    }

    function increaseCollateral(
        address collateral,
        address index,
        uint256 amount,
        bool isLong,
        uint256 fee
    ) override payable public {
        console.log("2");
    }

    function decreaseCollateral(
        address collateral,
        address index,
        uint256 amount,
        // uint256 size,
        bool isLong,
        uint256 fee
    ) override payable public {
        console.log("3");
    }


    function _assembleSubAccountId(
        address account,
        uint8 collateralId,
        uint8 assetId,
        bool isLong
    ) private pure returns (bytes32 subAccountId) {
        subAccountId = bytes32(uint256(uint160(account)) << 96);
        subAccountId |= bytes32(uint256(collateralId) << 88);
        subAccountId |= bytes32(uint256(assetId) << 80);
        subAccountId |= bytes32(uint256(isLong ? 1 : 0) << 72);
    }
}
