// // SPDX-License-Identifier: UNLICENSED
// pragma solidity 0.8.0;

// import "./Account.sol";

// contract Exchange {
//     // address private _owner;

//     // mapping(address => bool) private _registeredExchanges;
//     // mapping(address => bool) private _registeredTokens;

//     constructor() {
//         // _owner = msg.sender;
//     }

//     function createAccount() external returns (address) {
//         return _createAccount();
//     }

//     function createAccountAndDeposit(address token, uint256 amount)
//         external
//         payable
//         returns (address)
//     {
//         Account account = _createAccount();
//         account.deposit{value: msg.value}(token, amount);

//         return address(account);
//     }

//     function _createAccount() private returns (Account account) {
//         account = new Account();
//     }

//     // function registerExchange(address exchange) {
//     //     require(msg.sender == _owner, "NOT_OWNER");
//     //     _registered[exchange] = true;
//     // }

//     // function unregisterExchange(address exchange) {
//     //     _registered[exchange] = false;
//     // }
// }
