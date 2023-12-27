// // SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.0;

// import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
// import "./interfaces/IExchange.sol";
// import "./interfaces/IWarehouse.sol";

// contract Warehouse is IWarehouse, OwnableUpgradeable, UUPSUpgradeable {
//     uint8 private constant ORDER_STATE_ACTIVE = 1;
//     uint8 private constant ORDER_STATE_EXECUTED = 2;
//     uint8 private constant ORDER_STATE_CANCELED = 3;

//     address public exchange;
//     address public quoter;

//     WarehouseLimitOrder[] public limitOrders;
//     WarehouseTriggerOrder[] public triggerOrders;

//     mapping (address => bool) public orderKeepers;

//     modifier onlyOrderKeeper() {
//         require(
//           orderKeepers[_msgSender()],
//           "Warehouse: Only order keeper can call this function"
//         );
//         _;
//     }

//     function initialize(address _quoter) public initializer {
//         quoter = _quoter;
//         __Ownable_init();
//         __UUPSUpgradeable_init();
//     }

//     function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

//     function createLimitOrder(
//       IExchange.LimitOrder memory _limitOrder
//     ) override external returns (uint256 limitOrderId) {
//         WarehouseLimitOrder memory limitOrder = WarehouseLimitOrder({
//             owner: _msgSender(),
//             status: ORDER_STATE_ACTIVE,
//             limitOrder: _limitOrder
//         });
//         limitOrders.push(limitOrder);

//         limitOrderId = limitOrders.length - 1;
//         emit LimitOrderRegistered(
//           _msgSender(),
//           limitOrderId,
//           0, // pairId
//           _limitOrder.price,
//           _limitOrder.isLong,
//           _limitOrder.size
//         );
//     }

//     function createLimitOrder(
//       IExchange.LimitOrder memory limitOrder
//     ) public returns (uint256 id) {
//         WarehouseLimitOrder memory limitOrder = WarehouseLimitOrder({
//             owner: _msgSender(),
//             status: ORDER_STATE_ACTIVE,
//             limitOrder: limitOrder
//         });
//     }

//     function createTriggerOrder(
//       IExchange.TriggerOrder memory _triggerOrder
//     ) override external returns (uint256 triggerOrderId) {
//         WarehouseTriggerOrder memory triggerOrder = WarehouseTriggerOrder({
//             owner: _msgSender(),
//             status: ORDER_STATE_ACTIVE,
//             triggerOrder: _triggerOrder
//         });
//         triggerOrders.push(triggerOrder);

//         triggerOrderId = triggerOrders.length - 1;
//         emit TriggerOrderRegistered(
//           _msgSender(),
//           triggerOrderId,
//           0, // pairId
//           _triggerOrder.triggerPrice,
//           _triggerOrder.isPositionLong,
//           _triggerOrder.size
//         );
//     }

//     // function cancelLimitOrder(uint256 limitOrderId) external override {
//     //     WarehouseLimitOrder storage limitOrder = limitOrders[limitOrderId];
//     //     require(_msgSender() == limitOrder.owner, "Warehouse: Only owner can cancel limit order");
//     //     require(limitOrder.state == ORDER_STATE_ACTIVE, "Warehouse: Limit order is not active");
//     //     limitOrder.status = ORDER_STATE_CANCELED;
//     //     emit LimitOrderCanceled(limitOrder.owner, limitOrderId);
//     // }


//     // function executeLimitOrder(uint256 limitOrderId) external override onlyOrderKeeper {
//     //     WarehouseLimitOrder storage limitOrder = limitOrders[limitOrderId];
//     //     require(limitOrder.state == ORDER_STATE_ACTIVE, "Warehouse: Limit order is not active");
//     //     // TODO: EXECUTE LOGIC
//     //     limitOrder.status = ORDER_STATE_EXECUTED;
//     //     emit LimitOrderExecuted(_msgSender(), limitOrder.owner, limitOrderId);
//     // }

//     // function executeTriggerOrder(uint256 triggerOrderId) external override onlyOrderKeeper {
//     //     WarehouseTriggerOrder storage triggerOrder = triggerOrders[triggerOrderId];
//     //     require(triggerOrder.state == ORDER_STATE_ACTIVE, "Warehouse: Trigger order is not active");
//     //     // TODO: EXECUTE LOGIC
//     //     triggerOrder.status = ORDER_STATE_EXECUTED;
//     //     emit LimitOrderExecuted(_msgSender(), triggerOrder.owner, triggerOrderId);
//     // }

//     // function manageOrderKeeper(address keeper, bool status) external onlyOwner {
//     //     orderKeepers[keeper] = status;
//     //     emit OrderKeeperAdministration(keeper, status);
//     // }
// }