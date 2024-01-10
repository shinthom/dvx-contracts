// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { IAdapter } from "./interfaces/IAdapter.sol";
import { IAccount } from "./interfaces/IAccount.sol";
import { IQuoter } from "./interfaces/IQuoter.sol";
import { IExchange } from "./interfaces/IExchange.sol";
import { IWarehouse } from "./interfaces/IWarehouse.sol";
import "hardhat/console.sol";

contract Warehouse is IWarehouse, OwnableUpgradeable, UUPSUpgradeable {
    mapping(address => bool) private _orderKeepers;

    mapping(address => uint256) private _limitOrderIndex;
    mapping(address => mapping(uint256 => IExchange.LimitOrder)) private _limitOrders;
    mapping(bytes32 => IExchange.TriggerOrder[]) private _triggerOrders;
    mapping(bytes32 => uint256) private _triggerOrderSize;

    modifier onlyOrderKeeper() {
        require(
          _orderKeepers[_msgSender()],
          "Warehouse: NOT_ORDER_KEEPER"
        );
        _;
    }

    function initialize() public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function setOrderKeeper(address keeper, bool status) override external onlyOwner {
        _orderKeepers[keeper] = status;
        emit OrderKeeperSet(keeper, status);
    }

    function isOrderKeeper(address keeper) override public view returns (bool) { return _orderKeepers[keeper]; }

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

    function createLimitOrder(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 price
    ) override public {
        uint256 orderIndex = _limitOrderIndex[msg.sender];
        _limitOrderIndex[msg.sender] = orderIndex + 1;
        _limitOrders[msg.sender][orderIndex] = IExchange.LimitOrder({
            collateral: collateral,
            index: index,
            collateralAmount: collateralAmount,
            size: size,
            isLong: isLong,
            price: price,
            createdAt: block.timestamp
        });
        // emit LimitOrderCreated(msg.sender, orderIndex);
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
    ) override external payable onlyOrderKeeper {
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

    function getPositionKey(
        address adapter,
        address collateral,
        address index,
        bool isLong
    ) override public pure returns (bytes32) {
        return keccak256(abi.encodePacked(adapter, collateral, index, isLong));
    }

    function getTriggerOrders(bytes32 positionKey) override public view returns (IExchange.TriggerOrder[] memory) {
        return _triggerOrders[positionKey];
    }

    function getTriggerOrder(bytes32 positionKey, uint256 id) override public view returns (IExchange.TriggerOrder memory) {
        return _triggerOrders[positionKey][id];
    }

    function getTriggerOrderLength(bytes32 positionKey) override public view returns (uint256) {
        return _triggerOrders[positionKey].length;
    }

    function getTriggerOrderSize(bytes32 positionKey) override public view returns (uint256) {
        return _triggerOrderSize[positionKey];
    }

    function createTriggerOrder(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        uint256 tpPrice,
        uint256 slPrice
    ) override public payable {
        IAdapter.Position memory position = IAdapter(adapter).getPosition(
            msg.sender,
            collateral,
            index,
            isLong
        );
        require(position.size > 0, "Warehouse: NO_POSITION");

        bytes32 positionKey = getPositionKey(adapter, collateral, index, isLong);
        uint256 triggerOrderSize = _triggerOrderSize[positionKey];
        require(
            triggerOrderSize + size <= position.size,
            "Warehouse: EXCEED_SIZE"
        );

        uint256 id = _triggerOrders[positionKey].length;
        _triggerOrders[positionKey].push(IExchange.TriggerOrder({
            id: id,
            state: IExchange.TriggerOrderState.Pending,
            account: msg.sender,
            adapter: adapter,
            collateral: collateral,
            index: index,
            isLong: isLong,
            size: size,
            tpPrice: tpPrice,
            slPrice: slPrice,
            createdAt: block.timestamp
        }));
        emit TriggerOrderCreated(msg.sender, positionKey, id);
        _triggerOrderSize[positionKey] += size;
    }

    function cancelTriggerOrder(bytes32 positionKey, uint256 id) override external {
        IExchange.TriggerOrder storage triggerOrder = _triggerOrders[positionKey][id];
        require(
            triggerOrder.account == msg.sender,
            "Warehouse: NOT_OWNER"
        );
        require(
            triggerOrder.size > 0,
            "Warehouse: NO_TRIGGER_ORDER"
        );
        require(
            triggerOrder.state == IExchange.TriggerOrderState.Pending,
            "Warehouse: NOT_PENDING"
        );

        triggerOrder.state = IExchange.TriggerOrderState.Canceled;
        emit TriggerOrderCanceled(msg.sender, positionKey, id);
        _triggerOrderSize[positionKey] -= triggerOrder.size;
    }

    function executeTriggerOrder(
        address account,
        bytes32 positionKey,
        uint256 id
    ) override external payable onlyOrderKeeper {
        require(
            _triggerOrders[positionKey].length > id,
            "Warehouse: ORDER_NOT_EXIST"
        );

        IExchange.TriggerOrder memory triggerOrder = _triggerOrders[positionKey][id];
        require(
            triggerOrder.state == IExchange.TriggerOrderState.Pending,
            "Warehouse: ORDER_NOT_PENDING"
        );

        uint256 minExecutionFee = IAdapter(triggerOrder.adapter).getMinExecutionFee();
        require(
            address(this).balance >= minExecutionFee,
            "Warehouse: INSUFFICIENT_FEE"
        );

        // if (triggerOrder.tpPrice != 0) {
        //     require()
        // }
        // if (triggerOrder.slPrice != 0) {
        //     require()
        // }

        triggerOrder.state = IExchange.TriggerOrderState.Executed;
        emit TriggerOrderExecuted(account, positionKey, id);
        _triggerOrderSize[positionKey] -= triggerOrder.size;

        address[] memory path = new address[](1);
        path[0] = triggerOrder.collateral;

        IAdapter.Position memory position
            = IAdapter(triggerOrder.adapter).getPosition(account, triggerOrder.collateral, triggerOrder.index, triggerOrder.isLong);
        IExchange.PositionOrder memory positionOrder
            = IExchange.PositionOrder({
                orderType: IExchange.OrderType.DecreasePosition,
                path: path,
                index: triggerOrder.index,
                collateralAmount: 0,
                size: position.size,
                isLong: triggerOrder.isLong
            });

        IAccount(account).executeTriggerOrder{value: minExecutionFee}(triggerOrder.adapter, positionOrder);
    }

    function withdraw(address keeper) external onlyOwner {
        payable(keeper).transfer(address(this).balance);
    }
}