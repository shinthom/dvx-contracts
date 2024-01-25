// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

interface IWarehouse {
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
        uint256 orderId;
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
        uint256 orderId;
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
        uint256 executionFee;
        uint256 createdAt;
    }

    event ExchangeSet(address indexed exchange);

    event OrderKeeperSet(address indexed orderKeeper, bool isActive);

    event PriceMinDeviationSet(uint256 indexed deviation);

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

    function createLimitOrder(
        address account,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 triggerPrice,
        uint256 acceptablePrice
    ) external payable;

    function cancelLimitOrder(
        address account,
        uint256 id
    ) external returns (IWarehouse.LimitOrder memory limitOrder);

    function executeLimitOrder(
        address account,
        address adapter,
        uint256 id
    ) external payable returns (IWarehouse.LimitOrder memory limitOrder);

    function createTriggerOrder(
        address account,
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        TriggerOrderType orderType,
        uint256 triggerPrice, // 1e18
        uint256 acceptablePrice, // 1e18
        uint256 adapterExecutionFee
    ) external payable;

    function cancelTriggerOrder(
        address account,
        bytes32 positionKey,
        uint256 id
    ) external;

    function executeTriggerOrder(
        bytes32 positionKey,
        uint256 id
    ) external returns (IWarehouse.TriggerOrder memory triggerOrder);
}
