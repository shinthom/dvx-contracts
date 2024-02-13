// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

// prettier-ignore

interface IWarehouse {
    enum TriggerOrderType {
        TakeProfit,
        StopLoss
    }
    enum LimitOrderState {
        Pending,
        Executed,
        Canceled
    }

    struct LimitOrder {
        uint256 limitOrderId;
        LimitOrderState state;
        address account;
        address collateral;
        address index;
        uint256 collateralAmount;
        uint256 size;
        bool isLong;
        uint256 triggerPrice;
        uint256 acceptablePrice;
        uint256 executionFee;
        uint256 createdAt;
    }

    event OrderKeeperSet(address indexed orderKeeper, bool isActive);
    event PriceMinDeviationSet(uint256 indexed deviation);

    event LimitOrderCreated(
        address indexed account,
        uint256 indexed limitOrderId
    );
    event LimitOrderCanceled(
        address indexed account,
        uint256 indexed limitOrderId
    );
    event LimitOrderExecuted(
        address indexed account,
        uint256 indexed limitOrderId
    );
    event TriggerOrderExecuted(
        address indexed account,
        address indexed adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        TriggerOrderType orderType,
        uint256 triggerPrice,
        uint256 acceptablePrice,
        uint256 networkFee
    );

    function createLimitOrder(
        address account,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 triggerPrice,
        uint256 acceptablePrice,
        uint256 executionFee
    ) external payable;
    function cancelLimitOrder(
        address account,
        uint256 limitOrderId
    ) external returns (IWarehouse.LimitOrder memory limitOrder);
    function executeLimitOrder(
        address account,
        address adapter,
        uint256 limitOrderId
    ) external payable returns (IWarehouse.LimitOrder memory limitOrder);
    function executeLimitOrderMulti(
        address account,
        address[] calldata adapters,
        uint256 limitOrderId
    ) external payable returns (IWarehouse.LimitOrder memory limitOrder);
    function executeTriggerOrder(
        address account,
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        TriggerOrderType orderType,
        uint256 triggerPrice, // 1e18
        uint256 acceptablePrice, // 1e18
        uint256 networkFee
    ) external;

    function getPositionKey(
        address account,
        address adapter,
        address collateral,
        address index,
        bool isLong
    ) external view returns (bytes32);
    function getLimitOrders(
        address account
    ) external view returns (LimitOrder[] memory);
    function getLimitOrder(
        address account,
        uint256 limitOrderId
    ) external view returns (LimitOrder memory);
}
