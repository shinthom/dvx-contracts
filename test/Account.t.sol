// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {BaseTest} from "./Base.t.sol";
import {Account as DvxAccount} from "../contracts/account/Account.sol";
import {IAccount} from "../contracts/interfaces/IAccount.sol";
import {IWarehouse} from "../contracts/interfaces/IWarehouse.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {WETHMock} from "./mocks/WETHMock.sol";

contract AccountV2Mock is DvxAccount {
    function v2Ping() external pure returns (uint256) {
        return 2;
    }
}

contract AccountTest is BaseTest {
    function test_initialize_revertsWhenCalledTwice() public {
        vm.expectRevert("already initialized");
        account.initialize(user, address(exchange), delegate, block.timestamp + 1 days);
    }

    // ----- deposit -----

    function test_deposit_byOwner() public {
        usdc.mint(user, 1_000e6);

        vm.startPrank(user);
        usdc.approve(address(account), 1_000e6);
        account.deposit(address(usdc), 1_000e6, 0, 0, "");
        vm.stopPrank();

        assertEq(usdc.balanceOf(address(account)), 1_000e6);
        assertEq(account.getWithdrawableBalance(address(usdc)), 1_000e6);
    }

    function test_deposit_revertsForZeroAmount() public {
        vm.prank(user);
        vm.expectRevert("amount: zero");
        account.deposit(address(usdc), 0, 0, 0, "");
    }

    function test_deposit_revertsForUnsupportedToken() public {
        vm.prank(user);
        vm.expectRevert("token: not supported");
        account.deposit(address(0xBAD), 1, 0, 0, "");
    }

    function test_deposit_revertsForStranger() public {
        vm.prank(makeAddr("stranger"));
        vm.expectRevert("msg.sender: not owner or relayer");
        account.deposit(address(usdc), 1, 0, 0, "");
    }

    function test_deposit_byRelayerWithSignature() public {
        uint256 amount = 1_000e6;
        uint256 networkFee = 10e6;
        uint256 deadline = block.timestamp + 1 hours;

        usdc.mint(user, amount);
        vm.prank(user);
        usdc.approve(address(account), amount);

        bytes memory signature = _sign(
            delegatePk,
            keccak256(abi.encodePacked(address(usdc), amount, networkFee, deadline))
        );

        vm.prank(relayer);
        account.deposit(address(usdc), amount, networkFee, deadline, signature);

        assertEq(usdc.balanceOf(address(account)), amount - networkFee);
        assertEq(usdc.balanceOf(feeCollector), networkFee);
    }

    function test_deposit_byRelayer_revertsForInvalidSignature() public {
        uint256 deadline = block.timestamp + 1 hours;
        (, uint256 wrongPk) = makeAddrAndKey("wrongSigner");

        bytes memory signature = _sign(
            wrongPk,
            keccak256(abi.encodePacked(address(usdc), uint256(1e6), uint256(0), deadline))
        );

        vm.prank(relayer);
        vm.expectRevert("signature: invalid");
        account.deposit(address(usdc), 1e6, 0, deadline, signature);
    }

    function test_deposit_byRelayer_revertsForExpiredDeadline() public {
        uint256 deadline = block.timestamp - 1;

        bytes memory signature = _sign(
            delegatePk,
            keccak256(abi.encodePacked(address(usdc), uint256(1e6), uint256(0), deadline))
        );

        vm.prank(relayer);
        vm.expectRevert("deadline: expired");
        account.deposit(address(usdc), 1e6, 0, deadline, signature);
    }

    function test_deposit_byRelayer_revertsForExpiredDelegation() public {
        vm.warp(block.timestamp + 31 days); // past delegatedAccountExpiration
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory signature = _sign(
            delegatePk,
            keccak256(abi.encodePacked(address(usdc), uint256(1e6), uint256(0), deadline))
        );

        vm.prank(relayer);
        vm.expectRevert("delegatedAccount: expired");
        account.deposit(address(usdc), 1e6, 0, deadline, signature);
    }

    // ----- ETH / WETH -----

    function test_depositETH() public {
        vm.deal(user, 10 ether);

        vm.prank(user);
        vm.expectRevert("amount: not equal to msg.value");
        account.depositETH{value: 1 ether}(2 ether);

        vm.prank(user);
        account.depositETH{value: 1 ether}(1 ether);

        assertEq(IERC20(WETH).balanceOf(address(account)), 1 ether);
    }

    function test_receive_wrapsIncomingETH() public {
        vm.deal(user, 1 ether);
        vm.prank(user);
        (bool ok, ) = address(account).call{value: 1 ether}("");
        assertTrue(ok);

        assertEq(IERC20(WETH).balanceOf(address(account)), 1 ether);
    }

    function test_withdraw_weth_unwrapsToETH() public {
        vm.deal(user, 2 ether);
        vm.prank(user);
        account.depositETH{value: 2 ether}(2 ether);

        address recipient = makeAddr("recipient");
        vm.prank(user);
        account.withdraw(WETH, recipient, 1 ether, 0, 0, "");

        assertEq(recipient.balance, 1 ether);
        assertEq(IERC20(WETH).balanceOf(address(account)), 1 ether);
    }

    // ----- withdraw -----

    function test_withdraw_erc20() public {
        _fundAndDeposit(usdc, 1_000e6);

        vm.prank(user);
        account.withdraw(address(usdc), user, 400e6, 0, 0, "");

        assertEq(usdc.balanceOf(user), 400e6);
        assertEq(usdc.balanceOf(address(account)), 600e6);
    }

    function test_withdraw_revertsAboveWithdrawableBalance() public {
        _fundAndDeposit(usdc, 1_000e6);

        vm.prank(user);
        vm.expectRevert("amount: greater than withdrawable balance");
        account.withdraw(address(usdc), user, 1_001e6, 0, 0, "");
    }

    function test_withdraw_withNetworkFee() public {
        _fundAndDeposit(usdc, 1_000e6);
        uint256 deadline = block.timestamp + 1 hours;
        uint256 networkFee = 5e6;

        bytes memory signature = _sign(
            delegatePk,
            keccak256(
                abi.encodePacked(
                    address(usdc), user, uint256(100e6), networkFee, deadline
                )
            )
        );

        vm.prank(relayer);
        account.withdraw(address(usdc), user, 100e6, networkFee, deadline, signature);

        assertEq(usdc.balanceOf(user), 95e6);
        assertEq(usdc.balanceOf(feeCollector), 5e6);
    }

    // ----- swap -----

    function test_swap_viaExchangeAndSwapper() public {
        _fundAndDeposit(usdc, 1_000e6);

        vm.prank(user);
        account.swap(address(usdc), address(wbtc), 500e6, 0, 0, "");

        assertEq(usdc.balanceOf(address(account)), 500e6);
        assertEq(wbtc.balanceOf(address(account)), 500e6); // 1:1 mock rate
    }

    function test_swap_collectsSwapFee() public {
        exchange.setSwapFeeRate(1_000_000); // 1%
        _fundAndDeposit(usdc, 1_000e6);

        vm.prank(user);
        account.swap(address(usdc), address(wbtc), 100e6, 0, 0, "");

        assertEq(usdc.balanceOf(feeCollector), 1e6); // protocol fee
        assertEq(wbtc.balanceOf(address(account)), 99e6);
    }

    // ----- positions -----

    function test_increasePosition_byOwner() public {
        _fundAndDeposit(usdc, 1_000e6);

        vm.prank(user);
        account.increasePosition(
            address(adapter), address(usdc), address(wbtc),
            1_000e6, 1e8, true, 30_000e18, 0, 0, ""
        );
        // MockAdapter.increasePosition is a no-op; funds stay in the account
        assertEq(usdc.balanceOf(address(account)), 1_000e6);
    }

    function test_increasePosition_revertsForUnregisteredAdapter() public {
        _fundAndDeposit(usdc, 1_000e6);

        vm.prank(user);
        vm.expectRevert("adapter: not registered");
        account.increasePosition(
            address(0xBAD), address(usdc), address(wbtc),
            1_000e6, 1e8, true, 30_000e18, 0, 0, ""
        );
    }

    function test_increasePosition_revertsForUnsupportedTokens() public {
        _fundAndDeposit(usdc, 1_000e6);
        address unsupported = address(new WETHMock());

        vm.prank(user);
        vm.expectRevert("index: not supported");
        account.increasePosition(
            address(adapter), address(usdc), unsupported,
            1_000e6, 1e8, true, 30_000e18, 0, 0, ""
        );
    }

    function test_increasePosition_collectsPositionFee() public {
        exchange.setPositionFeeRate(100_000); // 0.1%
        adapter.setWrapPrice(30_000e18);
        _fundAndDeposit(wbtc, 1e8);

        // fee = size * rate / BASIS_POINTS (index/collateral share the mock price)
        vm.prank(user);
        account.increasePosition(
            address(adapter), address(wbtc), address(wbtc),
            1e8, 1e8, true, 30_000e18, 0, 0, ""
        );

        assertEq(wbtc.balanceOf(feeCollector), 1e5);
        assertEq(wbtc.balanceOf(address(account)), 1e8 - 1e5);
    }

    function test_decreasePosition_addsNetworkFeeDebt() public {
        _fundAndDeposit(usdc, 1_000e6);

        vm.prank(user);
        account.decreasePosition(
            address(adapter), address(usdc), address(wbtc),
            true, 1e8, 30_000e18, 7e6, 0, ""
        );

        assertEq(account.getFeeDebt(address(usdc)), 7e6);
        assertEq(
            account.getWithdrawableBalance(address(usdc)),
            1_000e6 - 7e6
        );
    }

    function test_withdraw_settlesFeeDebt() public {
        _fundAndDeposit(usdc, 1_000e6);

        vm.prank(user);
        account.decreasePosition(
            address(adapter), address(usdc), address(wbtc),
            true, 1e8, 30_000e18, 7e6, 0, ""
        );

        vm.prank(user);
        account.withdraw(address(usdc), user, 100e6, 0, 0, "");

        assertEq(account.getFeeDebt(address(usdc)), 0);
        assertEq(usdc.balanceOf(feeCollector), 7e6);
        assertEq(usdc.balanceOf(user), 100e6);
    }

    function test_increaseCollateral_withSwap() public {
        _fundAndDeposit(usdc, 1_000e6);

        vm.prank(user);
        account.increaseCollateral(
            address(adapter), address(wbtc), address(wbtc), true,
            address(usdc), 500e6, 0, 0, ""
        );

        // usdc swapped into wbtc via the 1:1 mock swapper
        assertEq(usdc.balanceOf(address(account)), 500e6);
        assertEq(wbtc.balanceOf(address(account)), 500e6);
    }

    function test_decreaseCollateral() public {
        vm.prank(user);
        account.decreaseCollateral(
            address(adapter), address(usdc), address(wbtc), true,
            100e6, 0, 0, ""
        );
    }

    // ----- limit orders -----

    function _createLimitOrder(uint256 collateralAmount, uint256 executionFee) internal {
        vm.prank(user);
        account.createLimitOrder(
            address(usdc), address(wbtc),
            collateralAmount, 1e8, true,
            29_000e18, 30_000e18,
            0, executionFee, 0, ""
        );
    }

    function test_createLimitOrder_locksBalance() public {
        _fundAndDeposit(usdc, 1_000e6);
        _createLimitOrder(600e6, 1e6);

        assertEq(account.getLockedBalance(address(usdc)), 600e6);
        assertEq(account.getWithdrawableBalance(address(usdc)), 400e6);

        IWarehouse.LimitOrder memory order = warehouse.getLimitOrder(
            address(account), 0
        );
        assertEq(uint256(order.state), uint256(IWarehouse.LimitOrderState.Pending));
        assertEq(order.collateralAmount, 600e6);

        // locked balance cannot be withdrawn
        vm.prank(user);
        vm.expectRevert("amount: greater than withdrawable balance");
        account.withdraw(address(usdc), user, 500e6, 0, 0, "");
    }

    function test_cancelLimitOrder_unlocksBalance() public {
        _fundAndDeposit(usdc, 1_000e6);
        _createLimitOrder(600e6, 1e6);

        vm.prank(user);
        account.cancelLimitOrder(0, 0, 0, "");

        assertEq(account.getLockedBalance(address(usdc)), 0);
        assertEq(account.getWithdrawableBalance(address(usdc)), 1_000e6);
        assertEq(
            uint256(warehouse.getLimitOrder(address(account), 0).state),
            uint256(IWarehouse.LimitOrderState.Canceled)
        );
    }

    function test_executeLimitOrder_byOrderKeeper() public {
        _fundAndDeposit(usdc, 1_000e6);
        _createLimitOrder(600e6, 1e6);

        adapter.setWrapPrice(29_500e18); // <= acceptablePrice for long

        vm.prank(orderKeeper);
        account.executeLimitOrder(0, address(adapter));

        assertEq(account.getLockedBalance(address(usdc)), 0);
        assertEq(usdc.balanceOf(feeCollector), 1e6); // execution fee
        assertEq(
            uint256(warehouse.getLimitOrder(address(account), 0).state),
            uint256(IWarehouse.LimitOrderState.Executed)
        );
    }

    function test_executeLimitOrder_revertsForNonKeeper() public {
        _fundAndDeposit(usdc, 1_000e6);
        _createLimitOrder(600e6, 1e6);

        vm.prank(user);
        vm.expectRevert("msg.sender: not order keeper");
        account.executeLimitOrder(0, address(adapter));
    }

    // ----- trigger orders -----

    function test_executeTriggerOrder_byOrderKeeper() public {
        _fundAndDeposit(usdc, 1_000e6);
        adapter.setPositionSize(1e8);
        adapter.setWrapPrice(29_000e18);

        uint256 deadline = block.timestamp + 1 hours;
        uint256 networkFee = 3e6;
        bytes memory signature = _sign(
            delegatePk,
            keccak256(
                abi.encodePacked(
                    address(adapter), address(usdc), address(wbtc),
                    true, uint256(1e8),
                    IWarehouse.TriggerOrderType.TakeProfit,
                    uint256(30_000e18), uint256(30_000e18),
                    networkFee, deadline
                )
            )
        );

        vm.prank(orderKeeper);
        account.executeTriggerOrder(
            address(adapter), address(usdc), address(wbtc),
            true, 1e8,
            IWarehouse.TriggerOrderType.TakeProfit,
            30_000e18, 30_000e18,
            networkFee, deadline, signature
        );

        assertEq(account.getFeeDebt(address(usdc)), networkFee);
    }

    // ----- fee debt -----

    function test_collectFeeDebt_onlyOrderKeeper() public {
        _fundAndDeposit(usdc, 1_000e6);

        vm.prank(user);
        account.decreasePosition(
            address(adapter), address(usdc), address(wbtc),
            true, 1e8, 30_000e18, 7e6, 0, ""
        );

        vm.prank(user);
        vm.expectRevert("msg.sender: not order keeper");
        account.collectFeeDebt(address(usdc), 7e6);

        vm.prank(orderKeeper);
        vm.expectRevert("amount: greater than fee debt");
        account.collectFeeDebt(address(usdc), 8e6);

        vm.prank(orderKeeper);
        account.collectFeeDebt(address(usdc), 7e6);
        assertEq(account.getFeeDebt(address(usdc)), 0);
        assertEq(usdc.balanceOf(feeCollector), 7e6);
    }

    // ----- delegated account -----

    function test_renewDelegatedAccount() public {
        address newDelegate = makeAddr("newDelegate");
        uint256 newExpiration = block.timestamp + 60 days;

        vm.prank(relayer);
        vm.expectRevert("msg.sender: not owner");
        account.renewDelegatedAccount(newDelegate, newExpiration);

        vm.startPrank(user);

        vm.expectRevert("delegatedAccount: zero address");
        account.renewDelegatedAccount(address(0), newExpiration);

        vm.expectRevert("expiration: before now");
        account.renewDelegatedAccount(newDelegate, block.timestamp);

        account.renewDelegatedAccount(newDelegate, newExpiration);
        vm.stopPrank();

        assertEq(account.delegatedAccount(), newDelegate);
        assertEq(account.delegatedAccountExpiration(), newExpiration);
    }

    // ----- upgrade -----

    function test_upgrade_toNewImplementation() public {
        AccountV2Mock v2Impl = new AccountV2Mock();
        exchange.addAccountImplementation(2, address(v2Impl));

        vm.prank(relayer);
        vm.expectRevert("msg.sender: not owner");
        account.upgrade(2);

        vm.prank(user);
        vm.expectRevert("implementation: zero address");
        account.upgrade(3);

        vm.prank(user);
        account.upgrade(2);

        assertEq(account.version(), 2);
        assertEq(AccountV2Mock(payable(address(account))).v2Ping(), 2);
        // state preserved
        assertEq(account.owner(), user);
    }

    // ----- multicall -----

    function test_multicall_depositAndCreateLimitOrder() public {
        usdc.mint(user, 1_000e6);
        vm.prank(user);
        usdc.approve(address(account), 1_000e6);

        bytes[] memory calls = new bytes[](2);
        calls[0] = abi.encodeWithSelector(
            IAccount.deposit.selector, address(usdc), uint256(1_000e6),
            uint256(0), uint256(0), bytes("")
        );
        calls[1] = abi.encodeWithSelector(
            IAccount.createLimitOrder.selector,
            address(usdc), address(wbtc),
            uint256(600e6), uint256(1e8), true,
            uint256(29_000e18), uint256(30_000e18),
            uint256(0), uint256(1e6), uint256(0), bytes("")
        );

        vm.prank(user);
        DvxAccount(payable(address(account))).multicall(calls);

        assertEq(usdc.balanceOf(address(account)), 1_000e6);
        assertEq(account.getLockedBalance(address(usdc)), 600e6);
    }
}
