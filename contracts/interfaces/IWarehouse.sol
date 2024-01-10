// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IExchange } from  "./IExchange.sol";
import { IQuoter } from  "./IQuoter.sol";

interface IWarehouse {
    event LimitOrderCreated(address indexed account, uint256 indexed orderIndex, IExchange.LimitOrder limitOrder);
    event LimitOrderCanceled(address indexed account, uint256 indexed orderIndex);
    event LimitOrderExecuted(address indexed account, uint256 indexed orderIndex);
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
    function getTriggerOrderLength(bytes32 positionKey) external view returns (uint256);
    function getTriggerOrderSize(bytes32 positionKey) external view returns (uint256);
    function isOrderKeeper(address keeper) external view returns (bool);
    function setOrderKeeper(address keeper, bool status) external;
    function createLimitOrder(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 price
    ) external;
    function cancelLimitOrder(uint256 orderIndex) external;
    function executeLimitOrder(
        address account,
        uint256 orderIndex,
        IQuoter.Answer[] memory answers
    ) external payable;
    function createTriggerOrder(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        uint256 tpPrice,
        uint256 slPrice
    ) external payable;
    function cancelTriggerOrder(bytes32 positionKey, uint256 id) external;
    function executeTriggerOrder(
        address account,
        bytes32 positionKey,
        uint256 id
    ) external payable;
}