// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IAccount} from "./interfaces/IAccount.sol";
import {IExchange} from "./interfaces/IExchange.sol";
import {IWarehouse} from "./interfaces/IWarehouse.sol";
import {IERC20} from "./interfaces/IERC20.sol";
import {ILogger} from "./interfaces/ILogger.sol";

contract Account is IAccount {
    address private constant _weth = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;

    address public immutable override owner;
    address public immutable override exchange;

    mapping(address => uint256) private _lockedBalances;

    receive() external payable {
        if (msg.sender != _weth) {
            IERC20(_weth).deposit{value: msg.value}();
        }
    }

    constructor(address _owner, address _exchange) {
        require(_owner != address(0), "owner: zero address");
        require(_exchange != address(0), "exchange: zero address");

        owner = _owner;
        exchange = _exchange;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "msg.sender: not owner");
        _;
    }

    modifier onlyExchange() {
        require(msg.sender == exchange, "msg.sender: not exchange");
        _;
    }

    modifier onlyOrderKeeper() {
        require(
            IExchange(exchange).isOrderKeeper(msg.sender),
            "msg.sender: not order keeper"
        );
        _;
    }

    function getBalance(
        address token
    ) public view virtual override returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function getLockedBalance(
        address token
    ) public view virtual returns (uint256) {
        return _lockedBalances[token];
    }

    function getWithdrawableBalance(
        address token
    ) public view virtual returns (uint256) {
        return getBalance(token) - getLockedBalance(token);
    }

    function deposit(
        address token,
        uint256 amount
    ) external override onlyOwner {
        require(amount > 0, "amount: zero");

        IERC20(token).transferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, token, amount);

        // address logger = IExchange(exchange).logger();
        // if (logger != address(0)) {
        //     ILogger(logger).logDeposit(address(this), token, amount);
        // }
    }

    function withdraw(
        address token,
        uint256 amount
    ) external override onlyOwner {
        require(amount > 0, "amount: zero");

        uint256 withdrawableBalance = getWithdrawableBalance(token);
        require(amount <= withdrawableBalance, "amount: exceed balance");

        IERC20(token).transfer(msg.sender, amount);
        emit Withdrawn(token, amount);

        // address logger = IExchange(exchange).logger();
        // if (logger != address(0)) {
        //     ILogger(logger).logDeposit(address(this), token, amount);
        // }
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external virtual onlyOwner returns (uint256 amountOut) {
        uint256 balance = getBalance(tokenIn);
        require(amountIn <= balance, "amountIn: exceed balance");

        IERC20(tokenIn).approve(exchange, amountIn);
        amountOut = IExchange(exchange).swap(tokenIn, tokenOut, amountIn);
        emit Swapped(address(this), tokenIn, tokenOut, amountIn, amountOut);
    }

    function increasePosition(
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 executionFee // network fee + adapter fee (collateral token amount)
    ) external payable onlyOwner {
        _increasePosition(
            adapter,
            collateral,
            index,
            collateralAmount,
            size,
            isLong,
            executionFee
        );
    }

    function _increasePosition(
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 executionFee // network fee + adapter fee (collateral token amount)
    ) private {
        require(
            IExchange(exchange).isRegisteredAdapter(adapter),
            "adapter: not registered"
        );
        require(
            collateralAmount <= getBalance(collateral),
            "amount: less than balance"
        );

        uint256 positionFee = IExchange(exchange).getPositionFee(
            adapter,
            collateral,
            index,
            size,
            isLong
        );

        uint256 fees = positionFee + executionFee;
        require(collateralAmount >= fees, "amount: less than fees");

        _collectFee(collateral, fees);

        collateralAmount -= fees;
        (bool success, bytes memory data) = adapter.delegatecall(
            abi.encodeWithSignature(
                "increasePosition(address,address,uint256,uint256,bool)",
                collateral,
                index,
                collateralAmount,
                size,
                isLong
            )
        );
        require(success, string(data));
    }

    function decreasePosition(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        uint256 executionFee
    ) external payable onlyOwner {
        _decreasePosition(
            adapter,
            collateral,
            index,
            isLong,
            size,
            executionFee
        );
    }

    function _decreasePosition(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        uint256 executionFee
    ) private {
        // slither-disable-next-line controlled-delegatecall,low-level-calls
        (bool success, bytes memory data) = adapter.delegatecall(
            abi.encodeWithSignature(
                "decreasePosition(address,address,uint256,bool)",
                collateral,
                index,
                size,
                isLong
            )
        );
        require(success, string(data));
    }

    function increaseCollateral(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        address tokenIn,
        uint256 amountIn,
        uint256 executionFee
    ) external payable onlyOwner {
        uint256 collateralAmount = amountIn;
        if (tokenIn != collateral) {
            collateralAmount = IExchange(exchange).swap(
                tokenIn,
                collateral,
                amountIn
            );
        }

        uint256 depositFee = IExchange(exchange).getDepositFee(
            collateralAmount
        );
        require(collateralAmount >= depositFee, "amount: less than fees");

        _collectFee(collateral, depositFee);

        collateralAmount -= depositFee;

        // slither-disable-next-line controlled-delegatecall,low-level-calls
        (bool success, bytes memory data) = adapter.delegatecall(
            abi.encodeWithSignature(
                "increaseCollateral(address,address,uint256,bool)",
                collateral,
                index,
                collateralAmount,
                isLong
            )
        );
        require(success, string(data));
    }

    function decreaseCollateral(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 collateralAmount,
        uint256 executionFee
    ) external payable onlyOwner {
        // slither-disable-next-line controlled-delegatecall,low-level-calls
        (bool success, bytes memory data) = adapter.delegatecall(
            abi.encodeWithSignature(
                "decreaseCollateral(address,address,uint256,bool)",
                collateral,
                index,
                collateralAmount,
                isLong
            )
        );
        require(success, string(data));
    }

    function createLimitOrder(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 executionFee,
        uint256 triggerPrice,
        uint256 acceptablePrice
    ) external payable onlyOwner {
        require(collateralAmount >= executionFee, "amount: less than fees");
        require(
            collateralAmount <= getWithdrawableBalance(collateral),
            "amount: exceed balance"
        );

        _lockedBalances[collateral] += collateralAmount;

        if (executionFee > 0) {
            address feeCollector = IExchange(exchange).feeCollector();
            IERC20(collateral).transfer(feeCollector, executionFee);

            collateralAmount -= executionFee;
        }

        IExchange(exchange).createLimitOrder(
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
        uint256 orderId,
        uint256 executionFee
    ) external payable onlyOwner {
        IWarehouse.LimitOrder memory limitOrder
            = IExchange(exchange).cancelLimitOrder(address(this), orderId); // prettier-ignore

        _lockedBalances[limitOrder.collateral] -= limitOrder.collateralAmount;

        if (executionFee > 0) {
            address feeCollector = IExchange(exchange).feeCollector();
            IERC20(limitOrder.collateral).transfer(feeCollector, executionFee);
        }
    }

    function executeLimitOrder(
        uint256 orderId,
        address adapter,
        uint256 executionFee
    ) external payable onlyOrderKeeper {
        IWarehouse.LimitOrder memory limitOrder
            = IExchange(exchange).executeLimitOrder(address(this), adapter, orderId); // prettier-ignore

        _lockedBalances[limitOrder.collateral] -= limitOrder.collateralAmount;

        _increasePosition(
            adapter,
            limitOrder.collateral,
            limitOrder.index,
            limitOrder.collateralAmount,
            limitOrder.size,
            limitOrder.isLong,
            executionFee
        );
    }

    function createTriggerOrder(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        IWarehouse.TriggerOrderType orderType,
        uint256 triggerPrice,
        uint256 acceptablePrice,
        uint256 executionFee
    ) external payable onlyOwner {
        IExchange(exchange).createTriggerOrder(
            address(this),
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
        bytes32 positionKey,
        uint256 orderId
    ) external onlyOwner {
        IExchange(exchange).cancelTriggerOrder(
            address(this),
            positionKey,
            orderId
        );
    }

    function executeTriggerOrder(
        bytes32 positionKey,
        uint256 orderId
    ) external payable onlyOrderKeeper {
        IWarehouse.TriggerOrder memory triggerOrder = IExchange(exchange)
            .executeTriggerOrder(positionKey, orderId);

        _decreasePosition(
            triggerOrder.adapter,
            triggerOrder.collateral,
            triggerOrder.index,
            triggerOrder.isLong,
            triggerOrder.size,
            triggerOrder.executionFee
        );
    }

    function _collectFee(address token, uint256 amount) private {
        address feeCollector = IExchange(exchange).feeCollector();
        IERC20(token).transfer(feeCollector, amount);
    }
}
