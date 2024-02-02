// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IAccount} from "../interfaces/IAccount.sol";
import {IExchange} from "../interfaces/IExchange.sol";
import {IWarehouse} from "../interfaces/IWarehouse.sol";
import {IERC20} from "../interfaces/IERC20.sol";
import {ILogger} from "../interfaces/ILogger.sol";

contract Account is IAccount {
    address private constant _weth = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;

    address public immutable override owner;
    address public immutable override exchange;

    uint256 private _marketOrderId;

    mapping(address => uint256) private _lockedBalances;
    uint256 private _debt; // stable token (1e6)

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

    modifier onlyOrderKeeper() {
        require(
            IExchange(exchange).isOrderKeeper(msg.sender),
            "msg.sender: not order keeper"
        );
        _;
    }

    function deposit(
        address token,
        uint256 amount,
        uint256 executionFee
    ) external virtual override onlyOwner {
        require(amount != 0, "amount: zero");

        if (executionFee > 0) {
            _collectExecutionFee(token, executionFee);
            amount -= executionFee;
        }
        IERC20(token).transferFrom(msg.sender, address(this), amount);

        address logger = IExchange(exchange).logger();
        if (logger != address(0)) {
            ILogger(logger).logDeposit(address(this), token, amount);
        }
    }

    function withdraw(
        address token,
        uint256 amount,
        uint256 executionFee
    ) external virtual override onlyOwner {
        require(amount != 0, "amount: zero");
        require(
            amount <= getWithdrawableBalance(token),
            "amount: greater than withdrawable balance"
        );

        if (executionFee > 0) {
            _collectExecutionFee(token, executionFee);
            amount -= executionFee;
        }
        IERC20(token).transfer(msg.sender, amount);

        address logger = IExchange(exchange).logger();
        if (logger != address(0)) {
            ILogger(logger).logWithdraw(address(this), token, amount);
        }
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 executionFee
    ) external virtual override onlyOwner returns (uint256 amountOut) {
        require(
            amountIn <= getWithdrawableBalance(tokenIn),
            "amountIn: greater than withdrawable balance"
        );

        if (executionFee > 0) {
            _collectExecutionFee(tokenIn, executionFee);
            amountIn -= executionFee;
        }

        IERC20(tokenIn).approve(exchange, amountIn);
        amountOut = IExchange(exchange).swap(tokenIn, tokenOut, amountIn);

        address logger = IExchange(exchange).logger();
        if (logger != address(0)) {
            ILogger(logger).logSwap(
                address(this),
                tokenIn,
                tokenOut,
                amountIn,
                amountOut
            );
        }
    }

    function increasePosition(
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 executionFee
    ) external payable virtual override onlyOwner {
        require(
            collateralAmount <= getWithdrawableBalance(collateral),
            "collateralAmount: greater than withdrawable balance"
        );

        if (executionFee > 0) {
            _collectExecutionFee(collateral, executionFee);
            collateralAmount -= executionFee;
        }

        _marketOrderId++;
        _increasePosition(
            _marketOrderId,
            adapter,
            collateral,
            index,
            collateralAmount,
            size,
            isLong,
            executionFee
        );
    }

    function increasePositionMulti(
        address[] calldata adapters,
        address collateral,
        address index,
        uint256[] memory collateralAmounts,
        uint256[] calldata sizes,
        bool isLong,
        uint256[] calldata executionFees
    ) external payable virtual override onlyOwner {
        require(
            adapters.length == collateralAmounts.length &&
                adapters.length == sizes.length &&
                adapters.length == executionFees.length,
            "length: not match"
        );

        _marketOrderId++;
        for (uint256 i = 0; i < adapters.length; i++) {
            require(
                collateralAmounts[i] <= getWithdrawableBalance(collateral),
                "collateralAmount: greater than withdrawable balance"
            );

            if (executionFees[i] > 0) {
                _collectExecutionFee(collateral, executionFees[i]);
                collateralAmounts[i] -= executionFees[i];
            }

            _increasePosition(
                _marketOrderId,
                adapters[i],
                collateral,
                index,
                collateralAmounts[i],
                sizes[i],
                isLong,
                executionFees[i]
            );
        }
    }

    function decreasePosition(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        uint256 executionFee // stable token (1e6)
    ) external payable virtual override onlyOwner {
        if (executionFee > 0) {
            _debt += executionFee;
        }

        _decreasePosition(
            adapter,
            collateral,
            index,
            isLong,
            size,
            executionFee
        );
    }

    function increaseCollateral(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        address tokenIn,
        uint256 amountIn,
        uint256 executionFee
    ) external payable virtual override onlyOwner {
        require(
            amountIn <= getWithdrawableBalance(tokenIn),
            "tokenIn: greater than withdrawable balance"
        );

        uint256 collateralAmount = amountIn;
        if (tokenIn != collateral) {
            IERC20(tokenIn).approve(exchange, amountIn);
            collateralAmount = IExchange(exchange).swap(
                tokenIn,
                collateral,
                amountIn
            );
        }

        if (executionFee > 0) {
            _collectExecutionFee(collateral, executionFee);
            collateralAmount -= executionFee;
        }

        _increaseCollateral(
            adapter,
            collateral,
            index,
            isLong,
            collateralAmount,
            executionFee
        );
    }

    function decreaseCollateral(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 collateralAmount,
        uint256 executionFee // stable token (1e6)
    ) external payable virtual override onlyOwner {
        if (executionFee > 0) {
            _debt += executionFee;
        }

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

    // todo: exeuctionFee
    function addMargin(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        address[] calldata marginTokens,
        uint256[] calldata marginAmounts
    ) external payable virtual override onlyOrderKeeper {
        require(
            marginTokens.length == marginAmounts.length,
            "length: not match"
        );

        uint256 marginAmount;
        for (uint256 i = 0; i < marginTokens.length; i++) {
            require(
                marginAmounts[i] <= getBalance(marginTokens[i]),
                "marginAmount: greater than balance"
            );

            if (collateral != marginTokens[i]) {
                IERC20(marginTokens[i]).approve(exchange, marginAmounts[i]);
                uint256 amountOut = IExchange(exchange).swap(
                    marginTokens[i],
                    collateral,
                    marginAmounts[i]
                );
                marginAmount += amountOut;
            } else {
                marginAmount += marginAmounts[i];
            }
        }

        require(
            IExchange(exchange).validateAddMargin(
                adapter,
                collateral,
                index,
                isLong,
                marginAmount
            ),
            "validation failed"
        );
        _addMargin(adapter, collateral, index, isLong, marginAmount);
    }

    // todo: exeuctionFee
    function realizeProfit(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 profitAmount
    ) external payable virtual override onlyOrderKeeper {
        require(
            IExchange(exchange).validateRealizeProfit(
                adapter,
                collateral,
                index,
                isLong,
                profitAmount
            ),
            "validation failed"
        );

        // slither-disable-next-line controlled-delegatecall,low-level-calls
        (bool success, bytes memory data) = adapter.delegatecall(
            abi.encodeWithSignature(
                "realizeProfit(address,address,uint256,bool)",
                collateral,
                index,
                isLong,
                profitAmount
            )
        );

        // todo: getProfitToken
        // adapter.getProfitToken
        require(success, string(data));
    }

    function deductDebt(
        uint256 amount
    ) external virtual override onlyOrderKeeper {
        require(amount <= _debt, "amount: greater than debt");
        _debt -= amount;
    }

    // todo: reentrancy guard
    function createLimitOrder(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 triggerPrice,
        uint256 acceptablePrice,
        uint256 executionFee
    ) external payable virtual override onlyOwner {
        require(
            collateralAmount <= getWithdrawableBalance(collateral),
            "collateralAmount: greater than withdrawable balance"
        );

        if (executionFee > 0) {
            _collectExecutionFee(collateral, executionFee);
            collateralAmount -= executionFee;
        }

        _lockedBalances[collateral] += collateralAmount;

        IExchange(exchange).createLimitOrder(
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
        uint256 limitOrderId,
        uint256 executionFee
    ) external payable virtual override onlyOwner {
        IWarehouse.LimitOrder memory limitOrder
            = IExchange(exchange).cancelLimitOrder(address(this), limitOrderId); // prettier-ignore

        _lockedBalances[limitOrder.collateral] -= limitOrder.collateralAmount;

        if (executionFee > 0) {
            _collectExecutionFee(limitOrder.collateral, executionFee);
        }
    }

    function executeLimitOrder(
        uint256 limitOrderId,
        address adapter
    ) external payable virtual override onlyOrderKeeper {
        IWarehouse.LimitOrder memory limitOrder
            = IExchange(exchange).executeLimitOrder(address(this), adapter, limitOrderId); // prettier-ignore

        _lockedBalances[limitOrder.collateral] -= limitOrder.collateralAmount;

        _marketOrderId++;
        _increasePosition(
            _marketOrderId,
            adapter,
            limitOrder.collateral,
            limitOrder.index,
            limitOrder.collateralAmount,
            limitOrder.size,
            limitOrder.isLong,
            0 // executionFee
        );
    }

    function executeLimitOrderMulti(
        uint256 limitOrderId,
        address[] calldata adapters,
        uint256[] calldata collateralAmounts,
        uint256[] calldata sizes
    ) external payable virtual override onlyOrderKeeper {
        require(
            adapters.length == collateralAmounts.length &&
                adapters.length == sizes.length,
            "length: not match"
        );

        IWarehouse.LimitOrder memory limitOrder
            = IExchange(exchange).executeLimitOrderMulti(address(this), adapters, limitOrderId); // prettier-ignore

        uint256 totalCollateralAmount;
        for (uint256 i = 0; i < adapters.length; i++) {
            totalCollateralAmount += collateralAmounts[i];
        }
        require(
            totalCollateralAmount == limitOrder.collateralAmount,
            "collateralAmount: not match"
        );

        uint256 totalSize;
        for (uint256 i = 0; i < adapters.length; i++) {
            totalSize += sizes[i];
        }
        require(totalSize == limitOrder.size, "size: not match");

        _lockedBalances[limitOrder.collateral] -= limitOrder.collateralAmount;

        _marketOrderId++;
        for (uint256 i = 0; i < adapters.length; i++) {
            _increasePosition(
                _marketOrderId,
                adapters[i],
                limitOrder.collateral,
                limitOrder.index,
                collateralAmounts[i],
                sizes[i],
                limitOrder.isLong,
                0 // executionFee
            );
        }
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
    ) external payable virtual override onlyOwner {
        if (executionFee > 0) {
            _debt += executionFee;
        }

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
        uint256 triggerOrderId,
        uint256 executionFee
    ) external virtual override onlyOwner {
        if (executionFee > 0) {
            _debt += executionFee;
        }

        IExchange(exchange).cancelTriggerOrder(
            address(this),
            positionKey,
            triggerOrderId
        );
    }

    function executeTriggerOrder(
        bytes32 positionKey,
        uint256 triggerOrderId
    ) external payable virtual override onlyOrderKeeper {
        IWarehouse.TriggerOrder memory triggerOrder = IExchange(exchange)
            .executeTriggerOrder(positionKey, triggerOrderId);

        _decreasePosition(
            triggerOrder.adapter,
            triggerOrder.collateral,
            triggerOrder.index,
            triggerOrder.isLong,
            triggerOrder.size,
            triggerOrder.executionFee
        );
    }

    function getBalance(
        address token
    ) public view virtual override returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function getLockedBalance(
        address token
    ) public view virtual override returns (uint256) {
        return _lockedBalances[token];
    }

    function getWithdrawableBalance(
        address token
    ) public view virtual override returns (uint256) {
        return getBalance(token) - getLockedBalance(token);
    }

    function getDebt() public view virtual override returns (uint256) {
        return _debt;
    }

    function _increasePosition(
        uint256 marketOrderId,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 executionFee
    ) private {
        require(
            IExchange(exchange).isRegisteredAdapter(adapter),
            "adapter: not registered"
        );

        uint256 positionFee = IExchange(exchange).getPositionFee(
            adapter,
            collateral,
            index,
            size,
            isLong
        );
        if (positionFee > 0) {
            _collectProtocolFee(collateral, positionFee);
            collateralAmount -= positionFee;
        }

        (bool success, bytes memory data) = adapter.delegatecall(
            abi.encodeWithSignature(
                "increasePosition(uint256,address,address,uint256,uint256,bool,uint256)",
                marketOrderId,
                collateral,
                index,
                collateralAmount,
                size,
                isLong,
                executionFee + positionFee
            )
        );
        require(success, string(data));
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

    function _increaseCollateral(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 collateralAmount,
        uint256 executionFee
    ) private {
        require(
            IExchange(exchange).isRegisteredAdapter(adapter),
            "adapter: not registered"
        );

        uint256 depositFee = IExchange(exchange).getDepositFee(
            collateralAmount
        );
        if (depositFee > 0) {
            _collectProtocolFee(collateral, depositFee);
            collateralAmount -= depositFee;
        }

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

    // todo: exeutionFee?
    function _addMargin(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 marginAmount
    ) private {
        require(
            IExchange(exchange).isRegisteredAdapter(adapter),
            "adapter: not registered"
        );

        // slither-disable-next-line controlled-delegatecall,low-level-calls
        (bool success, bytes memory data) = adapter.delegatecall(
            abi.encodeWithSignature(
                "addMargin(address,address,uint256,bool)",
                collateral,
                index,
                marginAmount,
                isLong
            )
        );
        require(success, string(data));
    }

    function _collectExecutionFee(address token, uint256 amount) private {
        IERC20(token).transfer(exchange, amount);
        IExchange(exchange).collectExecutionFee(address(this), token, amount);
    }

    function _collectProtocolFee(address token, uint256 amount) private {
        IERC20(token).transfer(exchange, amount);
        IExchange(exchange).collectProtocolFee(address(this), token, amount);
    }

    function _collectDebt(address token, uint256 amount) private {
        IERC20(token).transfer(exchange, amount);
        IExchange(exchange).collectDebt(address(this), token, amount);
    }
}
