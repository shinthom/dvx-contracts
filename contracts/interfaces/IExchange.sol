// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IExchange {
    enum OrderType {
        IncreasePosition,
        DecreasePosition,
        IncreaseCollateral,
        DecreaseCollateral
    }
    enum TriggerOrderState {
        Pending,
        Executed,
        Canceled
    }

    struct Fee {
        uint256 depositFeeBasisPoints;
        uint256 withdrawFeeBasisPoints;
        uint256 swapFeeBasisPoints;
        uint256 positionFeeBasisPoints;
        uint256 marginFeeBasisPoints;
        uint256 marginAdjustmentBasisPoints;
    }
    struct PositionOrder {
        OrderType orderType;
        address[] path;
        address index;
        uint256 collateralAmount;
        uint256 size;
        bool isLong;
    }
    struct LimitOrder {
        address collateral;
        address index;
        uint256 collateralAmount;
        uint256 size;
        bool isLong;
        uint256 price; // trigger
        // todo: slippageTolerance
        uint256 createdAt;
    }
    struct TriggerOrder {
        uint256 id;
        TriggerOrderState state;
        address account;
        address adapter;
        address collateral;
        address index;
        bool isLong;
        uint256 size;
        uint256 tpPrice;
        uint256 tpPriceBound;
        uint256 slPrice;
        uint256 slPriceBound;
        uint256 createdAt;
    }

    event AccountCreated(address indexed wallet, address indexed account);
    event AdapterRegistered(address indexed adapter);
    event AdapterUnregistered(address indexed adapter);
    event TokenRegistered(address indexed adapter);
    event TokenUnregistered(address indexed adapter);
    event MarginKeeperSet(address indexed keeper, bool status);
    event MarketOrderCreated(address indexed account, address[] adapters, PositionOrder[] orders);
    event FeeSet(Fee fee);

    function account(address wallet) external view returns (address);
    function totalAccount() external view returns (uint256);
    function warehouse() external view returns (address);
    function isMarginKeeper(address keeper) external view returns (bool);
    function getAllRegisteredAdapters() external view returns (address[] memory);
    function getAllRegisteredTokens() external view returns (address[] memory);
    function isRegisteredToken(address token) external view returns (bool);
    function isRegisteredAdapter(address adapter) external view returns (bool);
    function isStableToken(address token) external view returns (bool);
    function fee() external view returns (Fee memory);

    function setFee(Fee memory newFee) external;
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (uint256 amountOut);
    function quoteExactOutputSingle(
        address tokenIn,
        address tokenOut,
        uint256 amountOut
    ) external returns (uint256 amountIn);
    function swap(address tokenIn, address tokenOut, uint256 amount) payable external returns (uint256);
    function createAccount() external returns (address);
    function createAccountAndDeposit(address token, uint256 amount) payable external returns (address);
    function setMarginKeeper(address keeper, bool status) external;
    function registerAdapter(address adapter) external;
    function unregisterAdapter(address adapter) external;
    function registerToken(address token) external;
    function unregisterToken(address token) external;
}