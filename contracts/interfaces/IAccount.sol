// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IWarehouse} from "./IWarehouse.sol";

// prettier-ignore
interface IAccount {
    function initialize(
        address _owner,
        address _exchange,
        address _delegatedAccount,
        uint256 _delegatedAccountExpiration
    ) external;
    function upgrade(uint256 version) external;
    function renewDelegatedAccount(
        address _delegatedAccount,
        uint256 _delegatedAccountExpiration
    ) external;

    function deposit(
        address token,
        uint256 amount,
        uint256 networkFee,
        uint256 deadline,
        bytes calldata signature
    ) external;
    function depositPermit(
        address token,
        uint256 amount,
        uint8 v,
        bytes32 r,
        bytes32 s,
        uint256 networkFee,
        uint256 deadline,
        bytes calldata signature
    ) external;
    function withdraw(
        address token,
        address to,
        uint256 amount,
        uint256 networkFee,
        uint256 deadline,
        bytes calldata signature
    ) external;
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 networkFee,
        uint256 deadline,
        bytes calldata signature
    ) external;

    function increasePosition(
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 acceptablePrice,
        uint256 networkFee,
        uint256 deadline,
        bytes calldata signature
    ) external payable;
    function swapAndIncreasePosition(
        address adapter,
        address[] calldata path,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 acceptablePrice,
        uint256 networkFee,
        uint256 deadline,
        bytes calldata signature
    ) external payable;
    function decreasePosition(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        uint256 acceptablePrice,
        uint256 networkFee,
        uint256 deadline,
        bytes calldata signature
    ) external payable;
    function increaseCollateral(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        address tokenIn,
        uint256 amountIn,
        uint256 networkFee,
        uint256 deadline,
        bytes calldata signature
    ) external payable;
    function decreaseCollateral(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 collateralAmount,
        uint256 networkFee,
        uint256 deadline,
        bytes calldata signature
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
        uint256 networkFee,
        uint256 executionFee,
        uint256 deadline,
        bytes calldata signature
    ) external payable;
    function cancelLimitOrder(
        uint256 limitOrderId,
        uint256 networkFee,
        uint256 deadline,
        bytes calldata signature
    ) external payable;
    function executeLimitOrder(
        uint256 limitOrderId,
        address adapter
    ) external payable;
    function executeTriggerOrder(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        IWarehouse.TriggerOrderType orderType,
        uint256 triggerPrice,
        uint256 acceptablePrice,
        uint256 networkFee
    ) external payable;

    function beacon() external view returns (address);
    function version() external view returns (uint256);

    function owner() external view returns (address);
    function exchange() external view returns (address);
    function delegatedAccount() external view returns (address);
    function delegatedAccountExpiration() external view returns (uint256);

    function getBalance(address token) external view returns (uint256);
    function getLockedBalance(address token) external view returns (uint256);
    function getWithdrawableBalance(
        address token
    ) external view returns (uint256);
    function getFeeDebt(address token) external view returns (uint256);
}
