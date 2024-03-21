// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {BaseTest} from "./Base.t.sol";
import {IAccount} from "../contracts/interfaces/IAccount.sol";

contract AccountFactoryTest is BaseTest {
    event VersionUpgraded(uint256 indexed newVersion);

    function test_initialize_state() public {
        assertEq(factory.exchange(), address(exchange));
        assertEq(factory.version(), 1);
        assertEq(factory.owner(), address(this));

        vm.expectRevert("Initializable: contract is already initialized");
        factory.initialize(address(exchange));
    }

    function test_createAccount_onlyExchange() public {
        vm.prank(user);
        vm.expectRevert("msg.sender: not exchange");
        factory.createAccount(user, delegate, block.timestamp + 1 days);
    }

    function test_createAccount_revertsForDuplicateOwner() public {
        // `user` already has an account from BaseTest.setUp
        vm.expectRevert("account: already created");
        exchange.createAccount(user, delegate, block.timestamp + 1 days);
    }

    function test_createAccount_initializesAccount() public {
        address newUser = makeAddr("newUser");
        uint256 expiration = block.timestamp + 7 days;

        address created = exchange.createAccount(newUser, delegate, expiration);
        IAccount createdAccount = IAccount(created);

        assertEq(factory.accounts(newUser), created);
        assertEq(createdAccount.owner(), newUser);
        assertEq(createdAccount.exchange(), address(exchange));
        assertEq(createdAccount.beacon(), address(exchange));
        assertEq(createdAccount.version(), 1);
        assertEq(createdAccount.delegatedAccount(), delegate);
        assertEq(createdAccount.delegatedAccountExpiration(), expiration);
    }

    function test_upgradeVersion() public {
        vm.prank(user);
        vm.expectRevert("Ownable: caller is not the owner");
        factory.upgradeVersion(2);

        vm.expectRevert("newVersion: zero");
        factory.upgradeVersion(0);

        vm.expectEmit(true, false, false, true);
        emit VersionUpgraded(2);
        factory.upgradeVersion(2);
        assertEq(factory.version(), 2);

        // new accounts are created with the new version
        exchange.addAccountImplementation(2, exchange.accountImplementation(1));
        address newUser = makeAddr("v2User");
        address created = exchange.createAccount(
            newUser,
            delegate,
            block.timestamp + 1 days
        );
        assertEq(IAccount(created).version(), 2);
    }
}
