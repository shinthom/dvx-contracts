// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {Exchange} from "../contracts/Exchange.sol";
import {Warehouse} from "../contracts/Warehouse.sol";
import {Account as DvxAccount} from "../contracts/account/Account.sol";
import {AccountFactory} from "../contracts/account/AccountFactory.sol";
import {Logger} from "../contracts/logger/Logger.sol";
import {GmxV1Adapter} from "../contracts/adapters/GMXV1Adapter.sol";
import {MuxAdapter} from "../contracts/adapters/MuxAdapter.sol";
import {Quoter} from "../contracts/reader/Quoter.sol";
import {Reader} from "../contracts/reader/Reader.sol";
import {Swapper} from "../contracts/swapper/Swapper.sol";
import {AttendanceBook} from "../contracts/event/AttendanceBook.sol";

// Full protocol deployment for Arbitrum One (ported from scripts/deploy.js).
//
//   forge script script/Deploy.s.sol --rpc-url $ARBITRUM_RPC_URL --broadcast
contract Deploy is Script {
    // GMX V1
    address internal constant POSITION_ROUTER = 0xb87a436B93fFE9D75c5cFA7bAcFff96430b09868;
    address internal constant ROUTER = 0xaBBc5F99639c9B6bCb58544ddf04EFA6802F4064;
    address internal constant VAULT = 0x489ee077994B6658eAfA855C308275EAd8097C4A;
    address internal constant TIMELOCK = 0xe7E740Fa40CA16b15B621B49de8E9F0D69CF4858;

    // MUX
    address internal constant ORDER_BOOK = 0xa19fD5aB6C8DCffa2A295F78a5Bb4aC543AAF5e3;
    address internal constant LIQUIDITY_POOL = 0x3e0199792Ce69DC29A0a36146bFa68bd7C8D6633;

    // tokens
    address internal constant WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    address internal constant WBTC = 0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f;
    address internal constant USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
    address internal constant USDT = 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9;
    address internal constant USDCE = 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8;

    // operators
    address internal constant RELAYER = 0x00fA5725B63be9E95cd8F8AD0521F954Ff077130;
    address internal constant TRIGGER_ORDER_KEEPER = 0x649527cD2e866427413E4d5E9f2ccfe6a7a49046;
    address internal constant LIMIT_ORDER_KEEPER = 0x5b9C7D55dcf7BB890a5783Ce0f97ded842e8D0eF;
    address internal constant FEE_COLLECTOR = 0x69E8715b2E438fe759aF73e65B520B31ef4e55d1;

    function run() external {
        vm.startBroadcast();

        Exchange exchange = Exchange(
            payable(address(new ERC1967Proxy(address(new Exchange()), "")))
        );
        exchange.initialize();
        console.log("Exchange:", address(exchange));

        Warehouse warehouse = Warehouse(
            address(new ERC1967Proxy(address(new Warehouse()), ""))
        );
        warehouse.initialize(address(exchange));
        console.log("Warehouse:", address(warehouse));

        DvxAccount accountImplementation = new DvxAccount();
        console.log("Account implementation:", address(accountImplementation));

        AccountFactory accountFactory = AccountFactory(
            address(new ERC1967Proxy(address(new AccountFactory()), ""))
        );
        accountFactory.initialize(address(exchange));
        console.log("AccountFactory:", address(accountFactory));

        Logger logger = new Logger();
        console.log("Logger:", address(logger));

        GmxV1Adapter gmxV1Adapter = new GmxV1Adapter(
            POSITION_ROUTER,
            ROUTER,
            VAULT,
            TIMELOCK,
            address(exchange)
        );
        console.log("GmxV1Adapter:", address(gmxV1Adapter));

        MuxAdapter muxAdapter = new MuxAdapter(
            ORDER_BOOK,
            LIQUIDITY_POOL,
            address(exchange)
        );
        console.log("MuxAdapter:", address(muxAdapter));

        Quoter quoter = new Quoter();
        console.log("Quoter:", address(quoter));

        Reader reader = new Reader();
        console.log("Reader:", address(reader));

        Swapper swapper = new Swapper();
        console.log("Swapper:", address(swapper));

        exchange.addAccountImplementation(1, address(accountImplementation));
        exchange.setAccountFactory(address(accountFactory));
        exchange.setWarehouse(address(warehouse));
        exchange.setLogger(address(logger));
        exchange.setSwapper(address(swapper));
        exchange.setFeeCollector(FEE_COLLECTOR);

        exchange.registerAdapter(address(gmxV1Adapter));
        exchange.registerAdapter(address(muxAdapter));

        exchange.setStableToken(USDC, true);
        exchange.setStableToken(USDT, true);
        exchange.setStableToken(USDCE, true);
        exchange.setDefaultStableToken(USDCE);

        address[] memory collateralTokens = new address[](5);
        collateralTokens[0] = WBTC;
        collateralTokens[1] = WETH;
        collateralTokens[2] = USDCE;
        collateralTokens[3] = USDC;
        collateralTokens[4] = USDT;
        exchange.addCollateralTokens(collateralTokens);

        address[] memory indexTokens = new address[](2);
        indexTokens[0] = WBTC;
        indexTokens[1] = WETH;
        exchange.addIndexTokens(indexTokens);

        exchange.setOrderKeeper(TRIGGER_ORDER_KEEPER, true);
        exchange.setOrderKeeper(LIMIT_ORDER_KEEPER, true);
        exchange.setRelayer(RELAYER, true);

        // AttendanceBook (check-in event)
        uint256 startTime = 1708387200;
        AttendanceBook attendanceBook = new AttendanceBook(
            startTime,
            startTime + 86400 * 42,
            RELAYER
        );
        console.log("AttendanceBook:", address(attendanceBook));
        exchange.setRelayer(address(attendanceBook), true);

        vm.stopBroadcast();
    }
}
