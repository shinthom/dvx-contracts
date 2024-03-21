// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {Test} from "forge-std/Test.sol";
import {AttendanceBook} from "../contracts/event/AttendanceBook.sol";
import {ERC20Mock} from "./mocks/ERC20Mock.sol";

contract AccountStub {
    address public owner;

    address public lastWithdrawToken;
    address public lastWithdrawTo;
    uint256 public lastWithdrawAmount;

    constructor(address owner_) {
        owner = owner_;
    }

    function withdraw(
        address token,
        address to,
        uint256 amount,
        uint256,
        uint256,
        bytes calldata
    ) external {
        lastWithdrawToken = token;
        lastWithdrawTo = to;
        lastWithdrawAmount = amount;
    }
}

contract AttendanceBookTest is Test {
    event CheckedIn(address indexed account, uint256 indexed day);

    AttendanceBook internal book;
    AccountStub internal account;
    ERC20Mock internal usdc;

    address internal user = address(0xABCD);
    address internal relayer = address(0xBEEF);

    uint256 internal startTime;
    uint256 internal endTime;

    function setUp() public {
        vm.warp(1_700_000_000);
        startTime = block.timestamp;
        endTime = startTime + 30 days;

        book = new AttendanceBook(startTime, endTime, relayer);
        account = new AccountStub(user);
        usdc = new ERC20Mock("USD Coin", "USDC", 6);
    }

    function test_constructor_validation() public {
        vm.expectRevert("invalid end time");
        new AttendanceBook(startTime, startTime, relayer);

        vm.expectRevert("invalid relayer");
        new AttendanceBook(startTime, endTime, address(0));
    }

    function test_changeRelayer() public {
        vm.prank(user);
        vm.expectRevert("Ownable: caller is not the owner");
        book.changeRelayer(user);

        vm.expectRevert("invalid relayer");
        book.changeRelayer(address(0));

        book.changeRelayer(user);
        assertEq(book.relayer(), user);
    }

    function test_expandEndTime_and_deactivate() public {
        vm.expectRevert("invalid end time");
        book.expandEndTime(endTime);

        book.expandEndTime(endTime + 1 days);
        assertEq(book.endTime(), endTime + 1 days);

        book.deactivate();
        assertEq(book.endTime(), block.timestamp);
    }

    function test_checkIn_byAccountOwner() public {
        vm.warp(startTime + 1 hours); // day 1

        vm.prank(user);
        vm.expectEmit(true, true, false, true);
        emit CheckedIn(address(account), 1);
        book.checkIn(address(account), address(usdc), 0, 0, "");

        assertEq(book.accountHistory(address(account), 1), 1);

        // same-day double check-in
        vm.prank(user);
        vm.expectRevert("already checked-in");
        book.checkIn(address(account), address(usdc), 0, 0, "");

        // next day is fine
        vm.warp(startTime + 1 days + 1 hours);
        vm.prank(user);
        book.checkIn(address(account), address(usdc), 0, 0, "");
        assertEq(book.accountHistory(address(account), 2), 1);
    }

    function test_checkIn_revertsForStranger() public {
        vm.warp(startTime + 1 hours);

        vm.prank(address(0x1234));
        vm.expectRevert("not account owner or relayer");
        book.checkIn(address(account), address(usdc), 0, 0, "");
    }

    function test_checkIn_byRelayer_pullsNetworkFee() public {
        vm.warp(startTime + 1 hours);

        vm.prank(relayer);
        book.checkIn(address(account), address(usdc), 5e6, block.timestamp, "");

        assertEq(account.lastWithdrawToken(), address(usdc));
        assertEq(account.lastWithdrawTo(), address(book));
        assertEq(account.lastWithdrawAmount(), 5e6);
    }

    function test_checkIn_respectsTimeWindow() public {
        // not started (block.timestamp == startTime is still "not started")
        vm.warp(startTime);
        vm.prank(user);
        vm.expectRevert("not started");
        book.checkIn(address(account), address(usdc), 0, 0, "");

        // ended
        vm.warp(endTime);
        vm.prank(user);
        vm.expectRevert("ended");
        book.checkIn(address(account), address(usdc), 0, 0, "");
    }

    function test_activated_and_getDay() public {
        vm.warp(startTime - 1);
        assertFalse(book.activated());
        assertEq(book.getDay(), 0);

        vm.warp(startTime + 1 hours);
        assertTrue(book.activated());
        assertEq(book.getDay(), 1);

        vm.warp(startTime + 10 days);
        assertEq(book.getDay(), 11);

        vm.warp(endTime + 1);
        assertFalse(book.activated());

        assertEq(book.getEndDay(), 30);
    }

    function test_history_and_totalCheckIn() public {
        vm.warp(startTime + 1 hours);
        vm.prank(user);
        book.checkIn(address(account), address(usdc), 0, 0, "");

        vm.warp(startTime + 2 days + 1 hours); // day 3
        vm.prank(user);
        book.checkIn(address(account), address(usdc), 0, 0, "");

        uint256[] memory history = book.getAccountHistory(address(account), 1, 3);
        assertEq(history.length, 3);
        assertEq(history[0], 1);
        assertEq(history[1], 0);
        assertEq(history[2], 1);

        assertEq(book.getTotalCheckIn(address(account), 1, 3), 2);

        vm.expectRevert("invalid from");
        book.getAccountHistory(address(account), 0, 3);

        vm.expectRevert("invalid to");
        book.getAccountHistory(address(account), 2, 1);
    }

    function test_ownerWithdrawals() public {
        usdc.mint(address(book), 100e6);
        vm.deal(address(book), 1 ether);

        vm.prank(user);
        vm.expectRevert("Ownable: caller is not the owner");
        book.withdraw(user, address(usdc), 100e6);

        book.withdraw(address(this), address(usdc), 100e6);
        assertEq(usdc.balanceOf(address(this)), 100e6);

        address payable receiver = payable(address(0xCAFE));
        book.withdrawETH(receiver, 1 ether);
        assertEq(receiver.balance, 1 ether);
    }
}
