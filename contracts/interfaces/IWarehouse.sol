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

    event LimitOrderRegistered(address indexed owner, uint256 limitOrderId, uint256 pairId, uint256 price, bool isLong, uint256 size);
    event LimitOrderCanceled(address indexed owner, uint256 limitOrderId);
    event LimitOrderExecuted(address indexed keeper, address indexed owner, uint256 limitOrderId);
    event TriggerOrderRegistered(address indexed owner, uint256 triggerOrderId, uint256 pairId, uint256 triggerPrice, bool isLongPosition, uint256 size);
    event TriggerOrderCanceled(address indexed owner, uint256 triggerOrderId);
    event TriggerOrderExecuted(address indexed keeper, address indexed owner, uint256 triggerOrderId);
    event OrderKeeperSet(address indexed orderKeeper, bool status);

    function createLimitOrder(IExchange.LimitOrder memory) external returns (uint256);
    function cancelLimitOrder(uint256 orderIndex) external;
    function createTriggerOrder(IExchange.TriggerOrder memory) external returns (uint256);
    function cancelTriggerOrder(uint256 orderIndex) external;

    function getLimitOrderIndex(address account) external view returns (uint256);
    function getLimitOrder(address account, uint256 orderIndex) external view returns (IExchange.LimitOrder memory);
    function getLimitOrders(address account) external view returns (IExchange.LimitOrder[] memory);
    function getTriggerOrderIndex(address account) external view returns (uint256);
    function getTriggerOrder(address account, uint256 orderIndex) external view returns (IExchange.TriggerOrder memory);
    function getTriggerOrders(address account) external view returns (IExchange.TriggerOrder[] memory);
}