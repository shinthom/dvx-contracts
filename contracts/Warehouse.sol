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
    function getLimitOrder(uint256 orderId) public view returns (WarehouseLimitOrder memory) { return limitOrders[orderId]; }
    function getTriggerOrder(uint256 orderId) public view returns (WarehouseTriggerOrder memory) { return triggerOrders[orderId]; }

    function initialize(address _quoter) public initializer {
        quoter = _quoter;
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function registerLimitOrder(
      IExchange.LimitOrder memory order
    ) override public returns (uint256 orderId) {
        // todo: only allow account which is registered by exchange

        WarehouseLimitOrder memory limitOrder = WarehouseLimitOrder({
            owner: _msgSender(),
            status: ORDER_STATE_ACTIVE,
            limitOrder: order
        });
        limitOrders.push(limitOrder);

        orderId = limitOrders.length - 1;
        // todo: emit
    }

    function registerTriggerOrder(
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

    function createLimitOrder(
        address account,
        uint256 orderId
    ) external onlyOrderKeeper {
        IExchange.LimitOrder memory order = limitOrders[orderId].limitOrder;

        // todo: update quoter contract to get position order
        // address[] memory adapters; // todo: get adapters
        // IQuoter.Answer[] memory answers = IQuoter(quoter).quote(
        //     account,
        //     adapters,
        //     orders
        // );

        // IAccount(account).createLimitOrder(
        //     answers[0].adapter,
        //     answers[0].positionOrder
        // );
    }

    // todo: set onlyOrderKeeper
    function createTriggerOrder(
        address account,
        uint256 orderId
    ) external {
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

        IAccount(account).createTriggerOrder(order.adapter, positionOrder);
    }

    // function cancelLimitOrder(uint256 limitOrderId) external override {
    //     WarehouseLimitOrder storage limitOrder = limitOrders[limitOrderId];
    //     require(_msgSender() == limitOrder.owner, "Warehouse: Only owner can cancel limit order");
    //     require(limitOrder.state == ORDER_STATE_ACTIVE, "Warehouse: Limit order is not active");
    //     limitOrder.status = ORDER_STATE_CANCELED;
    //     emit LimitOrderCanceled(limitOrder.owner, limitOrderId);
    // }


    // function executeLimitOrder(uint256 limitOrderId) external override onlyOrderKeeper {
    //     WarehouseLimitOrder storage limitOrder = limitOrders[limitOrderId];
    //     require(limitOrder.state == ORDER_STATE_ACTIVE, "Warehouse: Limit order is not active");
    //     // TODO: EXECUTE LOGIC
    //     limitOrder.status = ORDER_STATE_EXECUTED;
    //     emit LimitOrderExecuted(_msgSender(), limitOrder.owner, limitOrderId);
    // }

    // function executeTriggerOrder(uint256 triggerOrderId) external override onlyOrderKeeper {
    //     WarehouseTriggerOrder storage triggerOrder = triggerOrders[triggerOrderId];
    //     require(triggerOrder.state == ORDER_STATE_ACTIVE, "Warehouse: Trigger order is not active");
    //     // TODO: EXECUTE LOGIC
    //     triggerOrder.status = ORDER_STATE_EXECUTED;
    //     emit LimitOrderExecuted(_msgSender(), triggerOrder.owner, triggerOrderId);
    // }

    // function manageOrderKeeper(address keeper, bool status) external onlyOwner {
    //     orderKeepers[keeper] = status;
    //     emit OrderKeeperAdministration(keeper, status);
    // }
}