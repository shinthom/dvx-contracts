// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IAccount} from "../interfaces/IAccount.sol";
import {IAccountFactory} from "../interfaces/IAccountFactory.sol";

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract AccountFactory is
    IAccountFactory,
    OwnableUpgradeable,
    UUPSUpgradeable {

    mapping(address => address) public override accounts;

    address public override account; // targetContract
    address public override exchange;

    modifier onlyExchange() {
        require(msg.sender == exchange, "msg.sender: not exchange");
        _;
    }

    function initialize(address _account, address _exchange) external virtual initializer {
        require(_account != address(0), "account: zero address");
        require(_exchange != address(0), "exchange: zero address");

        account = _account;
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

        address clonedAccount = _cloneAccount();

        accounts[accountOwner] = clonedAccount;
        emit AccountCreated(accountOwner, clonedAccount);

        IAccount(clonedAccount).initialize(accountOwner, exchange);

        return address(account);
    }

    function setExchange(address _exchange) external override onlyOwner {
        require(_exchange != address(0), "exchange: zero address");

        exchange = _exchange;
        emit ExchangeSet(_exchange);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    function _cloneAccount() private returns (address clonedAccount) {
        bytes20 targetBytes = bytes20(account);
        assembly {
            let clone := mload(0x40)
            mstore(
                clone,
                0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000
            )
            mstore(add(clone, 0x14), targetBytes)
            mstore(
                add(clone, 0x28),
                0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000
            )
            clonedAccount := create(0, clone, 0x37)
        }
    }
}
