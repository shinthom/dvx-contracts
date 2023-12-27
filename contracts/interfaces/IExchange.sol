// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IExchange {
    enum OrderType {
        IncreasePosition,
        DecreasePosition,
        IncreaseCollateral,
        DecreaseCollateral
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
        uint256 leverage;
        bool isLong;
        uint256 price; // trigger
        // todo: slippageTolerance
    }
    struct TriggerOrder {
        address account;
        address adapter;
        address collateral;
        address index;
        bool isLong;
        uint256 price; // trigger
        // todo: slippageTolerance
    }
    // struct LimitOrder {
    //     uint256 pairId; // TODO: Have to make a system to manage this
    //     bool isLong;
    //     uint256 price;
    //     uint112 slippageTolerance;
    //     uint256 size;
    //     address collateral; // TODO: Have to make a system to manage this
    //     uint256 collateralAmount;
    // }
    // struct TriggerOrder {
    //     uint256 pairId; // TODO: Have to make a system to manage this
    //     uint256 positionId; // TODO: Have to make a system to manage this
    //     address adaptorId; // TODO: Have to make a system to manage this
    //     bool isPositionLong;
    //     uint256 triggerPrice;
    //     uint256 size;
    // }

    // getPosition(account, collaterals[j], indexs[k], isLongs[l]

    event AccountCreated(address indexed wallet, address indexed account);
    event AdapterRegistered(address indexed adapter);
    event AdapterUnregistered(address indexed adapter);
    event TokenRegistered(address indexed adapter);
    event TokenUnregistered(address indexed adapter);
    event MarginKeeperSet(address indexed keeper, bool status);
    event FeeSet(Fee fee);

    function account(address wallet) external view returns (address);
    function warehouse() external view returns (address);

    function swap(address tokenIn, address tokenOut, uint256 amount) payable external returns (uint256);
}