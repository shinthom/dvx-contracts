// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { IAdapter } from "./interfaces/IAdapter.sol";
import { IAccount } from "./interfaces/IAccount.sol";
import { IExchange } from "./interfaces/IExchange.sol";
import { IWarehouse } from "./interfaces/IWarehouse.sol";
import "hardhat/console.sol";

contract Warehouse is IWarehouse, OwnableUpgradeable, UUPSUpgradeable {
    event OrderKeeperSet(address indexed keeper, bool status);
    event PriceMinDeviationSet(uint256 deviation);
    event TriggerOrderCreated(address indexed account, bytes32 indexed positionKey, uint256 indexed id);
    event TriggerOrderCanceled(address indexed account, bytes32 indexed positionKey, uint256 indexed id);
    event TriggerOrderExecuted(address indexed account, bytes32 indexed positionKey, uint256 indexed id);

    mapping(address => bool) private _orderKeepers;

    uint256 public constant BASIS_POINTS_DIVISOR = 10000;
    uint256 private _priceMinDeviation;

    mapping(bytes32 => IWarehouse.TriggerOrder[]) private _triggerOrders;

    modifier onlyOrderKeeper() {
        require(
          _orderKeepers[_msgSender()],
          "Warehouse: not order keeper"
        );
        _;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function priceMinDeviation() public view returns (uint256) { return _priceMinDeviation; }

    function getTriggerOrders(bytes32 key) override public view returns (TriggerOrder[] memory) { return _triggerOrders[key]; }

    function getTriggerOrder(bytes32 key, uint256 id) override public view returns (TriggerOrder memory) { return _triggerOrders[key][id]; }

    function getPositionKey(
        address account,
        address adapter,
        address collateral,
        address index,
        bool isLong
    ) override public pure returns (bytes32) {
        return keccak256(abi.encodePacked(account, adapter, collateral, index, isLong));
    }

    function initialize() public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function setPriceMinDeviation(uint256 deviation) external onlyOwner {
        require(
            deviation <= BASIS_POINTS_DIVISOR,
            "Warehouse: invalid price min deviation"
        );
        _priceMinDeviation = deviation;
        emit PriceMinDeviationSet(deviation);
    }

    function setOrderKeeper(address keeper, bool status) external onlyOwner {
        _orderKeepers[keeper] = status;
        emit OrderKeeperSet(keeper, status);
    }

    function createTriggerOrder(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        IWarehouse.TriggerOrderType orderType,
        uint256 triggerPrice,
        uint256 acceptablePrice
    ) override external payable {
        require(
            isLong && triggerPrice >= acceptablePrice ||
            !isLong && triggerPrice <= acceptablePrice,
            "Warehouse: invalid acceptable price"
        );

        if (_priceMinDeviation > 0) {
            uint256 minDeviation = triggerPrice * _priceMinDeviation / BASIS_POINTS_DIVISOR;
            require(
                isLong && triggerPrice - acceptablePrice >= minDeviation ||
                !isLong && acceptablePrice - triggerPrice >= minDeviation,
                "Warehouse: acceptable price less than min deviation"
            );
        }

        IAdapter.Position memory position = IAdapter(adapter).getPosition(
            msg.sender,
            collateral,
            index,
            isLong
        );
        require(position.size > 0, "Warehouse: no position exist");

        bytes32 positionKey = getPositionKey(msg.sender, adapter, collateral, index, isLong);
        uint256 id = _triggerOrders[positionKey].length;
        _triggerOrders[positionKey].push(TriggerOrder({
            id: id,
            state: IWarehouse.TriggerOrderState.Pending,
            account: msg.sender,
            adapter: adapter,
            collateral: collateral,
            index: index,
            isLong: isLong,
            size: size,
            orderType: orderType,
            triggerPrice: triggerPrice,
            acceptablePrice: acceptablePrice,
            createdAt: block.timestamp
        }));
        emit TriggerOrderCreated(msg.sender, positionKey, id);
    }

    function cancelTriggerOrder(bytes32 positionKey, uint256 id) override external {
        TriggerOrder storage triggerOrder = _triggerOrders[positionKey][id];
        require(
            triggerOrder.account == msg.sender,
            "Warehouse: not trigger order owner"
        );
        require(
            triggerOrder.state == TriggerOrderState.Pending,
            "Warehouse: not pending state"
        );

        triggerOrder.state = TriggerOrderState.Canceled;
        emit TriggerOrderCanceled(msg.sender, positionKey, id);
    }

    function executeTriggerOrder(
        address account,
        bytes32 positionKey,
        uint256 id
    ) override external payable onlyOrderKeeper {
        TriggerOrder memory triggerOrder = _triggerOrders[positionKey][id];
        require(
            triggerOrder.state == TriggerOrderState.Pending,
            "Warehouse: not pending state"
        );
        require(
            account == triggerOrder.account,
            "Warehouse: not trigger order owner"
        );

        IAdapter adapter = IAdapter(triggerOrder.adapter);
        uint256 minExecutionFee = adapter.getMinExecutionFee();
        require(
            address(this).balance >= minExecutionFee,
            "Warehouse: insufficient fee"
        );

        uint256 markPrice
            = adapter.getPrice(triggerOrder.index, triggerOrder.isLong);
        require(
            triggerOrder.isLong && markPrice >= triggerOrder.acceptablePrice ||
            !triggerOrder.isLong && markPrice <= triggerOrder.acceptablePrice,
            "Warehouse: current price is not acceptable"
        );

        triggerOrder.state = TriggerOrderState.Executed;
        emit TriggerOrderExecuted(account, positionKey, id);

        _executeTriggerOrder(triggerOrder, minExecutionFee);
    }

    function _executeTriggerOrder(
        TriggerOrder memory triggerOrder,
        uint256 minExecutionFee
    ) private {
        address[] memory path = new address[](1);
        path[0] = triggerOrder.collateral;

        IExchange.PositionOrder memory positionOrder
            = IExchange.PositionOrder({
                orderType: IExchange.OrderType.DecreasePosition,
                path: path,
                index: triggerOrder.index,
                collateralAmount: 0,
                size: triggerOrder.size,
                isLong: triggerOrder.isLong
            });

        IAccount(triggerOrder.account).executeTriggerOrder
            {value: minExecutionFee}(triggerOrder.adapter, positionOrder);
    }

    function withdraw(address account, uint256 amount) external onlyOwner {
        payable(account).transfer(amount);
    }
}