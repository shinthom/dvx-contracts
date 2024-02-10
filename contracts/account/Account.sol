// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IAccount} from "../interfaces/IAccount.sol";
import {IExchange} from "../interfaces/IExchange.sol";
import {IWarehouse} from "../interfaces/IWarehouse.sol";
import {IERC20} from "../interfaces/IERC20.sol";
import {ILogger} from "../interfaces/ILogger.sol";
import {PayableMulticall} from "./PayableMulticall.sol";

contract Account is IAccount, PayableMulticall {
    address private constant _weth = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;

    address public override owner;
    address public override exchange;
    DelegatedAccount public delegatedAccount;

    bool private _intitalized;

    uint256 private _marketOrderId;

    mapping(address => uint256) private _lockedBalances;
    mapping(address => uint256) private _feeDebts;

    receive() external payable {
        if (msg.sender != _weth) {
            IERC20(_weth).deposit{value: msg.value}();
        }
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

    modifier onlyOwnerOrRelayer() {
        require(
            msg.sender == owner || IExchange(exchange).isRelayer(msg.sender),
            "msg.sender: not owner or relayer"
        );
        _;
    }

    function initialize(
        address _owner,
        address _exchange,
        address _delegatedWallet,
        uint256 _expiration
    ) external override {
        require(!_intitalized, "already initialized");
        _intitalized = true;

        require(_owner != address(0), "owner: zero address");
        require(_exchange != address(0), "exchange: zero address");
        require(
            _delegatedWallet != address(0),
            "delegatedWallet: zero address"
        );
        require(_expiration > block.timestamp, "expiration: before now");

        owner = _owner;
        exchange = _exchange;
        delegatedAccount.wallet = _delegatedWallet;
        delegatedAccount.expiration = _expiration;
    }

    function renewDelegatedAccount(
        address _delegatedWallet,
        uint256 _expiration
    ) external override onlyOwner {
        require(
            _delegatedWallet != address(0),
            "delegatedWallet: zero address"
        );
        require(_expiration > block.timestamp, "expiration: before now");

        delegatedAccount.wallet = _delegatedWallet;
        delegatedAccount.expiration = _expiration;

        address logger = IExchange(exchange).logger();
        if (logger != address(0)) {
            ILogger(logger).logRenewDelegatedAccount(
                address(this),
                _delegatedWallet,
                _expiration
            );
        }
    }

    function deposit(
        address token,
        uint256 amount,
        uint256 networkFee,
        uint256 deadline,
        bytes calldata signature
    ) external virtual override onlyOwnerOrRelayer {
        if (msg.sender != owner) {
            require(
                _verifySignature(
                    deadline,
                    delegatedAccount.wallet,
                    keccak256(
                        abi.encodePacked(token, amount, networkFee, deadline)
                    ),
                    signature
                ),
                "signature: invalid"
            );
        }

        _deposit(token, amount, networkFee, signature);
    }

    function depositPermit(
        address token,
        uint256 amount,
        uint8 v,
        bytes32 r,
        bytes32 s,
        uint256 networkFee,
        uint256 deadline,
        bytes calldata signature
    ) external virtual override onlyOwnerOrRelayer {
        if (msg.sender != owner) {
            require(
                _verifySignature(
                    deadline,
                    delegatedAccount.wallet,
                    keccak256(
                        abi.encodePacked(
                            token,
                            amount,
                            v,
                            r,
                            s,
                            networkFee,
                            deadline
                        )
                    ),
                    signature
                ),
                "signature: invalid"
            );
        }

        IERC20(token).permit(
            owner,
            address(this),
            amount,
            type(uint256).max,
            v,
            r,
            s
        );
        _deposit(token, amount, networkFee, signature);
    }

    function _deposit(
        address token,
        uint256 amount,
        uint256 networkFee,
        bytes calldata signature
    ) private {
        require(amount != 0, "amount: zero");

        IERC20(token).transferFrom(owner, address(this), amount);

        if (networkFee > 0) {
            require(amount >= networkFee, "amount: less than execution fee");
            _collectNetworkFee(token, networkFee);
            amount -= networkFee;
        }

        address logger = IExchange(exchange).logger();
        if (logger != address(0)) {
            ILogger(logger).logDeposit(
                address(this),
                token,
                amount,
                networkFee
            );
        }
    }

    function withdraw(
        address token,
        uint256 amount,
        uint256 networkFee,
        uint256 deadline,
        bytes calldata signature
    ) external virtual override onlyOwnerOrRelayer {
        if (msg.sender != owner) {
            require(
                _verifySignature(
                    deadline,
                    delegatedAccount.wallet,
                    keccak256(
                        abi.encodePacked(token, amount, networkFee, deadline)
                    ),
                    signature
                ),
                "signature: invalid"
            );
        }

        require(amount != 0, "amount: zero");

        uint256 feeDebt = _feeDebts[token];
        require(amount >= networkFee + feeDebt, "amount: less than fee + debt");
        require(
            amount <= getWithdrawableBalance(token),
            "amount: greater than withdrawable balance"
        );

        if (networkFee > 0) {
            _collectNetworkFee(token, networkFee);
            amount -= networkFee;
        }

        if (feeDebt > 0) {
            _collectFeeDebt(token, amount);
            amount -= feeDebt;
        }

        IERC20(token).transfer(owner, amount);

        address logger = IExchange(exchange).logger();
        if (logger != address(0)) {
            ILogger(logger).logWithdraw(
                address(this),
                token,
                amount,
                networkFee
            );
        }
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 networkFee,
        uint256 deadline,
        bytes calldata signature
    ) external virtual override onlyOwnerOrRelayer {
        if (msg.sender != owner) {
            require(
                _verifySignature(
                    deadline,
                    delegatedAccount.wallet,
                    keccak256(
                        abi.encodePacked(
                            tokenIn,
                            tokenOut,
                            amountIn,
                            networkFee,
                            deadline
                        )
                    ),
                    signature
                ),
                "signature: invalid"
            );
        }

        require(
            amountIn <= getWithdrawableBalance(tokenIn),
            "amountIn: greater than withdrawable balance"
        );

        if (networkFee > 0) {
            require(amountIn >= networkFee, "amount: less than execution fee");
            _collectNetworkFee(tokenIn, networkFee);
            amountIn -= networkFee;
        }

        (uint256 amountOut, uint256 swapFee) = _swap(
            tokenIn,
            tokenOut,
            amountIn,
            networkFee
        );
    }

    function _swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 networkFee
    ) private returns (uint256 amountOut, uint256 swapFee) {
        IERC20(tokenIn).transfer(exchange, amountIn);

        (amountOut, swapFee) = IExchange(exchange).swap(
            address(this),
            tokenIn,
            tokenOut,
            amountIn
        );

        amountIn -= swapFee; // log
        address logger = IExchange(exchange).logger();
        if (logger != address(0)) {
            ILogger(logger).logSwap(
                address(this),
                tokenIn,
                tokenOut,
                amountIn,
                amountOut,
                networkFee,
                swapFee
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
        uint256 acceptablePrice,
        uint256 networkFee,
        uint256 deadline,
        bytes calldata signature
    ) external payable virtual override onlyOwnerOrRelayer {
        if (msg.sender != owner) {
            require(
                _verifySignature(
                    deadline,
                    delegatedAccount.wallet,
                    keccak256(
                        abi.encodePacked(
                            adapter,
                            collateral,
                            index,
                            collateralAmount,
                            size,
                            isLong,
                            acceptablePrice,
                            networkFee,
                            deadline
                        )
                    ),
                    signature
                ),
                "signature: invalid"
            );
        }

        require(
            collateralAmount <= getWithdrawableBalance(collateral),
            "collateralAmount: greater than withdrawable balance"
        );

        if (networkFee > 0) {
            collateralAmount -= networkFee;
            _collectNetworkFee(collateral, networkFee);
        }

        uint256 feeDebt = _feeDebts[collateral];
        if (feeDebt > 0) {
            collateralAmount -= feeDebt;
            _collectFeeDebt(collateral, feeDebt);
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
            acceptablePrice,
            networkFee
        );
    }

    function swapAndIncreasePosition(
        address adapter,
        address[] calldata path,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 acceptablePrice,
        uint256 networkFee,
        uint256 deadline,
        bytes calldata signature
    ) external payable virtual override onlyOwnerOrRelayer {
        require(path.length == 2, "path: invalid length");
        require(path[0] != path[1], "path: same token");

        if (msg.sender != owner) {
            require(
                _verifySignature(
                    deadline,
                    delegatedAccount.wallet,
                    keccak256(
                        abi.encodePacked(
                            adapter,
                            path,
                            index,
                            collateralAmount,
                            size,
                            isLong,
                            acceptablePrice,
                            networkFee,
                            deadline
                        )
                    ),
                    signature
                ),
                "signature: invalid"
            );
        }

        address collateral = path[0];
        require(
            collateralAmount <= getWithdrawableBalance(collateral),
            "collateralAmount: greater than withdrawable balance"
        );

        if (networkFee > 0) {
            collateralAmount -= networkFee;
            _collectNetworkFee(collateral, networkFee);
        }

        uint256 feeDebt = _feeDebts[collateral];
        if (feeDebt > 0) {
            collateralAmount -= feeDebt;
            _collectFeeDebt(collateral, feeDebt);
        }

        (collateralAmount, ) = _swap(
            collateral,
            path[1],
            collateralAmount,
            networkFee
        );

        collateral = path[1]; // stack too deep

        feeDebt = _feeDebts[collateral];
        if (feeDebt > 0) {
            collateralAmount -= feeDebt;
            _collectFeeDebt(collateral, feeDebt);
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
            acceptablePrice,
            0 // networkFee is already logged in `_swap`
        );
    }

    function _increasePosition(
        uint256 marketOrderId,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 acceptablePrice,
        uint256 networkFee
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
                "increasePosition(uint256,address,address,uint256,uint256,uint256,bool)",
                marketOrderId,
                collateral,
                index,
                collateralAmount,
                size,
                acceptablePrice,
                isLong
            )
        );
        require(success, string(data));

        address logger = IExchange(exchange).logger();
        if (logger != address(0)) {
            ILogger(logger).logIncreasePosition(
                marketOrderId,
                address(this),
                adapter,
                collateral,
                index,
                collateralAmount,
                size,
                isLong,
                acceptablePrice,
                networkFee,
                positionFee
            );
        }
    }

    function decreasePosition(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        uint256 acceptablePrice,
        uint256 networkFee,
        uint256 deadline,
        bytes calldata signature
    ) external payable virtual override onlyOwnerOrRelayer {
        if (msg.sender != owner) {
            require(
                _verifySignature(
                    deadline,
                    delegatedAccount.wallet,
                    keccak256(
                        abi.encodePacked(
                            adapter,
                            collateral,
                            index,
                            isLong,
                            size,
                            acceptablePrice,
                            networkFee,
                            deadline
                        )
                    ),
                    signature
                ),
                "signature: invalid"
            );
        }

        if (networkFee > 0) {
            _feeDebts[collateral] += networkFee;
        }

        _decreasePosition(
            adapter,
            collateral,
            index,
            isLong,
            size,
            acceptablePrice,
            networkFee
        );
    }

    function _decreasePosition(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        uint256 acceptablePrice,
        uint256 networkFee
    ) private {
        // slither-disable-next-line controlled-delegatecall,low-level-calls
        (bool success, bytes memory data) = adapter.delegatecall(
            abi.encodeWithSignature(
                "decreasePosition(address,address,uint256,bool,uint256)",
                collateral,
                index,
                size,
                isLong,
                acceptablePrice
            )
        );
        require(success, string(data));

        address logger = IExchange(exchange).logger();
        if (logger != address(0)) {
            ILogger(logger).logDecreasePosition(
                address(this),
                adapter,
                collateral,
                index,
                size,
                isLong,
                acceptablePrice,
                networkFee
            );
        }
    }

    function increaseCollateral(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        address tokenIn,
        uint256 amountIn,
        uint256 networkFee,
        uint256 deadline,
        bytes calldata signature
    ) external payable virtual override onlyOwnerOrRelayer {
        if (msg.sender != owner) {
            require(
                _verifySignature(
                    deadline,
                    delegatedAccount.wallet,
                    keccak256(
                        abi.encodePacked(
                            adapter,
                            collateral,
                            index,
                            isLong,
                            tokenIn,
                            amountIn,
                            networkFee,
                            deadline
                        )
                    ),
                    signature
                ),
                "signature: invalid"
            );
        }

        require(
            amountIn <= getWithdrawableBalance(tokenIn),
            "tokenIn: greater than withdrawable balance"
        );

        uint256 collateralAmount = amountIn;
        if (tokenIn != collateral) {
            IERC20(tokenIn).approve(exchange, amountIn);
            (collateralAmount, ) = IExchange(exchange).swap(
                address(this),
                tokenIn,
                collateral,
                amountIn
            );
        }

        if (networkFee > 0) {
            collateralAmount -= networkFee;
            _collectNetworkFee(collateral, networkFee);
        }

        uint256 feeDebt = _feeDebts[collateral];
        if (feeDebt > 0) {
            collateralAmount -= feeDebt;
            _collectFeeDebt(collateral, feeDebt);
        }

        _increaseCollateral(
            adapter,
            collateral,
            index,
            isLong,
            collateralAmount,
            networkFee
        );
    }

    function _increaseCollateral(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 collateralAmount,
        uint256 networkFee
    ) private {
        require(
            IExchange(exchange).isRegisteredAdapter(adapter),
            "adapter: not registered"
        );

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

        address logger = IExchange(exchange).logger();
        if (logger != address(0)) {
            ILogger(logger).logIncreaseCollateral(
                address(this),
                adapter,
                collateral,
                index,
                collateralAmount,
                isLong,
                networkFee
            );
        }
    }

    function decreaseCollateral(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 collateralAmount,
        uint256 networkFee,
        uint256 deadline,
        bytes calldata signature
    ) external payable virtual override onlyOwnerOrRelayer {
        if (msg.sender != owner) {
            require(
                _verifySignature(
                    deadline,
                    delegatedAccount.wallet,
                    keccak256(
                        abi.encodePacked(
                            adapter,
                            collateral,
                            index,
                            isLong,
                            collateralAmount,
                            networkFee,
                            deadline
                        )
                    ),
                    signature
                ),
                "signature: invalid"
            );
        }

        if (networkFee > 0) {
            _feeDebts[collateral] += networkFee;
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

        address logger = IExchange(exchange).logger();
        if (logger != address(0)) {
            ILogger(logger).logDecreaseCollateral(
                address(this),
                adapter,
                collateral,
                index,
                collateralAmount,
                isLong,
                networkFee
            );
        }
    }

    function addAcmmMargin(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        address[] calldata tokens,
        uint256[] calldata amounts
    ) external payable virtual override onlyOrderKeeper {
        require(tokens.length == amounts.length, "length: not match");

        uint256 marginAmount;
        for (uint256 i = 0; i < tokens.length; i++) {
            require(
                amounts[i] <= getWithdrawableBalance(tokens[i]),
                "marginAmount: greater than balance"
            );

            if (collateral != tokens[i]) {
                IERC20(tokens[i]).approve(exchange, amounts[i]);
                (uint256 amountOut, ) = IExchange(exchange).swap(
                    address(this),
                    tokens[i],
                    collateral,
                    amounts[i]
                );
                marginAmount += amountOut;
            } else {
                marginAmount += amounts[i];
            }
        }

        require(
            IExchange(exchange).validateAddAcmmMargin(
                adapter,
                collateral,
                index,
                isLong,
                marginAmount
            ),
            "validation failed"
        );

        uint256 addAcmmMarginFee
            = IExchange(exchange).getAddAcmmMarginFee(marginAmount); // prettier-ignore
        if (addAcmmMarginFee > 0) {
            _collectProtocolFee(collateral, addAcmmMarginFee);
            marginAmount -= addAcmmMarginFee;
        }

        _addAcmmMargin(adapter, collateral, index, isLong, marginAmount);
    }

    function _addAcmmMargin(
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
                "addAcmmMargin(address,address,bool,uint256)",
                collateral,
                index,
                isLong,
                marginAmount
            )
        );
        require(success, string(data));
    }

    function subAcmmMargin(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 marginAmount
    ) external payable virtual override onlyOrderKeeper {
        require(
            IExchange(exchange).validateSubAcmmMargin(
                adapter,
                collateral,
                index,
                isLong,
                marginAmount
            ),
            "validation failed"
        );

        // slither-disable-next-line controlled-delegatecall,low-level-calls
        (bool success, bytes memory data) = adapter.delegatecall(
            abi.encodeWithSignature(
                "subAcmmMargin(address,address,bool,uint256)",
                collateral,
                index,
                isLong,
                marginAmount
            )
        );
        require(success, string(data));

        address marginToken = IExchange(exchange).getProfitToken(
            adapter,
            collateral,
            index,
            isLong
        );

        uint256 subAcmmMarginFee
            = IExchange(exchange).getSubAcmmMarginFee(marginAmount); // prettier-ignore
        if (subAcmmMarginFee > 0) {
            _collectProtocolFee(marginToken, subAcmmMarginFee);
        }
    }

    function collectFeeDebt(
        address token,
        uint256 amount
    ) external virtual override onlyOrderKeeper {
        _collectFeeDebt(token, amount);
    }

    function createLimitOrder(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 triggerPrice,
        uint256 acceptablePrice,
        uint256 networkFee,
        uint256 executionFee,
        uint256 deadline,
        bytes calldata signature
    ) external payable virtual override onlyOwnerOrRelayer {
        if (msg.sender != owner) {
            require(
                _verifySignature(
                    deadline,
                    delegatedAccount.wallet,
                    keccak256(
                        abi.encodePacked(
                            collateral,
                            index,
                            collateralAmount,
                            size,
                            isLong,
                            triggerPrice,
                            acceptablePrice,
                            networkFee,
                            executionFee,
                            deadline
                        )
                    ),
                    signature
                ),
                "signature: invalid"
            );
        }

        require(
            executionFee <= collateralAmount,
            "executionFee: greater than collateralAmount"
        );
        require(
            collateralAmount <= getWithdrawableBalance(collateral),
            "collateralAmount: greater than withdrawable balance"
        );

        if (networkFee > 0) {
            _collectNetworkFee(collateral, networkFee);
            collateralAmount -= networkFee;
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
        uint256 networkFee,
        uint256 deadline,
        bytes calldata signature
    ) external payable virtual override onlyOwnerOrRelayer {
        if (msg.sender != owner) {
            require(
                _verifySignature(
                    deadline,
                    delegatedAccount.wallet,
                    keccak256(
                        abi.encodePacked(limitOrderId, networkFee, deadline)
                    ),
                    signature
                ),
                "signature: invalid"
            );
        }

        IWarehouse.LimitOrder memory limitOrder
            = IExchange(exchange).cancelLimitOrder(address(this), limitOrderId); // prettier-ignore

        _lockedBalances[limitOrder.collateral] -= limitOrder.collateralAmount;

        if (networkFee > 0) {
            _feeDebts[limitOrder.collateral] += networkFee;
        }
    }

    function executeLimitOrder(
        uint256 limitOrderId,
        address adapter
    ) external payable virtual override onlyOrderKeeper {
        IWarehouse.LimitOrder memory limitOrder
            = IExchange(exchange).executeLimitOrder(address(this), adapter, limitOrderId); // prettier-ignore

        _lockedBalances[limitOrder.collateral] -= limitOrder.collateralAmount;

        uint256 collateralAmount = limitOrder.collateralAmount;
        if (limitOrder.executionFee > 0) {
            _collectExecutionFee(
                limitOrder.collateral,
                limitOrder.executionFee
            );
            collateralAmount -= limitOrder.executionFee;
        }

        _marketOrderId++;
        _increasePosition(
            _marketOrderId,
            adapter,
            limitOrder.collateral,
            limitOrder.index,
            collateralAmount,
            limitOrder.size,
            limitOrder.isLong,
            limitOrder.acceptablePrice,
            limitOrder.executionFee
        );
    }

    function executeTriggerOrder(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        IWarehouse.TriggerOrderType orderType,
        uint256 triggerPrice,
        uint256 acceptablePrice,
        uint256 networkFee
    ) external payable virtual override onlyOrderKeeper {
        IExchange(exchange).executeTriggerOrder(
            address(this),
            adapter,
            collateral,
            index,
            isLong,
            size,
            orderType,
            triggerPrice,
            acceptablePrice
        );

        if (networkFee > 0) {
            _feeDebts[collateral] += networkFee;
        }

        _decreasePosition(
            adapter,
            collateral,
            index,
            isLong,
            size,
            acceptablePrice,
            networkFee
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

    function getFeeDebt(
        address token
    ) public view virtual override returns (uint256) {
        return _feeDebts[token];
    }

    function _collectFeeDebt(address token, uint256 amount) private {
        _feeDebts[token] -= amount;

        IERC20(token).transfer(exchange, amount);
        IExchange(exchange).collectFeeDebt(address(this), token, amount);
    }

    function _collectNetworkFee(address token, uint256 amount) private {
        IERC20(token).transfer(exchange, amount);
        IExchange(exchange).collectNetworkFee(address(this), token, amount);
    }

    function _collectExecutionFee(address token, uint256 amount) private {
        IERC20(token).transfer(exchange, amount);
        IExchange(exchange).collectExecutionFee(address(this), token, amount);
    }

    function _collectProtocolFee(address token, uint256 amount) private {
        IERC20(token).transfer(exchange, amount);
        IExchange(exchange).collectProtocolFee(address(this), token, amount);
    }

    function _verifySignature(
        uint256 deadline,
        address signer,
        bytes32 messageHash,
        bytes memory signature
    ) private view returns (bool) {
        require(deadline >= block.timestamp, "deadline: expired");
        require(
            delegatedAccount.expiration > block.timestamp,
            "delegatedAccount: expired"
        );
        return
            _recoverSigner(_getEthSignedMessageHash(messageHash), signature) ==
            signer;
    }

    function _getEthSignedMessageHash(
        bytes32 _messageHash
    ) private pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    _messageHash
                )
            );
    }

    function _recoverSigner(
        bytes32 message,
        bytes memory signature
    ) private pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = _splitSignature(signature);

        return ecrecover(message, v, r, s);
    }

    function _splitSignature(
        bytes memory sig
    ) private pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "invalid signature length");

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }
}
