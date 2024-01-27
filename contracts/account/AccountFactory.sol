// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {Account} from "./Account.sol";
import {IAccountFactory} from "../interfaces/IAccountFactory.sol";

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract AccountFactory is
    IAccountFactory,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    mapping(address => address) public accounts;

    address public exchange;

    modifier onlyExchange() {
        require(msg.sender == exchange, "msg.sender: not exchange");
        _;
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    function initialize(address _exchange) external virtual initializer {
        require(_exchange != address(0), "exchange: zero address");
        exchange = _exchange;

        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function createAccount(
        address accountOwner
    ) external override onlyExchange returns (address) {
        require(
            accounts[accountOwner] == address(0),
            "account: already created"
        );

        Account account = new Account(accountOwner, exchange);
        accounts[accountOwner] = address(account);
        emit AccountCreated(accountOwner, address(account));

        return address(account);
    }

    function setExchange(address _exchange) external override onlyOwner {
        require(_exchange != address(0), "exchange: zero address");

        exchange = _exchange;
        emit ExchangeSet(_exchange);
    }
}
