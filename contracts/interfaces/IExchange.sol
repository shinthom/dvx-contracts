// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

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

    event StableTokenSet(address indexed token, bool isStable);

    event MinExecutionFeeSet(uint256 indexed fee);

    event DefaultStableTokenSet(address indexed token);

    event AdapterRegistered(address indexed adapter);

    event AdapterUnregistered(address indexed adapter);

    event TierSet(uint8 indexed tierId, uint256 discount);

    event ReferralTierSet(address indexed referral, uint8 indexed tierId);

    event OpenPositionFeeRateSet(uint256 indexed fee);

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

    function warehouse() external returns (address);

    function isStableToken(address token) external view returns (bool);

    function isRegisteredAdapter(address adapter) external view returns (bool);

    function getSwapFee(uint256 tokenAmount) external view returns (uint256);

    function getOpenPositionFee(uint256 amount) external view returns (uint256);

    function getMaxAdapterExecutionFee() external view returns (uint256);

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

    function executeTriggerOrder(
        address account,
        address adapter,
        MarketOrder memory marketOrder
    ) external payable;

    function executeLimitOrder(
        address account,
        address adapter,
        MarketOrder memory marketOrder
    ) external payable;

    function executeMarketOrder(
        address account,
        OrderType orderType,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 executionFee
    ) external payable;
}
