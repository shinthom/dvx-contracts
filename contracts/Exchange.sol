// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;

import "./Account.sol";
import "./interfaces/IExchange.sol";

contract Exchange is IExchange {
    address private _owner;

    uint256 private _totalAccount;
    mapping(address => address) private _accounts; // wallet => account

    mapping(address => bool) private _registeredTokens;
    mapping(address => bool) private _registeredAdapters;

    uint256 private _positionFeeBasisPoints;

    constructor() {
        _owner = msg.sender;
    }

    function account(address wallet) public view returns (address) {
        return _accounts[wallet];
    }

    function totalAccount() public view returns (uint256) {
        return _totalAccount;
    }

    function isRegisteredAdapter(address adapter) public view returns (bool) {
        return _registeredAdapters[adapter];
    }

    function isRegisteredToken(address token) public view returns (bool) {
        return _registeredTokens[token];
    }

    function _createAccount() private returns (Account account) {
        account = new Account(msg.sender, address(this));
        emit AccountCreated(msg.sender, address(account));

        _accounts[msg.sender] = address(account);
        _totalAccount++;
    }

    function createAccount() external returns (address) {
        Account account = _createAccount();
        return address(account);
    }

    function createAccountAndDeposit(address token, uint256 amount)
        external
        payable
        returns (address)
    {
        Account account = _createAccount();

        token == address(0) ?
            account.deposit{value: msg.value}(address(0), amount) :
            account.deposit(token, amount);
        return address(account);
    }

    function registerAdapter(address adapter) external {
        require(msg.sender == _owner, "NOT_OWNER");
        _registeredAdapters[adapter] = true;
    }

    function unregisterAdapter(address adapter) external {
        require(msg.sender == _owner, "NOT_OWNER");
        _registeredAdapters[adapter] = false;
    }

    function registerToken(address token) external {
        require(msg.sender == _owner, "NOT_OWNER");
        _registeredTokens[token] = true;
    }

    function unregisterToken(address token) external {
        require(msg.sender == _owner, "NOT_OWNER");
        _registeredTokens[token] = false;
    }
}
