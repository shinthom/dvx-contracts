// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IAccount} from "./interfaces/IAccount.sol";
import {IERC20} from "./interfaces/IERC20.sol";
import {IAdapter} from "./interfaces/IAdapter.sol";
import {IAccountFactory} from "./interfaces/IAccountFactory.sol";
import {IExchange} from "./interfaces/IExchange.sol";
import {IWarehouse} from "./interfaces/IWarehouse.sol";
import {ISwapper} from "./interfaces/ISwapper.sol";
import {IMarginManager} from "./interfaces/IMarginManager.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract Exchange is IExchange, OwnableUpgradeable, UUPSUpgradeable {
    address private constant _weth = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;

    uint256 public constant BASIS_POINTS = 1e8;

    address public override accountFactory;
    address public override warehouse;
    address public override marginManager;
    address public override swapper;
    address public override logger;

    address[] private _registeredAdapters;
    mapping(address => bool) public override isRegisteredAdapter;

    mapping(address => bool) public override isSupportedCollateralToken;
    mapping(address => bool) public override isSupportedIndexToken;
    mapping(address => bool) public override isStableToken;
    address public override defaultStableToken =
        0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8; // usdc.e

    address public override feeCollector;
    mapping(address => bool) public override isOrderKeeper;
    mapping(address => bool) public override isRelayer;

    uint256 public override positionFeeRate;
    uint256 public override swapFeeRate;
    uint256 public override addAcmmMarginFeeRate;
    uint256 public override subAcmmMarginFeeRate;

    mapping(uint8 => uint256) public override tiers;
    mapping(address => uint8) public override referralTiers;

    receive() external payable {}

    function initialize() external virtual initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    modifier onlyAccount(address account) {
        require(msg.sender == account, "msg.sender: not account");
        _;
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

    // todo: make external function
    function setSwapper(address _swapper) public virtual override onlyOwner {
        require(_swapper != address(0), "warehouse: zero address");

        swapper = _swapper;
        emit SwapperSet(_swapper);
    }

    function setMarginManager(
        address _marginManager
    ) public virtual override onlyOwner {
        require(_marginManager != address(0), "manager: zero address");

        marginManager = _marginManager;
        emit MarginManagerSet(_marginManager);
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

    function addCollateralTokens(
        address[] calldata tokens
    ) external override onlyOwner {
        for (uint256 i = 0; i < tokens.length; i++) {
            require(tokens[i] != address(0), "token: zero address");

            isSupportedCollateralToken[tokens[i]] = true;
            emit CollateralTokenAdded(tokens[i]);
        }
    }

    function addIndexTokens(
        address[] calldata tokens
    ) external override onlyOwner {
        for (uint256 i = 0; i < tokens.length; i++) {
            require(tokens[i] != address(0), "token: zero address");

            isSupportedIndexToken[tokens[i]] = true;
            emit IndexTokenAdded(tokens[i]);
        }
    }

    function removeCollateralTokens(address[] calldata tokens) external override onlyOwner {
        for (uint256 i = 0; i < tokens.length; i++) {
            require(tokens[i] != address(0), "token: zero address");

            isSupportedCollateralToken[tokens[i]] = false;
            emit CollateralTokenRemoved(tokens[i]);
        }
    }

    function removeIndexTokens(address[] calldata tokens) external override onlyOwner {
        for (uint256 i = 0; i < tokens.length; i++) {
            require(tokens[i] != address(0), "token: zero address");

            isSupportedIndexToken[tokens[i]] = false;
            emit IndexTokenRemoved(tokens[i]);
        }
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

    function setRelayer(
        address relayer,
        bool isActive
    ) external override onlyOwner {
        require(relayer != address(0), "exchange: zero address");

        isRelayer[relayer] = isActive;
        emit RelayerSet(relayer, isActive);
    }

    function setPositionFeeRate(uint256 _feeRate) external override onlyOwner {
        require(_feeRate <= BASIS_POINTS, "feeRate: invalid");

        positionFeeRate = _feeRate;
        emit PositionFeeRateSet(_feeRate);
    }

    function setSwapFeeRate(uint256 _feeRate) external override onlyOwner {
        require(_feeRate <= BASIS_POINTS, "feeRate: invalid");

        swapFeeRate = _feeRate;
        emit SwapFeeRateSet(_feeRate);
    }

    function setAcmmAddMarginFeeRate(
        uint256 _feeRate
    ) external override onlyOwner {
        require(_feeRate <= BASIS_POINTS, "feeRate: invalid");

        addAcmmMarginFeeRate = _feeRate;
        emit AccmAddMarginFeeRateSet(_feeRate);
    }

    function setAcmmSubMarginFeeRate(
        uint256 _feeRate
    ) external override onlyOwner {
        require(_feeRate <= BASIS_POINTS, "feeRate: invalid");

        subAcmmMarginFeeRate = _feeRate;
        emit AccmSubMarginFeeRateSet(_feeRate);
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

    function createAccount(
        address delegatedWallet,
        uint256 expiration
    ) public override returns (address) {
        return
            IAccountFactory(accountFactory).createAccount(
                msg.sender,
                delegatedWallet,
                expiration
            );
    }

    function createAccountAndDeposit(
        address delegatedWallet,
        uint256 expiration,
        address token,
        uint256 amount
    ) external override returns (address account) {
        account = createAccount(delegatedWallet, expiration);

        IERC20(token).transferFrom(msg.sender, address(this), amount);
        IERC20(token).approve(account, amount);
        IAccount(account).deposit(token, amount, 0, 0, "");
    }

    function swap(
        address account,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) public virtual override onlyAccount(account) returns (uint256, uint256) {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        uint256 swapFee = getSwapFee(amountIn);
        if (swapFee > 0) {
            require(amountIn >= swapFee, "amountIn: less than swapFee");
            collectProtocolFee(msg.sender, tokenIn, swapFee);
            amountIn -= swapFee;
        }

        IERC20(tokenIn).approve(swapper, amountIn);
        uint256 amountOut = ISwapper(swapper).swap(tokenIn, tokenOut, amountIn);

        IERC20(tokenOut).transfer(msg.sender, amountOut);
        return (amountOut, swapFee);
    }

    function createLimitOrder(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 triggerPrice,
        uint256 acceptablePrice,
        uint256 executionFee
    ) external override {
        IWarehouse(warehouse).createLimitOrder(
            msg.sender,
            collateral,
            index,
            collateralAmount,
            size,
            isLong,
            triggerPrice,
            acceptablePrice,
            executionFee
        );
    }

    function cancelLimitOrder(
        address account,
        uint256 limitOrderId
    )
        external
        override
        onlyAccount(account)
        returns (IWarehouse.LimitOrder memory)
    {
        return IWarehouse(warehouse).cancelLimitOrder(account, limitOrderId);
    }

    function executeLimitOrder(
        address account,
        address adapter,
        uint256 limitOrderId
    )
        external
        payable
        override
        onlyAccount(account)
        returns (IWarehouse.LimitOrder memory)
    {
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
    )
        external
        payable
        override
        onlyAccount(account)
        returns (IWarehouse.LimitOrder memory)
    {
        return
            IWarehouse(warehouse).executeLimitOrderMulti(
                account,
                adapters,
                limitOrderId
            );
    }

    function executeTriggerOrder(
        address account,
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        IWarehouse.TriggerOrderType orderType,
        uint256 triggerPrice,
        uint256 acceptablePrice
    ) external override onlyAccount(account) {
        IWarehouse(warehouse).executeTriggerOrder(
            account,
            adapter,
            collateral,
            index,
            isLong,
            size,
            orderType,
            triggerPrice,
            acceptablePrice
        );
    }

    function collectFeeDebt(
        address account,
        address token,
        uint256 amount
    ) external override {
        IERC20(token).transfer(feeCollector, amount);
        emit FeeDebtCollected(account, token, amount);
    }

    function collectNetworkFee(
        address account,
        address token,
        uint256 amount
    ) external override {
        IERC20(token).transfer(feeCollector, amount);
        emit NetworkFeeCollected(account, token, amount);
    }

    function collectExecutionFee(
        address account,
        address token,
        uint256 amount
    ) external override {
        IERC20(token).transfer(feeCollector, amount);
        emit ExecutionFeeCollected(account, token, amount);
    }

    function collectProtocolFee(
        address account,
        address token,
        uint256 amount
    ) public override {
        IERC20(token).transfer(feeCollector, amount);
        emit ProtocolFeeCollected(account, token, amount);
    }

    function validateAddAcmmMargin(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 marginAmount
    ) external view override returns (bool) {
        return
            IMarginManager(marginManager).validateAddAcmmMargin(
                adapter,
                collateral,
                index,
                isLong,
                marginAmount
            );
    }

    function validateSubAcmmMargin(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 marginAmount
    ) external view override returns (bool) {
        return
            IMarginManager(marginManager).validateSubAcmmMargin(
                adapter,
                collateral,
                index,
                isLong,
                marginAmount
            );
    }

    function getAccount(
        address _owner
    ) external view override returns (address) {
        return IAccountFactory(accountFactory).accounts(_owner);
    }

    function getPosition(
        address adapter,
        address account,
        address collateral,
        address index,
        bool isLong
    ) external view override returns (IAdapter.Position memory) {
        return
            IAdapter(adapter).getPosition(account, collateral, index, isLong);
    }

    function getWrapPosition(
        address adapter,
        address account,
        address collateral,
        address index,
        bool isLong
    ) external view override returns (IAdapter.Position memory) {
        return
            IAdapter(adapter).getWrapPosition(
                account,
                collateral,
                index,
                isLong
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

    function getSwapFee(
        uint256 tokenAmount
    ) public view override returns (uint256) {
        if (swapFeeRate == 0) {
            return 0;
        }
        return (tokenAmount * swapFeeRate) / BASIS_POINTS;
    }

    function getAddAcmmMarginFee(
        uint256 marginAmount
    ) public view override returns (uint256) {
        if (addAcmmMarginFeeRate == 0) {
            return 0;
        }
        return (marginAmount * addAcmmMarginFeeRate) / BASIS_POINTS;
    }

    function getSubAcmmMarginFee(
        uint256 marginAmount
    ) public view override returns (uint256) {
        if (subAcmmMarginFeeRate == 0) {
            return 0;
        }
        return (marginAmount * subAcmmMarginFeeRate) / BASIS_POINTS;
    }

    function getProfitToken(
        address adapter,
        address collateral,
        address index,
        bool isLong
    ) public view override returns (address) {
        return IAdapter(adapter).getProfitToken(collateral, index, isLong);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
