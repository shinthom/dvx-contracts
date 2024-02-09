// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IAdapter} from "./interfaces/IAdapter.sol";
import {IWarehouse} from "./interfaces/IWarehouse.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract Warehouse is IWarehouse, OwnableUpgradeable, UUPSUpgradeable {
    address private constant _weth = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;

    mapping(address => LimitOrder[]) private _limitOrders;

    address public exchange;

    modifier onlyExchange() {
        require(msg.sender == exchange, "msg.sender: not exchange");
        _;
    }

    function initialize() external virtual initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function setExchange(address _exchange) external override onlyOwner {
        require(_exchange != address(0), "exchange: zero address");

        exchange = _exchange;
        emit ExchangeSet(_exchange);
    }

    function createLimitOrder(
        address account,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 triggerPrice,
        uint256 acceptablePrice
    ) external payable override onlyExchange {
        require(
            (isLong && triggerPrice <= acceptablePrice) ||
                (!isLong && triggerPrice >= acceptablePrice),
            "triggerPrice: invalid"
        );

        LimitOrder memory limitOrder = LimitOrder({
            limitOrderId: _limitOrders[account].length,
            state: LimitOrderState.Pending,
            account: account,
            collateral: collateral,
            index: index,
            collateralAmount: collateralAmount,
            size: size,
            isLong: isLong,
            triggerPrice: triggerPrice,
            acceptablePrice: acceptablePrice,
            createdAt: block.timestamp
        });
        _limitOrders[account].push(limitOrder);
        emit LimitOrderCreated(account, limitOrder.limitOrderId);
    }

    function cancelLimitOrder(
        address account,
        uint256 limitOrderId
    )
        external
        override
        onlyExchange
        returns (IWarehouse.LimitOrder memory limitOrder)
    {
        limitOrder = _limitOrders[account][limitOrderId];
        require(
            limitOrder.state == LimitOrderState.Pending,
            "state: not pending"
        );

        _limitOrders[account][limitOrderId].state = LimitOrderState.Canceled;
        emit LimitOrderCanceled(account, limitOrderId);
    }

    function executeLimitOrder(
        address account,
        address adapter,
        uint256 limitOrderId
    )
        external
        payable
        override
        onlyExchange
        returns (IWarehouse.LimitOrder memory limitOrder)
    {
        limitOrder = _limitOrders[account][limitOrderId];
        require(
            limitOrder.state == LimitOrderState.Pending,
            "state: not pending"
        );

        uint256 markPrice = IAdapter(adapter).getWrapPrice(
            limitOrder.index,
            limitOrder.isLong
        );
        require(
            (limitOrder.isLong && markPrice <= limitOrder.acceptablePrice) ||
                (!limitOrder.isLong && markPrice >= limitOrder.acceptablePrice),
            "price: not acceptable"
        );

        _limitOrders[account][limitOrderId].state = LimitOrderState.Executed;
        emit LimitOrderExecuted(account, limitOrderId);
    }

    function executeLimitOrderMulti(
        address account,
        address[] calldata adapters,
        uint256 limitOrderId
    )
        external
        payable
        override
        onlyExchange
        returns (IWarehouse.LimitOrder memory limitOrder)
    {
        limitOrder = _limitOrders[account][limitOrderId];
        require(
            limitOrder.state == LimitOrderState.Pending,
            "state: not pending"
        );

        for (uint256 i = 0; i < adapters.length; i++) {
            uint256 markPrice = IAdapter(adapters[i]).getWrapPrice(
                limitOrder.index,
                limitOrder.isLong
            );
            require(
                (limitOrder.isLong &&
                    markPrice <= limitOrder.acceptablePrice) ||
                    (!limitOrder.isLong &&
                        markPrice >= limitOrder.acceptablePrice),
                "price: not acceptable"
            );
        }

        _limitOrders[account][limitOrderId].state = LimitOrderState.Executed;
        emit LimitOrderExecuted(account, limitOrderId);
    }

    function executeTriggerOrder(
        address account,
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        TriggerOrderType orderType,
        uint256 triggerPrice, // 1e18
        uint256 acceptablePrice // 1e18
    ) external override onlyExchange {
        IAdapter.Position memory position = IAdapter(adapter).getPosition(
            account,
            collateral,
            index,
            isLong
        );
        require(position.size > 0, "position: not exist");

        require(
            (isLong && triggerPrice >= acceptablePrice) ||
                (!isLong && triggerPrice <= acceptablePrice),
            "triggerPrice: invalid"
        );

        uint256 markPrice = IAdapter(adapter).getWrapPrice(index, isLong);
        require(
            (isLong && markPrice >= acceptablePrice) ||
                (!isLong && markPrice <= acceptablePrice),
            "price: not acceptable"
        );
        emit TriggerOrderExecuted(
            account,
            adapter,
            collateral,
            index,
            isLong,
            size,
            orderType,
            triggerPrice,
            acceptablePrice
        );
    }

    function getPositionKey(
        address account,
        address adapter,
        address collateral,
        address index,
        bool isLong
    ) public pure override returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(account, adapter, collateral, index, isLong)
            );
    }

    function getLimitOrders(
        address account
    ) public view override returns (LimitOrder[] memory) {
        return _limitOrders[account];
    }

    function getLimitOrder(
        address account,
        uint256 limitOrderId
    ) public view override returns (LimitOrder memory) {
        return _limitOrders[account][limitOrderId];
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
