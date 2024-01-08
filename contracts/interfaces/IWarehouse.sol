// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./IExchange.sol";

interface IWarehouse {
    struct WarehouseLimitOrder {
        address owner;
        uint8 status;
        IExchange.LimitOrder limitOrder;
    }
    struct WarehouseTriggerOrder {
        address owner;
        uint8 status;
        IExchange.TriggerOrder triggerOrder;
    }

    event LimitOrderCreated(address indexed account, uint256 indexed orderIndex, IExchange.LimitOrder limitOrder);
    event LimitOrderCanceled(address indexed account, uint256 indexed orderIndex);
    event LimitOrderExecuted(address indexed account, uint256 indexed orderIndex);
    // event TriggerOrderCreated(address indexed account, uint256 indexed orderIndex, IExchange.TriggerOrder triggerOrder);
    event TriggerOrderCreated(address indexed account, bytes32 indexed positionKey, uint256 indexed id);
    event TriggerOrderCanceled(address indexed account, bytes32 indexed positionKey, uint256 indexed id);
    event TriggerOrderExecuted(address indexed account, bytes32 indexed positionKey, uint256 indexed id);
    event OrderKeeperSet(address indexed orderKeeper, bool status);

    function getPositionKey(
        address adapter,
        address collateral,
        address index,
        bool isLong
    ) external view returns (bytes32);
    function getLimitOrderIndex(address account) external view returns (uint256);
    function getLimitOrder(address account, uint256 orderIndex) external view returns (IExchange.LimitOrder memory);
    function getLimitOrders(address account) external view returns (IExchange.LimitOrder[] memory);
    function getTriggerOrders(bytes32 positionKey) external view returns (IExchange.TriggerOrder[] memory);
    function getTriggerOrder(bytes32 positionKey, uint256 id) external view returns (IExchange.TriggerOrder memory);
    function getTriggerOrderSize(bytes32 positionKey) external view returns (uint256);
    function createLimitOrder(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 price
    ) external;
    function cancelLimitOrder(uint256 orderIndex) external;
    function createTriggerOrder(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        uint256 tpPrice,
        uint256 slPrice
    ) external;
    function cancelTriggerOrder(bytes32 positionKey, uint256 id) external;

    // function getLimitOrderIndex(address account) external view returns (uint256);
    // function getLimitOrder(address account, uint256 orderIndex) external view returns (IExchange.LimitOrder memory);
    // function getLimitOrders(address account) external view returns (IExchange.LimitOrder[] memory);
    // function getTriggerOrderIndex(address account) external view returns (uint256);
    // function getTriggerOrder(address account, uint256 orderIndex) external view returns (IExchange.TriggerOrder memory);
    // function getTriggerOrders(address account) external view returns (IExchange.TriggerOrder[] memory);
}