// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {Test} from "forge-std/Test.sol";
import {AlphaAccessCard} from "../contracts/token/AlphaAccessCard.sol";

contract AlphaAccessCardTest is Test {
    event Claimed(address indexed account, uint256 id, uint256 amount);

    AlphaAccessCard internal card;

    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    function setUp() public {
        card = new AlphaAccessCard();
    }

    function _whitelistAlice(uint256 id) internal {
        address[] memory accounts = new address[](1);
        accounts[0] = alice;
        card.addWhitelist(accounts, id);
    }

    function test_addWhitelist_onlyOwner() public {
        address[] memory accounts = new address[](1);
        accounts[0] = alice;

        vm.prank(alice);
        vm.expectRevert("Ownable: caller is not the owner");
        card.addWhitelist(accounts, 1);

        card.addWhitelist(accounts, 1);
        assertTrue(card.whitelist(alice, 1));
        assertFalse(card.whitelist(bob, 1));
    }

    function test_claim() public {
        _whitelistAlice(1);

        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit Claimed(alice, 1, 1);
        card.claim(1);

        assertEq(card.balanceOf(alice, 1), 1);
        assertTrue(card.claimed(alice, 1));
    }

    function test_claim_revertsWhenNotWhitelisted() public {
        vm.prank(bob);
        vm.expectRevert("not whitelisted");
        card.claim(1);
    }

    function test_claim_revertsWhenAlreadyClaimed() public {
        _whitelistAlice(1);

        vm.startPrank(alice);
        card.claim(1);

        vm.expectRevert("already claimed");
        card.claim(1);
        vm.stopPrank();
    }

    function test_airdrop_onlyOwner() public {
        address[] memory accounts = new address[](2);
        accounts[0] = alice;
        accounts[1] = bob;

        vm.prank(alice);
        vm.expectRevert("Ownable: caller is not the owner");
        card.airdrop(accounts, 1);

        card.airdrop(accounts, 1);
        assertEq(card.balanceOf(alice, 1), 1);
        assertEq(card.balanceOf(bob, 1), 1);
    }

    function test_soulbound_transfersRevert() public {
        _whitelistAlice(1);
        vm.prank(alice);
        card.claim(1);

        vm.prank(alice);
        vm.expectRevert("non-transferable");
        card.safeTransferFrom(alice, bob, 1, 1, "");
    }

    function test_uri() public {
        assertEq(card.uri(1), "");

        card.updateBaseUri("https://example.com/meta/");
        assertEq(card.uri(1), "https://example.com/meta/1");

        vm.prank(alice);
        vm.expectRevert("Ownable: caller is not the owner");
        card.updateBaseUri("x");
    }
}
