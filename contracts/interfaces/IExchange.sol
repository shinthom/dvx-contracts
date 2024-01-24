// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IWarehouse} from "./IWarehouse.sol";

interface IExchange {
    enum OrderType {
        IncreasePosition,
        DecreasePosition,
        IncreaseCollateral,
        DecreaseCollateral
    }

    struct MarketOrder {
        address collateral;
        address index;
        uint256 collateralAmount;
        uint256 size;
        bool isLong;
    }

    event WarehouseSet(address indexed warehouse);

    event AccountCreated(address indexed owner, address indexed account);

    event LoggerSet(address indexed logger);

    event StableTokenSet(address indexed token, bool isStable);

    event MinExecutionFeeSet(uint256 indexed fee);

    event DefaultStableTokenSet(address indexed token);

    event OrderKeeperSet(address indexed orderKeeper, bool isActive);

    event AdapterRegistered(address indexed adapter);

    event AdapterUnregistered(address indexed adapter);

    event TierSet(uint8 indexed tierId, uint256 discount);

    event ReferralTierSet(address indexed referral, uint8 indexed tierId);

    event FeeCollectorSet(address indexed feeCollector);

    event PositionFeeRateSet(uint256 indexed fee);

    event DepositFeeRateSet(uint256 indexed fee);

    event SwapFeeRateSet(uint256 indexed fee);

    event Withdrawn(
        address indexed account,
        address indexed token,
        uint256 amount
    );

    function defaultStableToken() external view returns (address);

    function lockedBalances(
        address account,
        address token
    ) external view returns (uint256);

    function logger() external returns (address);

    function warehouse() external returns (address);

    function feeCollector() external returns (address);

    function isStableToken(address token) external view returns (bool);

    function isRegisteredAdapter(address adapter) external view returns (bool);

    function isOrderKeeper(address account) external view returns (bool);

    function getPositionFee(
        address adapter,
        address collateral,
        address index,
        uint256 size,
        bool isLong
    ) external view returns (uint256);

    function getSwapFee(uint256 amount) external view returns (uint256);

    function getDepositFee(uint256 amount) external view returns (uint256);

    // function getMaxAdapterExecutionFee() external view returns (uint256);

    function createAccount() external returns (address account);

    function createAccountAndDeposit(
        address token,
        uint256 amount
    ) external payable returns (address account);

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external payable returns (uint256);

    function createLimitOrder(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 triggerPrice,
        uint256 acceptablePrice
    ) external;

    function cancelLimitOrder(
        address account,
        uint256 id
    ) external returns (IWarehouse.LimitOrder memory limitOrder);

    function executeLimitOrder(
        address account,
        address adapter,
        uint256 id
    ) external payable returns (IWarehouse.LimitOrder memory limitOrder);

    // function executeTriggerOrder(
    //     address account,
    //     address adapter,
    //     MarketOrder memory marketOrder
    // ) external payable;

    // function executeLimitOrder(
    //     address account,
    //     address adapter,
    //     MarketOrder memory marketOrder
    // ) external payable;
}
