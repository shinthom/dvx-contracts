// // SPDX-License-Identifier: UNLICENSED
// pragma solidity 0.8.7;

// import {Exchange} from "../Exchange.sol";
// import {AccountMock} from "./AccountMock.sol";

// contract ExchangeMock is Exchange {
//     uint256 private _lockedBalance;

//     function increaseLockedBalance(uint256 amount) external {
//         _lockedBalance = amount;
//     }

//     function lockedBalances(
//         address account,
//         address token
//     ) external view override returns (uint256) {
//         return _lockedBalance;
//     }

//     function swap(
//         address tokenIn,
//         address tokenOut,
//         uint256 amountIn
//     ) public payable override returns (uint256 amountOut) {
//         amountOut = 10;
//     }

//     function createAccountMock() external returns (address) {
//         AccountMock account = new AccountMock(msg.sender, address(this));
//         accounts[msg.sender] = address(account);

//         return address(account);
//     }

//     function executeLimitOrder(
//         address account,
//         address adapter,
//         MarketOrder memory marketOrder
//     ) external payable override {}

//     function executeTriggerOrder(
//         address account,
//         address adapter,
//         MarketOrder memory marketOrder
//     ) external payable override {}
// }
