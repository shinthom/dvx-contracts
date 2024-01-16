// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

interface IExchange {
    enum OrderType {
        IncreasePosition,
        DecreasePosition,
        IncreaseCollateral,
        DecreaseCollateral
    }

    struct MarketOrder {
        address[] path;
        address index;
        uint256 collateralAmount;
        uint256 size;
        bool isLong;
    }

    enum TriggerOrderType {
        TakeProfit,
        StopLoss
    }

    enum TriggerOrderState {
        Pending,
        Executed,
        Canceled
    }

    enum LimitOrderState {
        Pending,
        Executed,
        Canceled
    }

    struct LimitOrder {
        uint256 id;
        LimitOrderState state;
        address collateral;
        address index;
        uint256 collateralAmount;
        uint256 size;
        bool isLong;
        uint256 triggerPrice;
        uint256 acceptablePrice;
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
        TriggerOrderType orderType;
        uint256 triggerPrice;
        uint256 acceptablePrice;
        uint256 createdAt;
    }

    event AccountCreated(address indexed owner, address indexed account);

    event StableTokenSet(address indexed token, bool isStable);

    event AdapterRegistered(address indexed adapter, bool isRegistered);

    event TierSet(uint8 indexed tierId, uint256 discount);

    event ReferralTierSet(address indexed referral, uint8 indexed tierId);

    event OpenPositionFeeRateSet(uint256 indexed fee);

    event LimitOrderCreated(address indexed account, uint256 indexed id);

    event LimitOrderCanceled(address indexed account, uint256 indexed id);

    event LimitOrderExecuted(address indexed account, uint256 indexed id);

    event TriggerOrderCreated(
        address indexed account,
        bytes32 indexed positionKey,
        uint256 indexed id
    );

    event TriggerOrderCanceled(
        address indexed account,
        bytes32 indexed positionKey,
        uint256 indexed id
    );

    event TriggerOrderExecuted(
        address indexed account,
        bytes32 indexed positionKey,
        uint256 indexed id
    );

    event Withdrawn(
        address indexed account,
        address indexed token,
        uint256 amount
    );

    function isStableToken(address token) external view returns (bool);

    function lockedBalances(
        address account,
        address token
    ) external view returns (uint256);

    function getPositionKey(
        address account,
        address adapter,
        address collateral,
        address index,
        bool isLong
    ) external view returns (bytes32);

    function getTriggerOrders(
        bytes32 positionKey
    ) external view returns (TriggerOrder[] memory);

    function getTriggerOrder(
        bytes32 positionKey,
        uint256 id
    ) external view returns (TriggerOrder memory);

    function getLimitOrders(
        address account
    ) external view returns (LimitOrder[] memory);

    function getLimitOrder(
        address account,
        uint256 id
    ) external view returns (LimitOrder memory);

    function getOpenPositionFee(uint256 amount) external view returns (uint256);

    function createAccount() external returns (address account);

    function createAccountAndDeposit(
        address token,
        uint256 amount
    ) external payable returns (address account);

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external payable returns (uint256);

    function executeMarketOrder(
        address account,
        OrderType orderType,
        address adapter,
        address[] memory path,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 executionFee
    ) external payable;
}
