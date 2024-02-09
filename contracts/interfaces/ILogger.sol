// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

// prettier-ignore

interface ILogger {
    event DelegatedAccountRenewed(
        address indexed account,
        address indexed delegatedWallet,
        uint256 expiration
    );

    event Deposited(
        address indexed account,
        address indexed token,
        uint256 amount,
        uint256 networkFee
    );
    event Withdrawn(
        address indexed account,
        address indexed token,
        uint256 amount,
        uint256 networkFee
    );
    event Swapped(
        address indexed account,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 networkFee,
        uint256 swapFee
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
        uint256 acceptablePrice,
        uint256 networkFee,
        uint256 positionFee
    );
    event PositionDecreased(
        address indexed account,
        address adapter,
        address collateral,
        address index,
        uint256 size,
        bool isLong,
        uint256 acceptablePrice,
        uint256 networkFee
    );
    event CollateralIncreased(
        address indexed account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong,
        uint256 networkFee
    );
    event CollateralDecreased(
        address indexed account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong,
        uint256 networkFee
    );

    event AcmmMarginAdded(
        address indexed account,
        address adapter,
        address collateral,
        address index,
        uint256 marginAmount,
        bool isLong
    );
    event AcmmMarginSubtracted(
        address indexed account,
        address adapter,
        address collateral,
        address index,
        uint256 marginAmount,
        bool isLong
    );

    function logRenewDelegatedAccount(
        address account,
        address delegatedWallet,
        uint256 expiration
    ) external;

    function logDeposit(
        address account,
        address token,
        uint256 amount,
        uint256 networkFee
    ) external;
    function logWithdraw(
        address account,
        address token,
        uint256 amount,
        uint256 networkFee
    ) external;
    function logSwap(
        address account,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 networkFee,
        uint256 swapFee
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
        uint256 acceptablePrice,
        uint256 networkFee,
        uint256 positionFee
    ) external;
    function logDecreasePosition(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 size,
        bool isLong,
        uint256 acceptablePrice,
        uint256 networkFee
    ) external;
    function logIncreaseCollateral(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong,
        uint256 networkFee
    ) external;
    function logDecreaseCollateral(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong,
        uint256 networkFee
    ) external;

    function logAddAcmmMargin(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 marginAmount,
        bool isLong
    ) external;
    function logSubAcmmMargin(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 marginAmount,
        bool isLong
    ) external;
}
