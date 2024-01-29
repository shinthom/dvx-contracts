// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IAccount} from "./interfaces/IAccount.sol";
import {IERC20} from "./interfaces/IERC20.sol";
import {IAdapter} from "./interfaces/IAdapter.sol";
import {IAccountFactory} from "./interfaces/IAccountFactory.sol";
import {IExchange} from "./interfaces/IExchange.sol";
import {IWarehouse} from "./interfaces/IWarehouse.sol";
import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract Exchange is IExchange, OwnableUpgradeable, UUPSUpgradeable {
    address private constant _weth = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    address private constant _swapRouter =
        0xE592427A0AEce92De3Edee1F18E0157C05861564; // uniswap V3

    uint256 public constant BASIS_POINTS = 100_000_000;

    address public override accountFactory;
    address public override warehouse;
    address public override logger;

    address[] private _registeredAdapters;
    mapping(address => bool) public override isRegisteredAdapter;
    mapping(address => bool) public override isStableToken;
    address public override defaultStableToken =
        0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8; // usdc.e

    address public override feeCollector;
    mapping(address => bool) public override isOrderKeeper;

    uint256 public override minExecutionFee; // todo: limit/trigger
    uint256 public override positionFeeRate; // open position fee rate
    uint256 public override depositFeeRate; // increase collateral fee rate
    uint256 public override swapFeeRate;

    mapping(uint8 => uint256) public override tiers;
    mapping(address => uint8) public override referralTiers;

    receive() external payable {}

    function initialize() external virtual initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function setAccountFactory(
        address _accountFactory
    ) external override onlyOwner {
        require(_accountFactory != address(0), "accountFactory: zero address");

        accountFactory = _accountFactory;
        emit AccountFactorySet(_accountFactory);
    }

    function setWarehouse(address _warehouse) external override onlyOwner {
        require(_warehouse != address(0), "warehouse: zero address");

        warehouse = _warehouse;
        emit WarehouseSet(_warehouse);
    }

    function setLogger(address _logger) external override onlyOwner {
        require(_logger != address(0), "logger: zero address");

        logger = _logger;
        emit LoggerSet(_logger);
    }

    function registerAdapter(address adapter) external override onlyOwner {
        require(adapter != address(0), "adapter: zero address");
        require(!isRegisteredAdapter[adapter], "adapter: already registered");

        _registeredAdapters.push(adapter);

        isRegisteredAdapter[adapter] = true;
        emit AdapterRegistered(adapter);
    }

    function unregisterAdapter(address adapter) external override onlyOwner {
        require(adapter != address(0), "adapter: zero address");
        require(isRegisteredAdapter[adapter], "adapter: not registered");

        uint256 length = _registeredAdapters.length;
        for (uint256 i = 0; i < length; i++) {
            if (_registeredAdapters[i] == adapter) {
                _registeredAdapters[i] = _registeredAdapters[length - 1];
                _registeredAdapters.pop();
                break;
            }
        }

        isRegisteredAdapter[adapter] = false;
        emit AdapterUnregistered(adapter);
    }

    function setStableToken(
        address token,
        bool isStable
    ) external override onlyOwner {
        isStableToken[token] = isStable;
        emit StableTokenSet(token, isStable);
    }

    function setDefaultStableToken(
        address stableToken
    ) external override onlyOwner {
        require(stableToken != address(0), "stableToken: zero address");

        defaultStableToken = stableToken;
        emit DefaultStableTokenSet(stableToken);
    }

    function setFeeCollector(
        address _feeCollector
    ) external override onlyOwner {
        require(_feeCollector != address(0), "feeCollector: zero address");

        feeCollector = _feeCollector;
        emit FeeCollectorSet(_feeCollector);
    }

    function setOrderKeeper(
        address orderKeeper,
        bool isActive
    ) external override onlyOwner {
        require(orderKeeper != address(0), "exchange: zero address");

        isOrderKeeper[orderKeeper] = isActive;
        emit OrderKeeperSet(orderKeeper, isActive);
    }

    function setMinExecutionFee(uint256 fee) external override onlyOwner {
        minExecutionFee = fee;
        emit MinExecutionFeeSet(fee);
    }

    function setPositionFeeRate(uint256 _feeRate) external override onlyOwner {
        require(_feeRate <= BASIS_POINTS, "feeRate: invalid");

        positionFeeRate = _feeRate;
        emit PositionFeeRateSet(_feeRate);
    }

    function setDepositFeeRate(uint256 _feeRate) external override onlyOwner {
        require(_feeRate <= BASIS_POINTS, "feeRate: invalid");

        depositFeeRate = _feeRate;
        emit DepositFeeRateSet(_feeRate);
    }

    function setSwapFeeRate(uint256 _feeRate) external override onlyOwner {
        require(_feeRate <= BASIS_POINTS, "feeRate: invalid");

        swapFeeRate = _feeRate;
        emit SwapFeeRateSet(_feeRate);
    }

    function setTier(
        uint8 tierId,
        uint256 discountRate
    ) external override onlyOwner {
        require(tierId != 0, "tierId: zero");
        require(discountRate <= BASIS_POINTS, "discountRate: invalid");

        tiers[tierId] = discountRate;
        emit TierSet(tierId, discountRate);
    }

    function setReferralTier(
        address account,
        uint8 tierId
    ) external override onlyOwner {
        referralTiers[account] = tierId;
        emit ReferralTierSet(account, tierId);
    }

    function createAccount() public override returns (address) {
        return IAccountFactory(accountFactory).createAccount(msg.sender);
    }

    function createAccountAndDeposit(
        address token,
        uint256 amount
    ) external override returns (address account) {
        account = createAccount();

        IERC20(token).transferFrom(msg.sender, address(this), amount);
        IERC20(token).approve(account, amount);
        IAccount(account).deposit(token, amount);
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) public virtual override returns (uint256 amountOut) {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        uint256 swapFee = getSwapFee(amountIn);
        if (swapFee > 0) {
            IERC20(tokenIn).transfer(feeCollector, swapFee);
        }

        amountIn -= swapFee;

        IERC20(tokenIn).approve(_swapRouter, amountIn);
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: 3000,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });
        amountOut = ISwapRouter(_swapRouter).exactInputSingle(params);
    }

    function createLimitOrder(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        // uint256 executionFee,
        uint256 triggerPrice,
        uint256 acceptablePrice
    ) external override {
        IWarehouse(warehouse).createLimitOrder(
            msg.sender,
            collateral,
            index,
            collateralAmount,
            size,
            isLong,
            triggerPrice,
            acceptablePrice
        );
    }

    function cancelLimitOrder(
        address account,
        uint256 limitOrderId
    ) external override returns (IWarehouse.LimitOrder memory) {
        return IWarehouse(warehouse).cancelLimitOrder(account, limitOrderId);
    }

    function executeLimitOrder(
        address account,
        address adapter,
        uint256 limitOrderId
    ) external payable override returns (IWarehouse.LimitOrder memory) {
        return
            IWarehouse(warehouse).executeLimitOrder(
                account,
                adapter,
                limitOrderId
            );
    }

    function executeLimitOrderMulti(
        address account,
        address[] calldata adapters,
        uint256 limitOrderId
    ) external payable override returns (IWarehouse.LimitOrder memory) {
        return
            IWarehouse(warehouse).executeLimitOrderMulti(
                account,
                adapters,
                limitOrderId
            );
    }

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
    ) external override {
        IWarehouse(warehouse).createTriggerOrder(
            account,
            adapter,
            collateral,
            index,
            isLong,
            size,
            orderType,
            triggerPrice,
            acceptablePrice,
            executionFee
        );
    }

    function cancelTriggerOrder(
        address account,
        bytes32 positionKey,
        uint256 triggerOrderId
    ) external override {
        IWarehouse(warehouse).cancelTriggerOrder(
            account,
            positionKey,
            triggerOrderId
        );
    }

    function executeTriggerOrder(
        bytes32 positionKey,
        uint256 triggerOrderId
    ) external override returns (IWarehouse.TriggerOrder memory) {
        return
            IWarehouse(warehouse).executeTriggerOrder(
                positionKey,
                triggerOrderId
            );
    }

    function getAllRegisteredAdapters()
        external
        view
        override
        returns (address[] memory)
    {
        return _registeredAdapters;
    }

    function getPositionFee(
        address adapter,
        address collateral,
        address index,
        uint256 size,
        bool isLong
    ) public view override returns (uint256) {
        if (size == 0 || positionFeeRate == 0) {
            return 0;
        }

        uint256 indexPrice = IAdapter(adapter).getWrapPrice(index, isLong);
        uint8 indexDecimals = IERC20(index).decimals();
        uint256 feeUsd = (size * indexPrice * positionFeeRate) /
            BASIS_POINTS /
            (10 ** indexDecimals);

        uint256 collateralPrice = IAdapter(adapter).getWrapPrice(
            collateral,
            isLong
        );
        uint8 collateralDecimals = IERC20(collateral).decimals();
        return (feeUsd * (10 ** collateralDecimals)) / collateralPrice;
    }

    function getDepositFee(
        uint256 collateralAmount
    ) public view override returns (uint256) {
        if (collateralAmount == 0 || depositFeeRate == 0) {
            return 0;
        }

        return (collateralAmount * depositFeeRate) / BASIS_POINTS;
    }

    function getSwapFee(
        uint256 tokenAmount
    ) public view override returns (uint256) {
        if (swapFeeRate == 0) {
            return 0;
        }
        return (tokenAmount * swapFeeRate) / BASIS_POINTS;
    }

    function getPnLToken(
        address adapter,
        address collateral,
        address index,
        bool isLong
    ) public view override returns (address) {
        return IAdapter(adapter).getPnLToken(collateral, index, isLong);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
