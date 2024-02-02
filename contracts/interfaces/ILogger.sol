// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

// prettier-ignore

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
    event Swapped(
        address indexed account,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    event PositionIncreased(
        uint256 indexed marketOrderId,
        address indexed account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 entryPrice
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

    event AcmmMarginAdded(
        address indexed account,
        address adapter,
        address collateral,
        address index,
        uint256 marginAmount
    );
    event AcmmMarginSubtracted(
        address indexed account,
        address adapter,
        address collateral,
        address index,
        uint256 marginAmount
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
    function logSwap(
        address account,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    ) external;

    function logIncreasePosition(
        uint256 marketOrderId,
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 entryPrice
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

    function logAddAcmmMargin(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 marginAmount
    ) external;
    function logSubAcmmMargin(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 marginAmount
    ) external;
}
