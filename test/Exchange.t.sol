// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {BaseTest} from "./Base.t.sol";
import {Exchange} from "../contracts/Exchange.sol";
import {MockAdapter} from "./mocks/MockAdapter.sol";

contract ExchangeV2Mock is Exchange {
    function ping() external pure returns (uint256) {
        return 2;
    }
}

contract ExchangeTest is BaseTest {
    event AdapterRegistered(address indexed adapter);
    event AdapterUnregistered(address indexed adapter);
    event FeeCollectorSet(address indexed feeCollector);
    event PositionFeeRateSet(uint256 feeRate);

    function test_initialize_setsOwner() public {
        assertEq(exchange.owner(), address(this));
    }

    function test_initialize_revertsWhenCalledTwice() public {
        vm.expectRevert("Initializable: contract is already initialized");
        exchange.initialize();
    }

    function test_setters_revertForNonOwner() public {
        vm.startPrank(user);

        vm.expectRevert("Ownable: caller is not the owner");
        exchange.setWarehouse(address(1));

        vm.expectRevert("Ownable: caller is not the owner");
        exchange.setFeeCollector(address(1));

        vm.expectRevert("Ownable: caller is not the owner");
        exchange.setPositionFeeRate(1);

        vm.expectRevert("Ownable: caller is not the owner");
        exchange.registerAdapter(address(1));

        vm.stopPrank();
    }

    function test_setters_revertForZeroAddress() public {
        vm.expectRevert("accountFactory: zero address");
        exchange.setAccountFactory(address(0));

        vm.expectRevert("warehouse: zero address");
        exchange.setWarehouse(address(0));

        vm.expectRevert("feeCollector: zero address");
        exchange.setFeeCollector(address(0));

        vm.expectRevert("stableToken: zero address");
        exchange.setDefaultStableToken(address(0));

        vm.expectRevert("implementation: zero address");
        exchange.addAccountImplementation(2, address(0));
    }

    function test_addAccountImplementation_revertsForDuplicateVersion() public {
        vm.expectRevert("version: already added");
        exchange.addAccountImplementation(1, address(0xBEEF));
    }

    function test_registerAdapter() public {
        MockAdapter newAdapter = new MockAdapter();

        vm.expectEmit(true, false, false, true);
        emit AdapterRegistered(address(newAdapter));
        exchange.registerAdapter(address(newAdapter));

        assertTrue(exchange.isRegisteredAdapter(address(newAdapter)));
        assertEq(exchange.getAllRegisteredAdapters().length, 2);

        vm.expectRevert("adapter: already registered");
        exchange.registerAdapter(address(newAdapter));
    }

    function test_unregisterAdapter() public {
        MockAdapter newAdapter = new MockAdapter();
        exchange.registerAdapter(address(newAdapter));

        vm.expectEmit(true, false, false, true);
        emit AdapterUnregistered(address(adapter));
        exchange.unregisterAdapter(address(adapter));

        assertFalse(exchange.isRegisteredAdapter(address(adapter)));

        address[] memory adapters = exchange.getAllRegisteredAdapters();
        assertEq(adapters.length, 1);
        assertEq(adapters[0], address(newAdapter));

        vm.expectRevert("adapter: not registered");
        exchange.unregisterAdapter(address(adapter));
    }

    function test_collateralAndIndexTokenManagement() public {
        address newToken = address(0x1234);
        address[] memory tokens = new address[](1);
        tokens[0] = newToken;

        exchange.addCollateralTokens(tokens);
        assertTrue(exchange.isSupportedCollateralToken(newToken));

        exchange.removeCollateralTokens(tokens);
        assertFalse(exchange.isSupportedCollateralToken(newToken));

        exchange.addIndexTokens(tokens);
        assertTrue(exchange.isSupportedIndexToken(newToken));

        exchange.removeIndexTokens(tokens);
        assertFalse(exchange.isSupportedIndexToken(newToken));
    }

    function test_feeRates_revertAboveBasisPoints() public {
        vm.expectRevert("feeRate: invalid");
        exchange.setPositionFeeRate(BASIS_POINTS + 1);

        vm.expectRevert("feeRate: invalid");
        exchange.setSwapFeeRate(BASIS_POINTS + 1);

        vm.expectRevert("feeRate: invalid");
        exchange.setAcmmAddMarginFeeRate(BASIS_POINTS + 1);

        vm.expectRevert("feeRate: invalid");
        exchange.setAcmmSubMarginFeeRate(BASIS_POINTS + 1);
    }

    function test_getSwapFee() public {
        assertEq(exchange.getSwapFee(1_000e6), 0); // rate not set

        exchange.setSwapFeeRate(100_000); // 0.1%
        assertEq(exchange.getSwapFee(1_000e6), 1e6);
    }

    function test_getAcmmMarginFees() public {
        assertEq(exchange.getAddAcmmMarginFee(1_000e6), 0);
        assertEq(exchange.getSubAcmmMarginFee(1_000e6), 0);

        exchange.setAcmmAddMarginFeeRate(1_000_000); // 1%
        exchange.setAcmmSubMarginFeeRate(2_000_000); // 2%

        assertEq(exchange.getAddAcmmMarginFee(1_000e6), 10e6);
        assertEq(exchange.getSubAcmmMarginFee(1_000e6), 20e6);
    }

    function test_getPositionFee() public {
        // size==0 or rate==0 -> 0
        assertEq(
            exchange.getPositionFee(address(adapter), address(usdc), address(wbtc), 0, true),
            0
        );

        exchange.setPositionFeeRate(100_000); // 0.1%
        adapter.setWrapPrice(30_000e18);

        // size 1 WBTC (1e8), price applies to both index and collateral in the mock,
        // so feeUsd = size * price * rate / 1e8 / 1e8 and
        // fee = feeUsd * 1e8 / price = size * rate / 1e8 = 0.001 WBTC
        uint256 fee = exchange.getPositionFee(
            address(adapter),
            address(wbtc),
            address(wbtc),
            1e8,
            true
        );
        assertEq(fee, 1e5);
    }

    function test_tiers() public {
        vm.expectRevert("tierId: zero");
        exchange.setTier(0, 1);

        vm.expectRevert("discountRate: invalid");
        exchange.setTier(1, BASIS_POINTS + 1);

        exchange.setTier(1, 5_000_000);
        assertEq(exchange.tiers(1), 5_000_000);

        exchange.setReferralTier(user, 1);
        assertEq(exchange.referralTiers(user), 1);
    }

    function test_createAccount_registersInFactory() public {
        address newUser = makeAddr("newUser");
        address created = exchange.createAccount(
            newUser,
            delegate,
            block.timestamp + 1 days
        );

        assertEq(exchange.getAccount(newUser), created);
        assertEq(exchange.accountImplementation(1) == address(0), false);
    }

    function test_onlyAccount_rejectsNonAccountCaller() public {
        vm.expectRevert();
        vm.prank(user);
        exchange.addFeeDebt(address(usdc), 1);
    }

    function test_uupsUpgrade() public {
        ExchangeV2Mock v2 = new ExchangeV2Mock();

        vm.prank(user);
        vm.expectRevert("Ownable: caller is not the owner");
        exchange.upgradeTo(address(v2));

        exchange.upgradeTo(address(v2));
        assertEq(ExchangeV2Mock(payable(address(exchange))).ping(), 2);
        // state preserved across upgrade
        assertTrue(exchange.isRegisteredAdapter(address(adapter)));
    }
}
