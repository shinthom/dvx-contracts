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
    function createTriggerOrder(IExchange.TriggerOrder memory) external returns (uint256);
    function cancelLimitOrder(uint256 id) external;
    function cancelTriggerOrder(uint256 id) external;
    // function createLimitOrder(IExchange.LimitOrder memory) external returns (uint256);
    // function createTriggerOrder(IExchange.TriggerOrder memory) external returns (uint256);
    // function cancelLimitOrder(uint256 limitOrderId) external;
    // function executeLimitOrder(uint256 limitOrderId) external;
    // function cancelTriggerOrder(uint256 triggerOrderId) external;
    // function executeTriggerOrder(uint256 triggerOrderId) external;
    // function swap(address tokenIn, address tokenOut, uint256 amount) payable external returns (uint256);
}