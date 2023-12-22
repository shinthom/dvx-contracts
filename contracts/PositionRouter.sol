// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interfaces/IAccount.sol";
import "./interfaces/IAdapter.sol";
import "./interfaces/IExchange.sol";
import "hardhat/console.sol";

contract PositionRouter {
    address private _exchange;

    constructor(address exchange) {
        _exchange = exchange;
    }

    // test
    function increasePosition(
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) payable external {
        // account should be deployed via exchange contract
        address account = IExchange(_exchange).account(msg.sender);

        address[] memory adapters = new address[](1);
        adapters[0] = adapter;

        IExchange.Order[] memory orders = new IExchange.Order[](1);
        orders[0] = IExchange.Order(
            IExchange.OrderType.IncreasePosition,
            collateral,
            index,
            collateralAmount,
            size,
            isLong
        );

        if (msg.value > 0) {
            payable(account).transfer(msg.value);
        }
        IAccount(account).createOrders(adapters, orders);
    }

    function increaseCollateral(
        address adapter,
        address collateral,
        address index,
        address tokenIn,
        uint256 amountIn,
        bool isLong
    ) payable external {
        address account = IExchange(_exchange).account(msg.sender);

        uint256 amount = amountIn;
        if (tokenIn != collateral) {
            uint256 amountOut
                = IAccount(account).swap(tokenIn, collateral, amountIn);
            amount = amountOut;
        }

        address[] memory adapters = new address[](1);
        adapters[0] = adapter;

        IExchange.Order[] memory orders = new IExchange.Order[](1);
        orders[0] = IExchange.Order(
            IExchange.OrderType.IncreaseCollateral,
            collateral,
            index,
            amount,
            0,
            isLong
        );

        if (msg.value > 0) {
            payable(account).transfer(msg.value);
        }
        IAccount(account).createOrders(adapters, orders);
    }
}
