// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { IAdapter } from "./interfaces/IAdapter.sol";
import { IAccount } from "./interfaces/IAccount.sol";
import { IQuoter } from "./interfaces/IQuoter.sol";
import { IExchange } from "./interfaces/IExchange.sol";
import { IWarehouse } from "./interfaces/IWarehouse.sol";

contract Warehouse is IWarehouse, OwnableUpgradeable, UUPSUpgradeable {
    mapping(address => bool) private _orderKeepers;

    mapping(address => uint256) private _limitOrderIndex;
    mapping(address => uint256) private _triggerOrderIndex;
    mapping(address => mapping(uint256 => IExchange.LimitOrder)) private _limitOrders;
    mapping(address => mapping(uint256 => IExchange.TriggerOrder)) private _triggerOrders;

    modifier onlyOrderKeeper() {
        require(
          _orderKeepers[_msgSender()],
          "Warehouse: not order keeper"
        );
        _;
    }

    function initialize() public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function setOrderKeeper(address keeper, bool status) external onlyOwner {
        _orderKeepers[keeper] = status;
        emit OrderKeeperSet(keeper, status);
    }

    function isOrderKeeper(address keeper) public view returns (bool) { return _orderKeepers[keeper]; }

    function getLimitOrderIndex(address account) override public view returns (uint256) { return _limitOrderIndex[account]; }

    function getLimitOrder(address account, uint256 orderIndex) override public view returns (IExchange.LimitOrder memory) {
        return _limitOrders[account][orderIndex];
    }

    function getLimitOrders(address account) override public view returns (IExchange.LimitOrder[] memory) {
        uint256 orderIndex = _limitOrderIndex[account];
        IExchange.LimitOrder[] memory limitOrders = new IExchange.LimitOrder[](orderIndex);
        for (uint256 i = 0; i < orderIndex; i++) {
            limitOrders[i] = _limitOrders[account][i];
        }
        return limitOrders;
    }

    function getTriggerOrderIndex(address account) override public view returns (uint256) { return _triggerOrderIndex[account]; }

    function getTriggerOrder(address account, uint256 orderIndex) override public view returns (IExchange.TriggerOrder memory) {
        return _triggerOrders[account][orderIndex];
    }

    function getTriggerOrders(address account) override public view returns (IExchange.TriggerOrder[] memory) {
        uint256 orderIndex = _triggerOrderIndex[account];
        IExchange.TriggerOrder[] memory triggerOrders = new IExchange.TriggerOrder[](orderIndex);
        for (uint256 i = 0; i < orderIndex; i++) {
            triggerOrders[i] = _triggerOrders[account][i];
        }
        return triggerOrders;
    }

    function createLimitOrder(IExchange.LimitOrder calldata limitOrder) override public {
        uint256 orderIndex = _limitOrderIndex[msg.sender];
        _limitOrderIndex[msg.sender] = orderIndex + 1;
        _limitOrders[msg.sender][orderIndex] = limitOrder;
        emit LimitOrderCreated(msg.sender, orderIndex, limitOrder);
    }

    function cancelLimitOrder(uint256 orderIndex) override external {
        IExchange.LimitOrder storage limitOrder = _limitOrders[msg.sender][orderIndex];
        require(
            limitOrder.index != address(0),
            "Warehouse: non-existent limit order"
        );
        delete _limitOrders[msg.sender][orderIndex];
        emit LimitOrderCanceled(msg.sender, orderIndex);
    }

    function executeLimitOrder(
        address account,
        uint256 orderIndex,
        IQuoter.Answer[] memory answers
    ) external payable onlyOrderKeeper {
        IExchange.LimitOrder storage limitOrder = _limitOrders[account][orderIndex];
        require(
            limitOrder.index != address(0),
            "Warehouse: non-existent limit order"
        );
        delete _limitOrders[account][orderIndex];
        emit LimitOrderExecuted(account, orderIndex);

        address[] memory adapters = new address[](answers.length);
        IExchange.PositionOrder[] memory positionOrders = new IExchange.PositionOrder[](answers.length);
        for (uint256 i = 0; i < answers.length; i++) {
            adapters[i] = answers[i].adapter;
            positionOrders[i] = answers[i].positionOrder;
        }
        IAccount(account).executeLimitOrder{value: msg.value}(adapters, positionOrders);
    }

    function createTriggerOrder(IExchange.TriggerOrder calldata triggerOrder) override public {
        uint256 orderIndex = _triggerOrderIndex[msg.sender];
        _triggerOrderIndex[msg.sender] = orderIndex + 1;
        _triggerOrders[msg.sender][orderIndex] = triggerOrder;
        emit TriggerOrderCreated(msg.sender, orderIndex, triggerOrder);
    }

    function cancelTriggerOrder(uint256 orderIndex) override external {
        IExchange.TriggerOrder memory triggerOrder = _triggerOrders[msg.sender][orderIndex];
        require(
            triggerOrder.index != address(0),
            "Warehouse: non-existent trigger order"
        );
        delete _triggerOrders[msg.sender][orderIndex];
        emit TriggerOrderCanceled(msg.sender, orderIndex);
    }

    function executeTriggerOrder(
        address account,
        uint256 orderIndex
    ) external payable onlyOrderKeeper {
        IExchange.TriggerOrder memory triggerOrder = _triggerOrders[account][orderIndex];
        require(
            triggerOrder.index != address(0),
            "Warehouse: non-existent trigger order"
        );
        delete _triggerOrders[account][orderIndex];
        emit TriggerOrderExecuted(account, orderIndex);

        IAdapter.Position memory position
            = IAdapter(triggerOrder.adapter).getPosition(account, triggerOrder.collateral, triggerOrder.index, triggerOrder.isLong);
        address[] memory path = new address[](1);
        path[0] = triggerOrder.collateral;
        IExchange.PositionOrder memory positionOrder
            = IExchange.PositionOrder({
                orderType: IExchange.OrderType.DecreasePosition,
                path: path,
                index: triggerOrder.index,
                collateralAmount: 0,
                size: position.size,
                isLong: triggerOrder.isLong
            });
        IAccount(account).executeTriggerOrder{value: msg.value}(triggerOrder.adapter, positionOrder);
    }
}