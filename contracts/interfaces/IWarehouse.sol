// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IWarehouse {
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

    enum TriggerOrderType { TakeProfit, StopLoss }
    enum TriggerOrderState {
        Pending,
        Executed,
        Canceled
    }
    function getTriggerOrders(bytes32 key) external view returns (TriggerOrder[] memory);
    function getTriggerOrder(bytes32 key, uint256 id) external view returns (TriggerOrder memory);
    function getPositionKey(
        address account,
        address adapter,
        address collateral,
        address index,
        bool isLong
    ) external view returns (bytes32);
    function createTriggerOrder(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        TriggerOrderType orderType,
        uint256 triggerPrice,
        uint256 acceptablePrice
    ) external payable;
    function cancelTriggerOrder(bytes32 positionKey, uint256 id) external;
    function executeTriggerOrder(address account, bytes32 positionKey, uint256 id) external payable;
}
