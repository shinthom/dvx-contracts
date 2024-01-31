// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IWarehouse} from "./IWarehouse.sol";

// prettier-ignore
interface IAccount {
    function owner() external view returns (address);
    function exchange() external view returns (address);

    function deposit(address token, uint256 amount) external;
    function withdraw(address token, uint256 amount) external;
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (uint256 amountOut);

    function increasePosition(
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 executionFee
    ) external payable;
    function increasePositionMulti(
        address[] calldata adapters,
        address collateral,
        address index,
        uint256[] calldata collateralAmounts,
        uint256[] calldata sizes,
        bool isLong,
        uint256[] calldata executionFees
    ) external payable;
    function decreasePosition(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        uint256 executionFee
    ) external payable;
    function increaseCollateral(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        address tokenIn,
        uint256 amountIn,
        uint256 executionFee
    ) external payable;
    function decreaseCollateral(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 collateralAmount,
        uint256 executionFee
    ) external payable;

    function addMargin(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        address[] calldata marginTokens,
        uint256[] calldata marginAmounts
    ) external payable;
    function realizeProfit(
        address adapter,
        address collateral,
        address index,
        uint256 profitAmount,
        bool isLong
    ) external payable;

    function createLimitOrder(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 executionFee,
        uint256 triggerPrice,
        uint256 acceptablePrice
    ) external payable;
    function cancelLimitOrder(
        uint256 limitOrderId,
        uint256 executionFee
    ) external payable;
    function executeLimitOrder(
        uint256 limitOrderId,
        address adapter
    ) external payable;
    function executeLimitOrderMulti(
        uint256 limitOrderId,
        address[] calldata adapters,
        uint256[] calldata collateralAmounts,
        uint256[] calldata sizes
    ) external payable;

    function createTriggerOrder(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        IWarehouse.TriggerOrderType orderType,
        uint256 triggerPrice,
        uint256 acceptablePrice,
        uint256 executionFee
    ) external payable;
    function cancelTriggerOrder(
        bytes32 positionKey,
        uint256 triggerOrderId
    ) external;
    function executeTriggerOrder(
        bytes32 positionKey,
        uint256 triggerOrderId
    ) external payable;

    function getBalance(address token) external view returns (uint256);
    function getLockedBalance(address token) external view returns (uint256);
    function getWithdrawableBalance(
        address token
    ) external view returns (uint256);
}
