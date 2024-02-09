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
        uint256 amount
    ) external override {
        emit Deposited(account, token, amount);
    }

    function logWithdraw(
        address account,
        address token,
        uint256 amount
    ) external override {
        emit Withdrawn(account, token, amount);
    }

    function logSwap(
        address account,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    ) external override {
        emit Swapped(account, tokenIn, tokenOut, amountIn, amountOut);
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
        uint256 price,
        uint256 acceptablePrice
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
            price,
            acceptablePrice
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
