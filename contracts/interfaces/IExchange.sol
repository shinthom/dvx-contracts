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
        address[] path;
        address index;
        uint256 collateralAmount;
        uint256 size;
        bool isLong;
    }

    event WarehouseSet(address indexed warehouse);

    event AccountCreated(address indexed owner, address indexed account);

    event StableTokenSet(address indexed token, bool isStable);

    event AdapterRegistered(address indexed adapter, bool isRegistered);

    event TierSet(uint8 indexed tierId, uint256 discount);

    event ReferralTierSet(address indexed referral, uint8 indexed tierId);

    event OpenPositionFeeRateSet(uint256 indexed fee);

    event Withdrawn(
        address indexed account,
        address indexed token,
        uint256 amount
    );

    function lockedBalances(
        address account,
        address token
    ) external view returns (uint256);

    function warehouse() external returns (address);

    function isStableToken(address token) external view returns (bool);

    function getOpenPositionFee(uint256 amount) external view returns (uint256);

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
        address[] memory path,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 executionFee
    ) external payable;
}
