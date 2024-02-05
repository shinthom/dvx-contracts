// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IWarehouse} from "./IWarehouse.sol";

// prettier-ignore
interface IAccount {
    struct DelegatedAccount {
        address wallet;
        uint256 expiration;
    }

    function owner() external view returns (address);
    function exchange() external view returns (address);

    function initialize(
        address _owner,
        address _exchange,
        address _delegatedWallet,
        uint256 _expiration
    ) external;
    function renewDelegatedAccount(
        address _delegatedWallet,
        uint256 _expiration
    ) external;

    function deposit(
        address token,
        uint256 amount,
        uint256 executionFee,
        bytes calldata signature
    ) external;
    function deposit(
        address token,
        uint256 amount,
        uint8 v,
        bytes32 r,
        bytes32 s,
        uint256 executionFee,
        bytes calldata signature
    ) external;
    function withdraw(
        address token,
        uint256 amount,
        uint256 executionFee,
        bytes calldata signature
    ) external;
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 executionFee,
        bytes calldata signature
    ) external returns (uint256 amountOut);

    function increasePosition(
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 acceptablePrice,
        uint256 executionFee,
        bytes calldata signature
    ) external payable;
    function increasePositionMulti(
        address[] calldata adapters,
        address collateral,
        address index,
        uint256[] calldata collateralAmounts,
        uint256[] calldata sizes,
        bool isLong,
        uint256 acceptablePrice,
        uint256[] calldata executionFees
        // bytes calldata signature (todo: stack too deep)
    ) external payable;
    function decreasePosition(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        uint256 executionFee,
        bytes calldata signature
    ) external payable;
    function increaseCollateral(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        address tokenIn,
        uint256 amountIn,
        uint256 executionFee,
        bytes calldata signature
    ) external payable;
    function decreaseCollateral(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 collateralAmount,
        uint256 executionFee,
        bytes calldata signature
    ) external payable;

    function addAcmmMargin(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        address[] calldata marginTokens,
        uint256[] calldata marginAmounts
    ) external payable;
    function subAcmmMargin(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 profitAmount
    ) external payable;
    function collectFeeDebt(address token, uint256 amount) external;

    function createLimitOrder(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 triggerPrice,
        uint256 acceptablePrice,
        uint256 executionFee,
        bytes calldata signature
    ) external payable;
    function cancelLimitOrder(
        uint256 limitOrderId,
        uint256 executionFee,
        bytes calldata signature
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
        uint256 triggerOrderId,
        uint256 executionFee
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
    function getDebt(address token) external view returns (uint256);
}
