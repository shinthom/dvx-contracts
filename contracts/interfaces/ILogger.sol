// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

interface ILogger {
    event PositionIncreased(
        address indexed account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    );

    event PositionDecreased(
        address indexed account,
        address adapter,
        address collateral,
        address index,
        uint256 size,
        bool isLong
    );

    event CollateralIncreased(
        address indexed account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount
    );

    event CollateralDecreased(
        address indexed account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount
    );

    event LimitOrderCreated(
        address indexed account,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 executionFee,
        uint256 triggerPrice,
        uint256 acceptablePrice
    );

    event LimitOrderCanceled(
        address indexed account,
        uint256 orderId,
        uint256 executionFee
    );

    event LimitOrderExecuted(
        address indexed account,
        uint256 orderId,
        uint256 executionFee
    );

    function logIncreasePosition(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) external;

    function logDecreasePosition(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 size,
        bool isLong
    ) external;

    function logIncreaseCollateral(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount
    ) external;

    function logDecreaseCollateral(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount
    ) external;

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
    ) external;

    function logCancelLimitOrder(
        address account,
        uint256 orderId,
        uint256 executionFee
    ) external;

    function logExecuteLimitOrder(
        address account,
        uint256 orderId,
        uint256 executionFee
    ) external;
}
