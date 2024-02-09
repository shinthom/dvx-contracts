// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {ILogger} from "../interfaces/ILogger.sol";

contract Logger is ILogger {
    function logRenewDelegatedAccount(
        address account,
        address delegatedWallet,
        uint256 expiration
    ) external override {
        emit DelegatedAccountRenewed(account, delegatedWallet, expiration);
    }

    function logDeposit(
        address account,
        address token,
        uint256 amount,
        uint256 executionFee
    ) external override {
        emit Deposited(account, token, amount, executionFee);
    }

    function logWithdraw(
        address account,
        address token,
        uint256 amount,
        uint256 executionFee,
        uint256 feeDebtRepaid
    ) external override {
        emit Withdrawn(account, token, amount, executionFee, feeDebtRepaid);
    }

    function logSwap(
        address account,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 executionFee,
        uint256 swapFee
    ) external override {
        emit Swapped(account, tokenIn, tokenOut, amountIn, amountOut, executionFee, swapFee);
    }

    function logIncreasePosition(
        uint256 marketOrderId,
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 acceptablePrice,
        uint256 executionFee,
        uint256 positionFee
    ) external override {
        emit PositionIncreased(
            marketOrderId,
            account,
            adapter,
            collateral,
            index,
            collateralAmount,
            size,
            isLong,
            acceptablePrice,
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
        uint256 price,
        uint256 acceptablePrice
    ) external override {
        emit PositionDecreased(
            account,
            adapter,
            collateral,
            index,
            size,
            isLong,
            price,
            acceptablePrice
        );
    }

    function logIncreaseCollateral(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong
    ) external override {
        emit CollateralIncreased(
            account,
            adapter,
            collateral,
            index,
            collateralAmount,
            isLong
        );
    }

    function logDecreaseCollateral(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong
    ) external override {
        emit CollateralDecreased(
            account,
            adapter,
            collateral,
            index,
            collateralAmount,
            isLong
        );
    }

    function logAddAcmmMargin(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 marginAmount,
        bool isLong
    ) external override {
        emit AcmmMarginAdded(
            account,
            adapter,
            collateral,
            index,
            marginAmount,
            isLong
        );
    }

    function logSubAcmmMargin(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 marginAmount,
        bool isLong
    ) external override {
        emit AcmmMarginSubtracted(
            account,
            adapter,
            collateral,
            index,
            marginAmount,
            isLong
        );
    }
}
