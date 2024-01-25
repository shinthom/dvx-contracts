// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {ILogger} from "./interfaces/ILogger.sol";

contract Logger is ILogger {
    function logIncreasePosition(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) external override {
        emit PositionIncreased(
            account,
            adapter,
            collateral,
            index,
            collateralAmount,
            size,
            isLong
        );
    }

    function logDecreasePosition(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 size,
        bool isLong
    ) external override {
        emit PositionDecreased(
            account,
            adapter,
            collateral,
            index,
            size,
            isLong
        );
    }

    function logIncreaseCollateral(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount
    ) external override {
        emit CollateralIncreased(
            account,
            adapter,
            collateral,
            index,
            collateralAmount
        );
    }

    function logDecreaseCollateral(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount
    ) external override {
        emit CollateralDecreased(
            account,
            adapter,
            collateral,
            index,
            collateralAmount
        );
    }
}
