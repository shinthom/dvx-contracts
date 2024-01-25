// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

interface ILogger {
    event Deposited(
        address indexed account,
        address indexed token,
        uint256 amount
    );

    event Withdrawn(
        address indexed account,
        address indexed token,
        uint256 amount
    );

    function logDeposit(
        address account,
        address token,
        uint256 amount
    ) external;

    function logWithdraw(
        address account,
        address token,
        uint256 amount
    ) external;

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
}
