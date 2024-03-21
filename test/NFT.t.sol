// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {Test} from "forge-std/Test.sol";
import {NFT} from "../contracts/token/NFT.sol";

contract NFTTest is Test {
    NFT internal nft;

    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    function setUp() public {
        nft = new NFT();
    }

    function test_mint_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert("Ownable: caller is not the owner");
        nft.mint(alice, 1, 1);

        nft.mint(alice, 1, 5);
        assertEq(nft.balanceOf(alice, 1), 5);
    }

    function test_mintBatch() public {
        uint256[] memory ids = new uint256[](2);
        ids[0] = 1;
        ids[1] = 2;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 3;
        amounts[1] = 7;

        nft.mintBatch(alice, ids, amounts);
        assertEq(nft.balanceOf(alice, 1), 3);
        assertEq(nft.balanceOf(alice, 2), 7);
    }

    function test_airdrop() public {
        address[] memory accounts = new address[](2);
        accounts[0] = alice;
        accounts[1] = bob;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1;
        amounts[1] = 2;

        nft.airdrop(accounts, 1, amounts);
        assertEq(nft.balanceOf(alice, 1), 1);
        assertEq(nft.balanceOf(bob, 1), 2);
    }

    function test_airdrop_validation() public {
        address[] memory accounts = new address[](2);
        accounts[0] = alice;
        accounts[1] = bob;
        uint256[] memory badLength = new uint256[](1);
        badLength[0] = 1;

        vm.expectRevert("length mismatch");
        nft.airdrop(accounts, 1, badLength);

        uint256[] memory zeroAmount = new uint256[](2);
        zeroAmount[0] = 1;
        zeroAmount[1] = 0;

        vm.expectRevert("zero amount");
        nft.airdrop(accounts, 1, zeroAmount);
    }

    function test_burn() public {
        nft.mint(alice, 1, 5);

        vm.prank(alice);
        vm.expectRevert("Ownable: caller is not the owner");
        nft.burn(alice, 1, 1);

        nft.burn(alice, 1, 2);
        assertEq(nft.balanceOf(alice, 1), 3);
    }

    function test_burnBatch() public {
        uint256[] memory ids = new uint256[](2);
        ids[0] = 1;
        ids[1] = 2;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 3;
        amounts[1] = 7;
        nft.mintBatch(alice, ids, amounts);

        nft.burnBatch(alice, ids, amounts);
        assertEq(nft.balanceOf(alice, 1), 0);
        assertEq(nft.balanceOf(alice, 2), 0);
    }

    function test_setURI() public {
        assertEq(nft.uri(1), "");

        nft.setURI(1, "ipfs://token-1");
        assertEq(nft.uri(1), "ipfs://token-1");

        vm.prank(alice);
        vm.expectRevert("Ownable: caller is not the owner");
        nft.setURI(1, "x");
    }

    function test_transferAllowed() public {
        nft.mint(alice, 1, 5);

        vm.prank(alice);
        nft.safeTransferFrom(alice, bob, 1, 2, "");
        assertEq(nft.balanceOf(bob, 1), 2);
    }
}
