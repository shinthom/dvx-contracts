// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

// prettier-ignore

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
        uint256 limitOrderId;
        LimitOrderState state;
        address account;
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
        uint256 triggerOrderId;
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

    event LimitOrderCreated(
        address indexed account,
        uint256 indexed limitOrderId,
        uint256 fee
    );
    event LimitOrderCanceled(
        address indexed account,
        uint256 indexed limitOrderId
    );
    event LimitOrderExecuted(
        address indexed account,
        uint256 indexed limitOrderId
    );

    event TriggerOrderCreated(
        address indexed account,
        bytes32 indexed positionKey,
        uint256 indexed triggerOrderId
    );
    event TriggerOrderCanceled(
        address indexed account,
        bytes32 indexed positionKey,
        uint256 indexed triggerOrderId
    );
    event TriggerOrderExecuted(
        address indexed account,
        bytes32 indexed positionKey,
        uint256 indexed triggerOrderId
    );

    function setExchange(address exchange) external;

    function createLimitOrder(
        address account,
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
        address account,
        uint256 limitOrderId
    ) external returns (IWarehouse.LimitOrder memory limitOrder);
    function executeLimitOrder(
        address account,
        address adapter,
        uint256 limitOrderId
    ) external payable returns (IWarehouse.LimitOrder memory limitOrder);
    function executeLimitOrderMulti(
        address account,
        address[] calldata adapters,
        uint256 limitOrderId
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
        uint256 triggerOrderId
    ) external;
    function executeTriggerOrder(
        bytes32 positionKey,
        uint256 triggerOrderId
    ) external returns (IWarehouse.TriggerOrder memory triggerOrder);

    function getPositionKey(
        address account,
        address adapter,
        address collateral,
        address index,
        bool isLong
    ) external view returns (bytes32);
    function getLimitOrders(
        address account
    ) external view returns (LimitOrder[] memory);
    function getLimitOrder(
        address account,
        uint256 limitOrderId
    ) external view returns (LimitOrder memory);
    function getTriggerOrders(
        bytes32 positionKey
    ) external view returns (TriggerOrder[] memory);
    function getTriggerOrder(
        bytes32 positionKey,
        uint256 triggerOrderId
    ) external view returns (TriggerOrder memory);
}
