// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IAdapter.sol";
import "./interfaces/IAccount.sol";
import "./interfaces/IQuoter.sol";
import "./interfaces/IExchange.sol";
import "./interfaces/IWarehouse.sol";

contract Warehouse is IWarehouse, OwnableUpgradeable, UUPSUpgradeable {
    uint8 private constant ORDER_STATE_ACTIVE = 1;
    uint8 private constant ORDER_STATE_EXECUTED = 2;
    uint8 private constant ORDER_STATE_CANCELED = 3;

    address public exchange;
    address public quoter;

    WarehouseLimitOrder[] public limitOrders;
    WarehouseTriggerOrder[] public triggerOrders;

    mapping (address => bool) public orderKeepers;

    modifier onlyOrderKeeper() {
        require(
          orderKeepers[_msgSender()],
          "Warehouse: Only order keeper can call this function"
        );
        _;
    }

    // todo: get limit order id by account
    function totalLimitOrders() public view returns (uint256) { return limitOrders.length; }
    function totalTriggerOrders() public view returns (uint256) { return triggerOrders.length; }
    function getLimitOrder(uint256 orderId) public view returns (IExchange.LimitOrder memory) { return limitOrders[orderId].limitOrder; }
    function getTriggerOrder(uint256 orderId) public view returns (IExchange.TriggerOrder memory) { return triggerOrders[orderId].triggerOrder; }

    function initialize(address _quoter) public initializer {
        quoter = _quoter;
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function setOrderKeeper(address keeper, bool status) external onlyOwner {
        orderKeepers[keeper] = status;
        emit OrderKeeperSet(keeper, status);
    }

    function createLimitOrder(
        IExchange.LimitOrder memory order
    ) override public returns (uint256 orderId) {
        WarehouseLimitOrder memory limitOrder = WarehouseLimitOrder({
            owner: _msgSender(),
            status: ORDER_STATE_ACTIVE,
            limitOrder: order
        });
        limitOrders.push(limitOrder);

        orderId = limitOrders.length - 1;
        // todo: emit
    }

    function createTriggerOrder(
      IExchange.TriggerOrder memory order
    ) override public returns (uint256 orderId) {
        WarehouseTriggerOrder memory triggerOrder = WarehouseTriggerOrder({
            owner: _msgSender(),
            status: ORDER_STATE_ACTIVE,
            triggerOrder: order
        });
        triggerOrders.push(triggerOrder);

        orderId = triggerOrders.length - 1;
        // todo: emit
    }

    function cancelLimitOrder(uint256 id) override external {
        WarehouseLimitOrder storage warehouseLimitOrder = limitOrders[id];
        require(
            warehouseLimitOrder.status == ORDER_STATE_ACTIVE,
            "Warehouse: Limit order is not active"
        );
        require(
            _msgSender() == warehouseLimitOrder.owner,
            "Warehouse: Only owner can cancel limit order"
        );

        warehouseLimitOrder.status = ORDER_STATE_CANCELED;
        emit LimitOrderCanceled(warehouseLimitOrder.owner, id);
    }

    function cancelTriggerOrder(uint256 id) override external {
        WarehouseTriggerOrder storage warehouseTriggerOrder = triggerOrders[id];
        require(
            warehouseTriggerOrder.status == ORDER_STATE_ACTIVE,
            "Warehouse: Limit order is not active"
        );
        require(
            _msgSender() == warehouseTriggerOrder.owner,
            "Warehouse: Only owner can cancel limit order"
        );

        warehouseTriggerOrder.status = ORDER_STATE_CANCELED;
        emit LimitOrderCanceled(warehouseTriggerOrder.owner, id);
    }

    function executeLimitOrder(
        address account,
        uint256 orderId,
        IQuoter.Answer[] memory answers
    ) payable onlyOrderKeeper external {
        WarehouseLimitOrder storage warehouseLimitOrder = limitOrders[orderId];
        warehouseLimitOrder.status = ORDER_STATE_EXECUTED;

        // todo: slippage
        // warehouseLimitOrder.limitOrder.price
        // answers[0]

        address[] memory adapters = new address[](answers.length);
        IExchange.PositionOrder[] memory positionOrders = new IExchange.PositionOrder[](answers.length);

        for (uint256 i = 0; i < answers.length; i++) {
            adapters[i] = answers[i].adapter;
            positionOrders[i] = answers[i].positionOrder;
        }
        IAccount(account).executeLimitOrder{value: msg.value}(adapters, positionOrders);
    }

    function executeTriggerOrder(
        address account,
        uint256 orderId
    ) payable onlyOrderKeeper external {
        IExchange.TriggerOrder memory order = triggerOrders[orderId].triggerOrder;

        IAdapter.Position memory position
            = IAdapter(order.adapter).getPosition(account, order.collateral, order.index, order.isLong);

        address[] memory path = new address[](1);
        path[0] = order.collateral;

        IExchange.PositionOrder memory positionOrder
            = IExchange.PositionOrder({
                orderType: IExchange.OrderType.DecreasePosition,
                path: path,
                index: order.index,
                collateralAmount: 0,
                size: position.size,
                isLong: order.isLong
            });

        IAccount(account).executeTriggerOrder{value: msg.value}(order.adapter, positionOrder);
    }
}