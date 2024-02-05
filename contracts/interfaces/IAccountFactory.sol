// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

// prettier-ignore

interface IAccountFactory {
    function accounts(address owner) external view returns (address);

    function account() external view returns (address);
    function exchange() external view returns (address);

    event AccountCreated(address indexed accountOwner, address indexed account);
    event ExchangeSet(address indexed exchange);

    function createAccount(address owner) external returns (address);
    function setExchange(address exchange) external;
}
