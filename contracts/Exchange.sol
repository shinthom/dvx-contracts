// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IAccount, Account} from "./Account.sol";
import {IERC20} from "./interfaces/IERC20.sol";
import {IAdapter} from "./interfaces/IAdapter.sol";
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

    address public override warehouse;
    mapping(address => address) public accounts;

    address[] private registeredAdapters;
    mapping(address => bool) public override isRegisteredAdapter;
    mapping(address => bool) public override isStableToken;

    mapping(uint8 => uint256) public tiers;
    mapping(address => uint8) public referralTiers;

    uint256 public minExecutionFee; // limit / trigger order execution fee

    uint256 public openPositionFeeRate; // open position fee rate

    receive() external payable {}

    modifier onlyAccountOwner(address account) {
        require(account != address(0), "account: zero");
        require(accounts[msg.sender] == account, "account: not owner");
        _;
    }

    modifier onlyWarehouse() {
        require(msg.sender == warehouse, "msg.sender: not warehouse");
        _;
    }

    function initialize() external virtual initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    function setWarehouse(address _warehouse) external onlyOwner {
        warehouse = _warehouse;
        emit WarehouseSet(_warehouse);
    }

    function registerAdapter(address adapter) external onlyOwner {
        require(adapter != address(0), "adapter: zero address");
        require(!isRegisteredAdapter[adapter], "adapter: already registered");

        registeredAdapters.push(adapter);

        isRegisteredAdapter[adapter] = true;
        emit AdapterRegistered(adapter);
    }

    function unregisterAdapter(address adapter) external onlyOwner {
        require(adapter != address(0), "adapter: zero address");
        require(isRegisteredAdapter[adapter], "adapter: not registered");

        uint256 length = registeredAdapters.length;
        for (uint256 i = 0; i < length; i++) {
            if (registeredAdapters[i] == adapter) {
                registeredAdapters[i] = registeredAdapters[length - 1];
                registeredAdapters.pop();
                break;
            }
        }

        isRegisteredAdapter[adapter] = false;
        emit AdapterUnregistered(adapter);
    }

    function setMinExecutionFee(uint256 fee) external onlyOwner {
        minExecutionFee = fee;
        emit MinExecutionFeeSet(fee);
    }

    function setStableToken(address token, bool isStable) external onlyOwner {
        isStableToken[token] = isStable;
        emit StableTokenSet(token, isStable);
    }

    function setOpenPositionFeeRate(uint256 _feeRate) external onlyOwner {
        require(_feeRate <= BASIS_POINTS, "feeRate: invalid");

        openPositionFeeRate = _feeRate;
        emit OpenPositionFeeRateSet(_feeRate);
    }

    function setTier(uint8 tierId, uint256 discountRate) external onlyOwner {
        require(tierId != 0, "tierId: zero");
        require(discountRate <= BASIS_POINTS, "discountRate: invalid");

        tiers[tierId] = discountRate;
        emit TierSet(tierId, discountRate);
    }

    function setReferralTier(address account, uint8 tierId) external onlyOwner {
        referralTiers[account] = tierId;
        emit ReferralTierSet(account, tierId);
    }

    function lockedBalances(
        address account,
        address token
    ) external view virtual override returns (uint256) {
        if (warehouse == address(0)) {
            return 0;
        }
        return IWarehouse(warehouse).lockedBalances(account, token);
    }

    function getOpenPositionFee(
        uint256 amount
    ) public view override returns (uint256) {
        return (amount * openPositionFeeRate) / BASIS_POINTS;
    }

    function createAccount() public override returns (address) {
        require(accounts[msg.sender] == address(0), "account: already created");

        Account account = new Account(msg.sender, address(this));
        accounts[msg.sender] = address(account);
        emit AccountCreated(msg.sender, address(account));

        return address(account);
    }

    function createAccountAndDeposit(
        address token,
        uint256 amount
    ) external payable override returns (address account) {
        account = createAccount();

        if (token == address(0)) {
            require(msg.value == amount, "amount: not exact");
            IAccount(account).deposit{value: amount}(address(0), amount);
        } else {
            IERC20(token).transferFrom(msg.sender, address(this), amount);
            IERC20(token).approve(account, amount);
            IAccount(account).deposit(token, amount);
        }
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external payable virtual override returns (uint256 amountOut) {
        require(tokenIn != tokenOut, "same tokens");
        if (tokenOut == address(0)) {
            tokenOut = _weth;
        }

        if (tokenIn == address(0)) {
            require(msg.value == amountIn, "amount: not exact");
            IERC20(_weth).deposit{value: msg.value}();
            IERC20(_weth).approve(_swapRouter, amountIn);

            ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
                .ExactInputSingleParams({
                    tokenIn: _weth,
                    tokenOut: tokenOut,
                    fee: 3000,
                    recipient: address(this),
                    deadline: block.timestamp,
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                });
            amountOut = ISwapRouter(_swapRouter).exactInputSingle(params);
        } else {
            IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
            IERC20(tokenIn).approve(_swapRouter, amountIn);

            ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
                .ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    fee: 3000,
                    recipient: address(this),
                    deadline: block.timestamp,
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                });
            amountOut = ISwapRouter(_swapRouter).exactInputSingle(params);
        }

        if (tokenOut == _weth) {
            IERC20(_weth).withdraw(amountOut);
            payable(msg.sender).transfer(amountOut);
        } else {
            IERC20(tokenOut).transfer(msg.sender, amountOut);
        }
    }

    function executeMarketOrder(
        address account,
        OrderType orderType,
        address adapter,
        address[] memory path,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 adapterExecutionFee
    ) external payable override onlyAccountOwner(account) {
        require(path.length == 1 || path.length == 2, "path: invalid length");

        require(
            adapterExecutionFee >= IAdapter(adapter).getMinExecutionFee(),
            "adapterExecutionFee: insufficient"
        );
        require(isRegisteredAdapter[adapter], "adapter: not registered");

        if (orderType == OrderType.IncreasePosition) {
            require(collateralAmount != 0, "collateralAmount: zero");
            require(size != 0, "size: zero");

            IAccount(account).increasePosition{value: adapterExecutionFee}(
                adapter,
                MarketOrder({
                    path: path,
                    index: index,
                    collateralAmount: collateralAmount,
                    size: size,
                    isLong: isLong
                })
            );
        } else if (orderType == OrderType.DecreasePosition) {
            require(collateralAmount == 0, "collateralAmount: not zero");
            require(size != 0, "size: zero");

            IAccount(account).decreasePosition{value: adapterExecutionFee}(
                adapter,
                MarketOrder({
                    path: path,
                    index: index,
                    collateralAmount: collateralAmount,
                    size: size,
                    isLong: isLong
                })
            );
        } else if (orderType == OrderType.IncreaseCollateral) {
            require(collateralAmount != 0, "collateralAmount: zero");
            require(size == 0, "size: not zero");

            IAccount(account).increaseCollateral{value: adapterExecutionFee}(
                adapter,
                MarketOrder({
                    path: path,
                    index: index,
                    collateralAmount: collateralAmount,
                    size: size,
                    isLong: isLong
                })
            );
        } else if (orderType == OrderType.DecreaseCollateral) {
            require(collateralAmount != 0, "collateralAmount: zero");
            require(size == 0, "size: not zero");

            IAccount(account).decreaseCollateral{value: adapterExecutionFee}(
                adapter,
                MarketOrder({
                    path: path,
                    index: index,
                    collateralAmount: collateralAmount,
                    size: size,
                    isLong: isLong
                })
            );
        }
    }

    function getMaxAdapterExecutionFee()
        public
        view
        override
        returns (uint256)
    {
        uint256 maxAdapterExecutionFee;
        for (uint256 i = 0; i < registeredAdapters.length; i++) {
            uint256 executionFee = IAdapter(registeredAdapters[i])
                .getMinExecutionFee();

            if (executionFee > maxAdapterExecutionFee) {
                maxAdapterExecutionFee = executionFee;
            }
        }
        return maxAdapterExecutionFee;
    }

    function createLimitOrder(
        address account,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 triggerPrice,
        uint256 acceptablePrice,
        uint256 executionFee,
        uint256 adapterExecutionFee
    ) external payable onlyAccountOwner(account) {
        require(executionFee >= minExecutionFee, "executionFee: insufficient");
        require(
            adapterExecutionFee >= getMaxAdapterExecutionFee(),
            "adapterExecutionFee: insufficient"
        );
        require(
            executionFee + adapterExecutionFee == msg.value,
            "msg.value: insufficient"
        );

        IWarehouse(warehouse).createLimitOrder{value: adapterExecutionFee}(
            account,
            collateral,
            index,
            collateralAmount,
            size,
            isLong,
            triggerPrice,
            acceptablePrice,
            adapterExecutionFee
        );
    }

    function cancelLimitOrder(
        address account,
        uint256 id
    ) external onlyAccountOwner(account) {
        IWarehouse(warehouse).cancelLimitOrder(account, id);
    }

    function executeLimitOrder(
        address account,
        address adapter,
        MarketOrder calldata marketOrder
    ) external payable virtual override onlyWarehouse {
        require(isRegisteredAdapter[adapter], "adapter: not registered");

        IAccount(account).increasePosition{value: msg.value}(
            adapter,
            marketOrder
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
        uint256 executionFee,
        uint256 adapterExecutionFee
    ) external payable onlyAccountOwner(account) {
        require(executionFee >= minExecutionFee, "executionFee: insufficient");
        require(
            adapterExecutionFee == IAdapter(adapter).getMinExecutionFee(),
            "adapterExecutionFee: not match"
        );
        require(
            executionFee + adapterExecutionFee == msg.value,
            "msg.value: not match"
        );

        IWarehouse(warehouse).createTriggerOrder{value: adapterExecutionFee}(
            account,
            adapter,
            collateral,
            index,
            isLong,
            size,
            orderType,
            triggerPrice,
            acceptablePrice,
            adapterExecutionFee
        );
    }

    function cancelTriggerOrder(
        address account,
        bytes32 positionKey,
        uint256 id
    ) external onlyAccountOwner(account) {
        IWarehouse(warehouse).cancelTriggerOrder(account, positionKey, id);
    }

    function executeTriggerOrder(
        address account,
        address adapter,
        MarketOrder calldata marketOrder
    ) external payable virtual override onlyWarehouse {
        IAccount(account).decreasePosition{value: msg.value}(
            adapter,
            marketOrder
        );
    }

    function withdraw(
        address receiver,
        address token,
        uint256 amount
    ) external onlyOwner {
        require(receiver != address(0), "receiver: zero address");
        require(amount > 0, "amount: zero");

        if (token == address(0)) {
            payable(msg.sender).transfer(amount);
        } else {
            IERC20(token).transfer(msg.sender, amount);
        }
        emit Withdrawn(msg.sender, token, amount);
    }
}
