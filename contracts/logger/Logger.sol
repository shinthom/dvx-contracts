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
        uint256 networkFee
    ) external override {
        emit Deposited(account, token, amount, networkFee);
    }

    function logWithdraw(
        address account,
        address to,
        address token,
        uint256 amount,
        uint256 networkFee
    ) external override {
        emit Withdrawn(account, to, token, amount, networkFee);
    }

    function logSwap(
        address account,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 networkFee,
        uint256 swapFee
    ) external override {
        emit Swapped(
            account,
            tokenIn,
            tokenOut,
            amountIn,
            amountOut,
            networkFee,
            swapFee
        );
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
        uint256 networkFee,
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
            networkFee,
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
        uint256 acceptablePrice,
        uint256 networkFee
    ) external override {
        emit PositionDecreased(
            account,
            adapter,
            collateral,
            index,
            size,
            isLong,
            acceptablePrice,
            networkFee
        );
    }

    function logIncreaseCollateral(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong,
        uint256 networkFee
    ) external override {
        emit CollateralIncreased(
            account,
            adapter,
            collateral,
            index,
            collateralAmount,
            isLong,
            networkFee
        );
    }

    function logDecreaseCollateral(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong,
        uint256 networkFee
    ) external override {
        emit CollateralDecreased(
            account,
            adapter,
            collateral,
            index,
            collateralAmount,
            isLong,
            networkFee
        );
    }

    function logAddAcmmMargin(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 marginAmount,
        bool isLong,
        uint256 addAcmmMarginFee
    ) external override {
        emit AcmmMarginAdded(
            account,
            adapter,
            collateral,
            index,
            marginAmount,
            isLong,
            addAcmmMarginFee
        );
    }

    function logSubAcmmMargin(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 marginAmount,
        bool isLong,
        uint256 subAcmmMarginFee
    ) external override {
        emit AcmmMarginSubtracted(
            account,
            adapter,
            collateral,
            index,
            marginAmount,
            isLong,
            subAcmmMarginFee
        );
    }
}
