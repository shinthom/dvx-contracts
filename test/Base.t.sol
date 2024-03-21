// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {Exchange} from "../contracts/Exchange.sol";
import {Warehouse} from "../contracts/Warehouse.sol";
import {Account as DvxAccount} from "../contracts/account/Account.sol";
import {AccountFactory} from "../contracts/account/AccountFactory.sol";
import {Logger} from "../contracts/logger/Logger.sol";
import {IAccount} from "../contracts/interfaces/IAccount.sol";

import {ERC20Mock} from "./mocks/ERC20Mock.sol";
import {WETHMock} from "./mocks/WETHMock.sol";
import {MockAdapter} from "./mocks/MockAdapter.sol";
import {MockSwapper} from "./mocks/MockSwapper.sol";

abstract contract BaseTest is Test {
    // Account/Exchange hardcode Arbitrum WETH; a WETHMock is etched there.
    address internal constant WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    uint256 internal constant BASIS_POINTS = 1e8;

    Exchange internal exchange;
    Warehouse internal warehouse;
    AccountFactory internal factory;
    Logger internal logger;
    MockAdapter internal adapter;
    MockSwapper internal swapper;

    ERC20Mock internal usdc; // 6 decimals collateral/stable
    ERC20Mock internal wbtc; // 8 decimals index/collateral

    address internal user;
    address internal delegate;
    uint256 internal delegatePk;
    address internal relayer;
    address internal orderKeeper;
    address internal feeCollector;

    IAccount internal account;

    function setUp() public virtual {
        user = makeAddr("user");
        (delegate, delegatePk) = makeAddrAndKey("delegate");
        relayer = makeAddr("relayer");
        orderKeeper = makeAddr("orderKeeper");
        feeCollector = makeAddr("feeCollector");

        vm.etch(WETH, address(new WETHMock()).code);

        exchange = Exchange(payable(_deployProxy(address(new Exchange()))));
        exchange.initialize();

        warehouse = Warehouse(_deployProxy(address(new Warehouse())));
        warehouse.initialize(address(exchange));

        factory = AccountFactory(_deployProxy(address(new AccountFactory())));
        factory.initialize(address(exchange));

        logger = new Logger();
        adapter = new MockAdapter();
        swapper = new MockSwapper();

        usdc = new ERC20Mock("USD Coin", "USDC", 6);
        wbtc = new ERC20Mock("Wrapped BTC", "WBTC", 8);

        exchange.addAccountImplementation(1, address(new DvxAccount()));
        exchange.setAccountFactory(address(factory));
        exchange.setWarehouse(address(warehouse));
        exchange.setLogger(address(logger));
        exchange.setSwapper(address(swapper));
        exchange.setFeeCollector(feeCollector);
        exchange.registerAdapter(address(adapter));

        address[] memory collaterals = new address[](3);
        collaterals[0] = address(usdc);
        collaterals[1] = address(wbtc);
        collaterals[2] = WETH;
        exchange.addCollateralTokens(collaterals);

        address[] memory indexes = new address[](2);
        indexes[0] = address(wbtc);
        indexes[1] = WETH;
        exchange.addIndexTokens(indexes);

        exchange.setStableToken(address(usdc), true);
        exchange.setDefaultStableToken(address(usdc));
        exchange.setOrderKeeper(orderKeeper, true);
        exchange.setRelayer(relayer, true);

        // pre-fund swapper for 1:1 mock swaps
        usdc.mint(address(swapper), 1_000_000_000e6);
        wbtc.mint(address(swapper), 1_000_000e8);

        adapter.setWrapPrice(30_000e18);
        adapter.setPositionSize(0);

        account = IAccount(
            exchange.createAccount(user, delegate, block.timestamp + 30 days)
        );
    }

    function _deployProxy(address implementation) internal returns (address) {
        return address(new ERC1967Proxy(implementation, ""));
    }

    function _sign(
        uint256 privateKey,
        bytes32 messageHash
    ) internal pure returns (bytes memory) {
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, ethSignedHash);
        return abi.encodePacked(r, s, v);
    }

    function _fundAndDeposit(ERC20Mock token, uint256 amount) internal {
        token.mint(user, amount);
        vm.startPrank(user);
        token.approve(address(account), amount);
        account.deposit(address(token), amount, 0, 0, "");
        vm.stopPrank();
    }
}
