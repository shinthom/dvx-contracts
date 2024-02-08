// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IWarehouse} from "./IWarehouse.sol";

// prettier-ignore

interface IExchange {
    struct MarketOrder {
        address collateral;
        address index;
        uint256 collateralAmount;
        uint256 size;
        bool isLong;
    }

    event AccountFactorySet(address indexed accountFactory);
    event WarehouseSet(address indexed warehouse);
    event LoggerSet(address indexed logger);

    event AdapterRegistered(address indexed adapter);
    event AdapterUnregistered(address indexed adapter);
    event StableTokenSet(address indexed token, bool isStable);
    event DefaultStableTokenSet(address indexed token);

    event FeeCollectorSet(address indexed feeCollector);
    event OrderKeeperSet(address indexed orderKeeper, bool isActive);
    event RelayerSet(address indexed relayer, bool isActive);

    event PositionFeeRateSet(uint256 indexed feeRate);
    event SwapFeeRateSet(uint256 indexed feeRate);
    event AccmAddMarginFeeRateSet(uint256 indexed feeRate);
    event AccmSubMarginFeeRateSet(uint256 indexed feeRate);

    event TierSet(uint8 indexed tierId, uint256 discount);
    event ReferralTierSet(address indexed referral, uint8 indexed tierId);

    event ExecutionFeeCollected(address indexed account, address indexed token, uint256 amount);
    event ProtocolFeeCollected(address indexed account, address indexed token, uint256 amount);
    event DebtCollected(address indexed account, address indexed token, uint256 amount, uint256 debt);

    function accountFactory() external returns (address);
    function warehouse() external returns (address);
    function swapper() external returns (address);
    function logger() external returns (address);

    function isRegisteredAdapter(address adapter) external view returns (bool);
    function isStableToken(address token) external view returns (bool);
    function defaultStableToken() external view returns (address);

    function feeCollector() external returns (address);
    function isOrderKeeper(address account) external view returns (bool);
    function isRelayer(address account) external view returns (bool);

    function positionFeeRate() external view returns (uint256);
    function swapFeeRate() external view returns (uint256);
    function addAcmmMarginFeeRate() external view returns (uint256);
    function subAcmmMarginFeeRate() external view returns (uint256);

    function tiers(uint8) external view returns (uint256);
    function referralTiers(address) external view returns (uint8);

    function setAccountFactory(address _accountFactory) external;
    function setWarehouse(address _warehouse) external;
    function setSwapper(address _swapper) external;
    function setLogger(address _logger) external;

    function registerAdapter(address adapter) external;
    function unregisterAdapter(address adapter) external;
    function setStableToken(address token, bool isStable) external;
    function setDefaultStableToken(address token) external;

    function setFeeCollector(address _feeCollector) external;
    function setOrderKeeper(address account, bool isActive) external;
    function setRelayer(address relayer, bool isActive) external;

    function setPositionFeeRate(uint256 feeRate) external;
    function setSwapFeeRate(uint256 feeRate) external;
    function setAcmmAddMarginFeeRate(uint256 feeRate) external;
    function setAcmmSubMarginFeeRate(uint256 feeRate) external;

    function setTier(uint8 tierId, uint256 discountRate) external;
    function setReferralTier(address account, uint8 tierId) external;

    function createAccount(
        address delegatedWallet,
        uint256 expiration
    ) external returns (address account);
    function createAccountAndDeposit(
        address delegatedWallet,
        uint256 expiration,
        address token,
        uint256 amount
    ) external returns (address account);

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (uint256);

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
        uint256 limitOrderId
    ) external returns (IWarehouse.LimitOrder memory limitOrder);
    function executeLimitOrder(
        address account,
        address adapter,
        uint256 limitOrderId
    ) external payable returns (IWarehouse.LimitOrder memory limitOrder);
    function executeLimitOrderMulti(
        address account,
        address[] calldata adapters,
        uint256 limitOrderId
    ) external payable returns (IWarehouse.LimitOrder memory limitOrder);

    function createTriggerOrder(
        address account,
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        IWarehouse.TriggerOrderType orderType,
        uint256 triggerPrice,
        uint256 acceptablePrice,
        uint256 executionFee
    ) external;
    function cancelTriggerOrder(
        address account,
        bytes32 positionKey,
        uint256 triggerOrderId
    ) external returns (IWarehouse.TriggerOrder memory triggerOrder);
    function executeTriggerOrder(
        bytes32 positionKey,
        uint256 triggerOrderId
    ) external returns (IWarehouse.TriggerOrder memory triggerOrder);

    function collectExecutionFee(
        address account,
        address token,
        uint256 amount
    ) external;
    function collectProtocolFee(
        address account,
        address token,
        uint256 amount
    ) external;
    function collectDebt(
        address account,
        address token,
        uint256 amount,
        uint256 debt
    ) external returns (uint256);

    function validateAddAcmmMargin(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 marginAmount
    ) external view returns (bool);
    function validateSubAcmmMargin(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 profitAmount
    ) external view returns (bool);

    function getAllRegisteredAdapters() external view returns (address[] memory);
    function getPositionFee(
        address adapter,
        address collateral,
        address index,
        uint256 size,
        bool isLong
    ) external view returns (uint256);
    function getSwapFee(uint256 amount) external view returns (uint256);
    function getAddAcmmMarginFee(uint256 marginAmount) external view returns (uint256);
    function getSubAcmmMarginFee(uint256 marginAmount) external view returns (uint256);
    function getProfitToken(
        address adapter,
        address collateral,
        address index,
        bool isLong
    ) external view returns (address);
}
