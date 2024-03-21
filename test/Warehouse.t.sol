// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {Warehouse} from "../contracts/Warehouse.sol";
import {IWarehouse} from "../contracts/interfaces/IWarehouse.sol";
import {MockAdapter} from "./mocks/MockAdapter.sol";

// The test contract itself plays the role of Exchange (onlyExchange caller).
contract WarehouseTest is Test {
    event LimitOrderCreated(address indexed account, uint256 indexed limitOrderId);
    event LimitOrderCanceled(address indexed account, uint256 indexed limitOrderId);
    event LimitOrderExecuted(address indexed account, uint256 indexed limitOrderId);
    event TriggerOrderExecuted(
        address indexed account,
        address indexed adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        IWarehouse.TriggerOrderType orderType,
        uint256 triggerPrice,
        uint256 acceptablePrice,
        uint256 networkFee
    );

    Warehouse internal warehouse;
    MockAdapter internal adapter;

    address internal account = address(0xAAAA);
    address internal collateral = address(0xC011);
    address internal index = address(0x1DE0);

    function setUp() public {
        Warehouse impl = new Warehouse();
        warehouse = Warehouse(address(new ERC1967Proxy(address(impl), "")));
        warehouse.initialize(address(this));

        adapter = new MockAdapter();
    }

    function _createOrder(bool isLong) internal {
        warehouse.createLimitOrder(
            account,
            collateral,
            index,
            1_000e6,
            1e8,
            isLong,
            29_000e18, // triggerPrice
            30_000e18, // acceptablePrice
            1e6 // executionFee
        );
    }

    function test_initialize_revertsForZeroExchange() public {
        Warehouse impl = new Warehouse();
        Warehouse fresh = Warehouse(address(new ERC1967Proxy(address(impl), "")));

        vm.expectRevert("exchange: zero address");
        fresh.initialize(address(0));
    }

    function test_onlyExchange_guardsMutations() public {
        vm.startPrank(address(0xDEAD));

        vm.expectRevert("msg.sender: not exchange");
        warehouse.createLimitOrder(account, collateral, index, 1, 1, true, 1, 1, 0);

        vm.expectRevert("msg.sender: not exchange");
        warehouse.cancelLimitOrder(account, 0);

        vm.expectRevert("msg.sender: not exchange");
        warehouse.executeLimitOrder(account, address(adapter), 0);

        vm.stopPrank();
    }

    function test_createLimitOrder_storesOrder() public {
        vm.expectEmit(true, true, false, true);
        emit LimitOrderCreated(account, 0);
        _createOrder(true);

        IWarehouse.LimitOrder memory order = warehouse.getLimitOrder(account, 0);
        assertEq(order.limitOrderId, 0);
        assertEq(uint256(order.state), uint256(IWarehouse.LimitOrderState.Pending));
        assertEq(order.account, account);
        assertEq(order.collateral, collateral);
        assertEq(order.index, index);
        assertEq(order.collateralAmount, 1_000e6);
        assertEq(order.size, 1e8);
        assertTrue(order.isLong);
        assertEq(order.triggerPrice, 29_000e18);
        assertEq(order.acceptablePrice, 30_000e18);
        assertEq(order.executionFee, 1e6);
        assertEq(order.createdAt, block.timestamp);

        assertEq(warehouse.getLimitOrders(account).length, 1);
    }

    function test_createLimitOrder_revertsForInvalidTriggerPrice() public {
        // long: triggerPrice must be <= acceptablePrice
        vm.expectRevert("triggerPrice: invalid");
        warehouse.createLimitOrder(
            account, collateral, index, 1, 1, true, 31_000e18, 30_000e18, 0
        );

        // short: triggerPrice must be >= acceptablePrice
        vm.expectRevert("triggerPrice: invalid");
        warehouse.createLimitOrder(
            account, collateral, index, 1, 1, false, 29_000e18, 30_000e18, 0
        );
    }

    function test_cancelLimitOrder() public {
        _createOrder(true);

        vm.expectEmit(true, true, false, true);
        emit LimitOrderCanceled(account, 0);
        warehouse.cancelLimitOrder(account, 0);

        IWarehouse.LimitOrder memory order = warehouse.getLimitOrder(account, 0);
        assertEq(uint256(order.state), uint256(IWarehouse.LimitOrderState.Canceled));

        vm.expectRevert("state: not pending");
        warehouse.cancelLimitOrder(account, 0);
    }

    function test_executeLimitOrder_long() public {
        _createOrder(true);

        // long: markPrice must be <= acceptablePrice
        adapter.setWrapPrice(31_000e18);
        vm.expectRevert("price: not acceptable");
        warehouse.executeLimitOrder(account, address(adapter), 0);

        adapter.setWrapPrice(30_000e18);
        vm.expectEmit(true, true, false, true);
        emit LimitOrderExecuted(account, 0);
        warehouse.executeLimitOrder(account, address(adapter), 0);

        IWarehouse.LimitOrder memory order = warehouse.getLimitOrder(account, 0);
        assertEq(uint256(order.state), uint256(IWarehouse.LimitOrderState.Executed));

        vm.expectRevert("state: not pending");
        warehouse.executeLimitOrder(account, address(adapter), 0);
    }

    function test_executeLimitOrder_short() public {
        warehouse.createLimitOrder(
            account, collateral, index, 1_000e6, 1e8, false, 31_000e18, 30_000e18, 0
        );

        // short: markPrice must be >= acceptablePrice
        adapter.setWrapPrice(29_000e18);
        vm.expectRevert("price: not acceptable");
        warehouse.executeLimitOrder(account, address(adapter), 0);

        adapter.setWrapPrice(30_500e18);
        warehouse.executeLimitOrder(account, address(adapter), 0);
    }

    function test_executeLimitOrderMulti_revertsIfAnyAdapterPriceBad() public {
        _createOrder(true);

        MockAdapter goodAdapter = new MockAdapter();
        goodAdapter.setWrapPrice(29_500e18);
        MockAdapter badAdapter = new MockAdapter();
        badAdapter.setWrapPrice(31_000e18);

        address[] memory adapters = new address[](2);
        adapters[0] = address(goodAdapter);
        adapters[1] = address(badAdapter);

        vm.expectRevert("price: not acceptable");
        warehouse.executeLimitOrderMulti(account, adapters, 0);

        badAdapter.setWrapPrice(30_000e18);
        warehouse.executeLimitOrderMulti(account, adapters, 0);

        IWarehouse.LimitOrder memory order = warehouse.getLimitOrder(account, 0);
        assertEq(uint256(order.state), uint256(IWarehouse.LimitOrderState.Executed));
    }

    function test_executeTriggerOrder() public {
        adapter.setPositionSize(0);
        vm.expectRevert("position: not exist");
        warehouse.executeTriggerOrder(
            account,
            address(adapter),
            collateral,
            index,
            true,
            1e8,
            IWarehouse.TriggerOrderType.TakeProfit,
            30_000e18,
            30_000e18,
            0
        );

        adapter.setPositionSize(1e8);
        adapter.setWrapPrice(31_000e18);
        vm.expectRevert("price: not acceptable");
        warehouse.executeTriggerOrder(
            account,
            address(adapter),
            collateral,
            index,
            true,
            1e8,
            IWarehouse.TriggerOrderType.TakeProfit,
            30_000e18,
            30_000e18,
            0
        );

        adapter.setWrapPrice(29_000e18);
        vm.expectEmit(true, true, false, true);
        emit TriggerOrderExecuted(
            account,
            address(adapter),
            collateral,
            index,
            true,
            1e8,
            IWarehouse.TriggerOrderType.TakeProfit,
            30_000e18,
            30_000e18,
            0
        );
        warehouse.executeTriggerOrder(
            account,
            address(adapter),
            collateral,
            index,
            true,
            1e8,
            IWarehouse.TriggerOrderType.TakeProfit,
            30_000e18,
            30_000e18,
            0
        );
    }

    function test_getPositionKey() public {
        bytes32 key = warehouse.getPositionKey(
            account, address(adapter), collateral, index, true
        );
        assertEq(
            key,
            keccak256(
                abi.encodePacked(account, address(adapter), collateral, index, true)
            )
        );
    }
}
