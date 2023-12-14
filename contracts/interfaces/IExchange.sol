// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;

interface IExchange {
    enum OrderType {
        IncreasePosition,
        DecreasePosition,
        IncreaseCollateral,
        DecreaseCollateral
    }

    struct Order {
        OrderType orderType;
        address collateral;
        address index;
        uint256 collateralAmount;
        uint256 size;
        bool isLong;
    }

    event AccountCreated(address indexed wallet, address indexed account);

    // function getFee(OrderType orderType, Order memory order) external view returns (uint256);
}