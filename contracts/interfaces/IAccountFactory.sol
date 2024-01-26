// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

interface IAccountFactory {
    event ExchangeSet(address indexed exchange);

    event AccountCreated(address indexed accountOwner, address indexed account);

    function createAccount(address owner) external returns (address);

    function setExchange(address exchange) external;
}
