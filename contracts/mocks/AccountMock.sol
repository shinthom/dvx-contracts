// // SPDX-License-Identifier: UNLICENSED
// pragma solidity 0.8.7;

// import {Account} from "../Account.sol";
// import {IExchange} from "../interfaces/IExchange.sol";
// import "hardhat/console.sol";

// contract AccountMock is Account {
//     uint256 private _balance;

//     constructor(address _owner, address _exchange) Account(_owner, _exchange) {}

//     function getBalance(address token) public view override returns (uint256) {
//         return _balance;
//     }

//     function setBalance(uint256 balance) external {
//         _balance = balance;
//     }

//     function increasePosition(
//         address adapter,
//         IExchange.MarketOrder calldata marketOrder
//     ) external payable override {}

//     function decreasePosition(
//         address adapter,
//         IExchange.MarketOrder calldata marketOrder
//     ) external payable override {}

//     function increaseCollateral(
//         address adapter,
//         IExchange.MarketOrder calldata marketOrder
//     ) external payable override {}

//     function decreaseCollateral(
//         address adapter,
//         IExchange.MarketOrder calldata marketOrder
//     ) external payable override {}
// }
