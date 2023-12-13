// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;

import "../interfaces/exchanges/MUX/ILiquidityPool.sol";
import "../interfaces/exchanges/MUX/IOrderBook.sol";
import "../interfaces/tokens/IERC20.sol";
import "../interfaces/IAdapter.sol";
import "hardhat/console.sol";

contract MUX is IAdapter {
    address immutable private _orderBook;
    address immutable private _liquidityPool;

    receive() external payable {}

    constructor(address orderBook, address liquidityPool) {
        _orderBook = orderBook;
        _liquidityPool = liquidityPool;
    }

    function getPosition(
        address account,
        address collateral,
        address index,
        bool isLong
    ) override public view returns (
        uint256 collateralAmount,
        uint256 size,
        uint256 lastIncreasedTime,
        uint256 price,
        uint256 fundingRate
    ) {
        uint8 collateralId = _getIdFromAsset(collateral);
        uint8 indexId = _getIdFromAsset(index);

        bytes32 subAccountId = _assembleSubAccountId(
            account, // TODO: set msg.sender to account
            collateralId,
            indexId,
            isLong
        );

        (collateralAmount, size, lastIncreasedTime, price, fundingRate)
            = ILiquidityPool(_liquidityPool).getSubAccount(subAccountId);
    }

    function _getIdFromAsset(address tokenAddress) private view returns (uint8) {
        ILiquidityPool.Asset[] memory assets = ILiquidityPool(_liquidityPool).getAllAssetInfo();
        for (uint256 i = 0; i < assets.length; i++) {
            if (assets[i].tokenAddress == tokenAddress) {
                return assets[i].id;
            }
        }
        revert("asset not found");
    }

    function increasePosition(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) override payable public {
        uint8 collateralId = _getIdFromAsset(collateral);
        uint8 indexId = _getIdFromAsset(index);

        bytes32 subAccountId = _assembleSubAccountId(
            address(this), // TODO: set msg.sender to account
            collateralId,
            indexId,
            isLong
        );

        // ETH
        if (collateralId == 3) {
            console.log("MUX: increasePosition: ETH");
            IOrderBook(_orderBook).placePositionOrder3{value: collateralAmount}(
                subAccountId,
                uint96(collateralAmount),
                uint96(size),
                0, // price
                0, // profitTokenId
                192, // flags
                0,
                0x0,
                IOrderBook.PositionOrderExtra(0, 0, 0, 0)
            );
        } else {
            IERC20(collateral).approve(_orderBook, collateralAmount);

            IOrderBook(_orderBook).placePositionOrder3(
                subAccountId,
                uint96(collateralAmount),
                uint96(size),
                0, // price
                0, // profitTokenId
                192, // flags
                0,
                0x0,
                IOrderBook.PositionOrderExtra(0, 0, 0, 0)
            );
        }
    }

    function decreasePosition(
        address collateral,
        address index,
        // uint256 collateralAmount, // TODO: remove collateralAmount (issue 3)
        uint256 size,
        bool isLong
    ) override payable public {
        uint8 collateralId = _getIdFromAsset(collateral);
        uint8 indexId = _getIdFromAsset(index);

        bytes32 subAccountId = _assembleSubAccountId(
            address(this), // TODO: set msg.sender to account
            collateralId,
            indexId,
            isLong
        );

        IOrderBook(_orderBook).placePositionOrder3(
            subAccountId,
            0, // collateral
            uint96(size),
            0, // price
            0, // profitTokenId
            96, // flags
            0,
            0x0,
            IOrderBook.PositionOrderExtra(0, 0, 0, 0)
        );
    }

    function increaseCollateral(
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong
    ) override payable public {
        uint8 collateralId = _getIdFromAsset(collateral);
        uint8 indexId = _getIdFromAsset(index);

        bytes32 subAccountId = _assembleSubAccountId(
            address(this), // TODO: set msg.sender to account
            collateralId,
            indexId,
            isLong
        );

        IOrderBook(_orderBook).depositCollateral{value: msg.value}(subAccountId, collateralAmount);
    }

    function decreaseCollateral(
        address collateral,
        address index,
        uint256 collateralAmount,
        // uint256 size,
        bool isLong
    ) override payable public {
        uint8 collateralId = _getIdFromAsset(collateral);
        uint8 indexId = _getIdFromAsset(index);

        bytes32 subAccountId = _assembleSubAccountId(
            address(this), // TODO: set msg.sender to account
            collateralId,
            indexId,
            isLong
        );

        IOrderBook(_orderBook).placeWithdrawalOrder(
            subAccountId,
            uint96(collateralAmount),
            0, // profitTokenId
            // TODO: check logic in mux protocol
            false // isProfit
        );
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
