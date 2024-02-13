// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

// prettier-ignore

interface IAccountFactory {
    event AccountCreated(address indexed accountOwner, address indexed account);
    event VersionUpgraded(uint256 indexed newVersion);

    function version() external view returns (uint256);
    function accounts(address owner) external view returns (address);
    function exchange() external view returns (address);

    function createAccount(
        address accountOwner,
        address delegatedAccount,
        uint256 delegatedAccountExpiration
    ) external returns (address);
}
