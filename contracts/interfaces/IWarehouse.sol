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
    event TriggerOrderCreated(address indexed account, uint256 indexed orderIndex, IExchange.TriggerOrder triggerOrder);
    event TriggerOrderCanceled(address indexed account, uint256 indexed orderIndex);
    event TriggerOrderExecuted(address indexed account, uint256 indexed orderIndex);
    event OrderKeeperSet(address indexed orderKeeper, bool status);

    function createLimitOrder(IExchange.LimitOrder memory) external;
    function cancelLimitOrder(uint256 orderIndex) external;
    function createTriggerOrder(IExchange.TriggerOrder memory) external;
    function cancelTriggerOrder(uint256 orderIndex) external;

    function getLimitOrderIndex(address account) external view returns (uint256);
    function getLimitOrder(address account, uint256 orderIndex) external view returns (IExchange.LimitOrder memory);
    function getLimitOrders(address account) external view returns (IExchange.LimitOrder[] memory);
    function getTriggerOrderIndex(address account) external view returns (uint256);
    function getTriggerOrder(address account, uint256 orderIndex) external view returns (IExchange.TriggerOrder memory);
    function getTriggerOrders(address account) external view returns (IExchange.TriggerOrder[] memory);
}