// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IExchange {
    enum OrderType {
        IncreasePosition,
        DecreasePosition,
        IncreaseCollateral,
        DecreaseCollateral
    }
    enum TriggerOrderState {
        Pending,
        Executed,
        Canceled
    }

    struct Fee {
        uint256 depositFeeBasisPoints;
        uint256 withdrawFeeBasisPoints;
        uint256 swapFeeBasisPoints;
        uint256 positionFeeBasisPoints;
        uint256 marginFeeBasisPoints;
        uint256 marginAdjustmentBasisPoints;
    }
    struct PositionOrder {
        OrderType orderType;
        address[] path;
        address index;
        uint256 collateralAmount;
        uint256 size;
        bool isLong;
    }
    struct LimitOrder {
        address collateral;
        address index;
        uint256 collateralAmount;
        uint256 size;
        bool isLong;
        uint256 price; // trigger
        // todo: slippageTolerance
        uint256 createdAt;
    }
    struct TriggerOrder {
        uint256 id;
        TriggerOrderState state;
        address account;
        address adapter;
        address collateral;
        address index;
        bool isLong;
        uint256 size;
        uint256 tpPrice; // trigger
        uint256 slPrice; // trigger
        // todo: slippageTolerance
        uint256 createdAt;
    }

    event AccountCreated(address indexed wallet, address indexed account);
    event AdapterRegistered(address indexed adapter);
    event AdapterUnregistered(address indexed adapter);
    event TokenRegistered(address indexed adapter);
    event TokenUnregistered(address indexed adapter);
    event MarginKeeperSet(address indexed keeper, bool status);
    event MarketOrderCreated(address indexed account, address[] adapters, PositionOrder[] orders);
    event FeeSet(Fee fee);

    function account(address wallet) external view returns (address);
    function warehouse() external view returns (address);

    function swap(address tokenIn, address tokenOut, uint256 amount) payable external returns (uint256);
}