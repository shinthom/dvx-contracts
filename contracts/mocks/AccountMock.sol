// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {Account} from "../Account.sol";
import {IExchange} from "../interfaces/IExchange.sol";
import "hardhat/console.sol";

contract AccountMock is Account {
    constructor(address _owner, address _exchange) Account(_owner, _exchange) {}

    function increasePosition(
        address adapter,
        IExchange.MarketOrder calldata marketOrder
    ) external payable override {}

    function decreasePosition(
        address adapter,
        IExchange.MarketOrder calldata marketOrder
    ) external payable override {}

    function increaseCollateral(
        address adapter,
        IExchange.MarketOrder calldata marketOrder
    ) external payable override {}

    function decreaseCollateral(
        address adapter,
        IExchange.MarketOrder calldata marketOrder
    ) external payable override {}
}
