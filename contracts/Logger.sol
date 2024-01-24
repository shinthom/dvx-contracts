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
        bool isLong,
        uint256 executionFee,
        uint256 positionFee
    ) external override {
        emit PositionIncreased(
            account,
            adapter,
            collateral,
            index,
            collateralAmount,
            size,
            isLong,
            executionFee,
            positionFee
        );
    }

    function logDecreasePosition(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 size,
        bool isLong,
        uint256 executionFee
    ) external override {
        emit PositionDecreased(
            account,
            adapter,
            collateral,
            index,
            size,
            isLong,
            executionFee
        );
    }

    function logIncreaseCollateral(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 executionFee
    ) external override {
        emit CollateralIncreased(
            account,
            adapter,
            collateral,
            index,
            collateralAmount,
            executionFee
        );
    }

    function logDecreaseCollateral(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 executionFee
    ) external override {
        emit CollateralDecreased(
            account,
            adapter,
            collateral,
            index,
            collateralAmount,
            executionFee
        );
    }

    function logCreateLimitOrder(
        address account,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 executionFee,
        uint256 triggerPrice,
        uint256 acceptablePrice
    ) external override {
        emit LimitOrderCreated(
            account,
            collateral,
            index,
            collateralAmount,
            size,
            isLong,
            executionFee,
            triggerPrice,
            acceptablePrice
        );
    }

    function logCancelLimitOrder(
        address account,
        uint256 orderId,
        uint256 executionFee
    ) external override {
        emit LimitOrderCanceled(account, orderId, executionFee);
    }

    function logExecuteLimitOrder(
        address account,
        uint256 orderId,
        uint256 executionFee
    ) external override {
        emit LimitOrderExecuted(account, orderId, executionFee);
    }
}
