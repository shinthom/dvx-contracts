// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IAccount} from "../interfaces/IAccount.sol";
import {IAccountFactory} from "../interfaces/IAccountFactory.sol";
import {AccountProxy} from "./AccountProxy.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract AccountFactory is
    IAccountFactory,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    uint256 internal _version;

    mapping(address => address) public override accounts;
    address public override exchange;

    modifier onlyExchange() {
        require(msg.sender == exchange, "msg.sender: not exchange");
        _;
    }

    function version() external view override returns (uint256) {
        return _version;
    }

    function initialize(address _exchange) external virtual initializer {
        require(_exchange != address(0), "exchange: zero address");
        exchange = _exchange;
        _version = 1;

        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function createAccount(
        address accountOwner,
        address delegatedAccount,
        uint256 delegatedAccountExpiration
    ) external override onlyExchange returns (address account) {
        require(
            accounts[accountOwner] == address(0),
            "account: already created"
        );

        account = _createAccount();
        accounts[accountOwner] = account;
        emit AccountCreated(accountOwner, account);

        IAccount(account).initialize(
            accountOwner,
            exchange,
            delegatedAccount,
            delegatedAccountExpiration
        );
    }

    function upgradeVersion(uint256 newVersion) external onlyOwner {
        require(newVersion != 0, "newVersion: zero");

        _version = newVersion;
        emit VersionUpgraded(newVersion);
    }

    function _createAccount() private returns (address) {
        AccountProxy accountProxy = new AccountProxy(exchange, _version);
        return address(accountProxy);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
