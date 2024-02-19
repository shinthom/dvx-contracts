// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IAccount} from "../interfaces/IAccount.sol";
import {IExchange} from "../interfaces/IExchange.sol";
import {IWarehouse} from "../interfaces/IWarehouse.sol";
import {IWETH} from "../interfaces/IWETH.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ILogger} from "../interfaces/ILogger.sol";
import {PayableMulticall} from "./PayableMulticall.sol";
import {StorageSlot} from "@openzeppelin/contracts/utils/StorageSlot.sol";

contract Storage {
    bytes32 internal constant _BEACON_SLOT =
        bytes32(uint256(keccak256("dvx.beacon")) - 1);
    bytes32 internal constant _ACCOUNT_VERSION_SLOT =
        bytes32(uint256(keccak256("dvx.account.version")) - 1);

    address internal constant _weth =
        0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;

    bool internal _locked; // reentrancy guard
    bool internal _intitalized;

    address internal _owner;
    address internal _exchange;
    address internal _delegatedAccount;
    uint256 internal _delegatedAccountExpiration;

    uint256 internal _marketOrderId;
    mapping(address => uint256) internal _lockedBalances;
    mapping(address => uint256) internal _feeDebts;
}

contract Account is Storage, PayableMulticall, IAccount {
    using SafeERC20 for IERC20;

    receive() external payable {
        if (msg.sender != _weth) {
            IWETH(_weth).deposit{value: msg.value}();
        }
    }

    modifier noReentrant() {
        require(!_locked, "No re-entrancy");
        _locked = true;
        _;
        _locked = false;
    }

    modifier onlyOwner() {
        require(msg.sender == _owner, "msg.sender: not owner");
        _;
    }

    modifier onlyOwnerOrRelayer() {
        require(
            msg.sender == _owner || IExchange(_exchange).isRelayer(msg.sender),
            "msg.sender: not owner or relayer"
        );
        _;
    }

    modifier onlyOrderKeeper() {
        require(
            IExchange(_exchange).isOrderKeeper(msg.sender),
            "msg.sender: not order keeper"
        );
        _;
    }

    function initialize(
        address owner,
        address exchange,
        address delegatedAccount,
        uint256 delegatedAccountExpiration
    ) public virtual override {
        require(!_intitalized, "already initialized");
        _intitalized = true;

        require(owner != address(0), "owner: zero address");
        require(exchange != address(0), "exchange: zero address");
        require(
            delegatedAccount != address(0),
            "delegatedAccount: zero address"
        );
        require(
            delegatedAccountExpiration > block.timestamp,
            "expiration: before now"
        );

        _owner = owner;
        _exchange = exchange;
        _delegatedAccount = delegatedAccount;
        _delegatedAccountExpiration = delegatedAccountExpiration;
    }

    function upgrade(uint256 version) public virtual override onlyOwner {
        require(version > 0, "version: zero");

        address implementation = IExchange(_exchange).accountImplementation(
            version
        );
        require(implementation != address(0), "implementation: zero address");

        StorageSlot.getUint256Slot(_ACCOUNT_VERSION_SLOT).value = version;
    }

    function renewDelegatedAccount(
        address delegatedAccount,
        uint256 delegatedAccountExpiration
    ) public virtual override onlyOwner {
        require(
            delegatedAccount != address(0),
            "delegatedAccount: zero address"
        );
        require(
            delegatedAccountExpiration > block.timestamp,
            "expiration: before now"
        );

        _delegatedAccount = delegatedAccount;
        _delegatedAccountExpiration = delegatedAccountExpiration;

        address logger = IExchange(_exchange).logger();
        if (logger != address(0)) {
            ILogger(logger).logRenewDelegatedAccount(
                address(this),
                delegatedAccount,
                delegatedAccountExpiration
            );
        }
    }

    function depositETH(uint256 amount) public payable virtual override {
        require(amount > 0, "amount: zero");
        require(amount == msg.value, "amount: not equal to msg.value");

        IWETH(_weth).deposit{value: msg.value}();

        address logger = IExchange(_exchange).logger();
        if (logger != address(0)) {
            ILogger(logger).logDeposit(address(this), _weth, amount, 0);
        }
    }

    function deposit(
        address token,
        uint256 amount,
        uint256 networkFee,
        uint256 deadline,
        bytes calldata signature
    ) public virtual override onlyOwnerOrRelayer {
        if (msg.sender != _owner) {
            require(
                _verifySignature(
                    deadline,
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
    ) public virtual override onlyOwnerOrRelayer {
        if (msg.sender != _owner) {
            require(
                _verifySignature(
                    deadline,
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

        IERC20Permit(token).permit(
            _owner,
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
    ) internal {
        require(amount != 0, "amount: zero");
        require(
            IExchange(_exchange).isSupportedCollateralToken(token),
            "token: not supported"
        );

        // slither-disable-next-line arbitrary-send-erc20
        IERC20(token).safeTransferFrom(_owner, address(this), amount);

        if (networkFee > 0) {
            require(amount >= networkFee, "amount: less than network fee");
            _collectNetworkFee(token, networkFee);
            amount -= networkFee;
        }

        address logger = IExchange(_exchange).logger();
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
        address to,
        uint256 amount,
        uint256 networkFee,
        uint256 deadline,
        bytes calldata signature
    ) public virtual override onlyOwnerOrRelayer {
        if (msg.sender != _owner) {
            require(
                _verifySignature(
                    deadline,
                    keccak256(
                        abi.encodePacked(
                            token,
                            to,
                            amount,
                            networkFee,
                            deadline
                        )
                    ),
                    signature
                ),
                "signature: invalid"
            );
        }

        require(amount != 0, "amount: zero");
        require(
            amount <= getWithdrawableBalance(token),
            "amount: greater than withdrawable balance"
        );

        if (networkFee > 0) {
            require(amount >= networkFee, "amount: less than network fee");
            _collectNetworkFee(token, networkFee);
            amount -= networkFee;
        }

        uint256 feeDebt = _feeDebts[token];
        if (feeDebt > 0) {
            require(amount >= feeDebt, "amount: less than fee debt");
            _collectFeeDebt(token, feeDebt);
            amount -= feeDebt;
        }
        if (token == _weth) {
            IERC20(token).approve(_weth, amount);
            IWETH(_weth).withdraw(amount);
            payable(to).transfer(amount);
        } else {
            IERC20(token).safeTransfer(to, amount);
        }

        address logger = IExchange(_exchange).logger();
        if (logger != address(0)) {
            ILogger(logger).logWithdraw(
                address(this),
                to,
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
    ) public virtual override onlyOwnerOrRelayer {
        if (msg.sender != _owner) {
            require(
                _verifySignature(
                    deadline,
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
            require(amountIn >= networkFee, "amount: less than network fee");
            _collectNetworkFee(tokenIn, networkFee);
            amountIn -= networkFee;
        }

        uint256 amountOut = _swap(tokenIn, tokenOut, amountIn, networkFee);
    }

    function _swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 networkFee
    ) internal returns (uint256 amountOut) {
        uint256 swapFee = IExchange(_exchange).getSwapFee(amountIn);
        if (swapFee > 0) {
            require(amountIn >= swapFee, "amountIn: less than swapFee");
            _collectProtocolFee(tokenIn, swapFee);
            amountIn -= swapFee;
        }

        IERC20(tokenIn).approve(_exchange, amountIn);
        amountOut = IExchange(_exchange).swap(tokenIn, tokenOut, amountIn);

        address logger = IExchange(_exchange).logger();
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
    ) public payable virtual override noReentrant onlyOwnerOrRelayer {
        if (msg.sender != _owner) {
            require(
                _verifySignature(
                    deadline,
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
            require(
                collateralAmount >= networkFee,
                "collateralAmount: less than network fee"
            );
            collateralAmount -= networkFee;
            _collectNetworkFee(collateral, networkFee);
        }

        uint256 feeDebt = _feeDebts[collateral];
        if (feeDebt > 0) {
            require(
                collateralAmount >= feeDebt,
                "collateralAmount: less than fee debt"
            );
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

    // slither-disable-next-line reentrancy-no-eth
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
    ) public payable virtual override noReentrant onlyOwnerOrRelayer {
        require(path.length == 2, "path: invalid length");
        require(path[0] != path[1], "path: same token");

        if (msg.sender != _owner) {
            require(
                _verifySignature(
                    deadline,
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
            require(
                collateralAmount >= networkFee,
                "collateralAmount: less than network fee"
            );
            collateralAmount -= networkFee;
            _collectNetworkFee(collateral, networkFee);
        }

        uint256 feeDebt = _feeDebts[collateral];
        if (feeDebt > 0) {
            require(
                collateralAmount >= feeDebt,
                "collateralAmount: less than fee debt"
            );
            collateralAmount -= feeDebt;
            _collectFeeDebt(collateral, feeDebt);
        }

        // stack too deep
        collateralAmount = _swap(
            collateral,
            path[1],
            collateralAmount,
            networkFee
        );
        collateral = path[1];

        feeDebt = _feeDebts[collateral];
        if (feeDebt > 0) {
            require(
                collateralAmount >= feeDebt,
                "collateralAmount: less than fee debt"
            );
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
    ) internal {
        require(
            IExchange(_exchange).isRegisteredAdapter(adapter),
            "adapter: not registered"
        );

        require(
            IExchange(_exchange).isSupportedCollateralToken(collateral),
            "collateral: not supported"
        );
        require(
            IExchange(_exchange).isSupportedIndexToken(index),
            "index: not supported"
        );

        uint256 positionFee = IExchange(_exchange).getPositionFee(
            adapter,
            collateral,
            index,
            size,
            isLong
        );
        if (positionFee > 0) {
            require(
                collateralAmount >= positionFee,
                "collateralAmount: less than position fee"
            );
            _collectProtocolFee(collateral, positionFee);
            collateralAmount -= positionFee;
        }

        // slither-disable-next-line controlled-delegatecall,low-level-calls
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

        address logger = IExchange(_exchange).logger();
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
    ) public payable virtual override onlyOwnerOrRelayer {
        if (msg.sender != _owner) {
            require(
                _verifySignature(
                    deadline,
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
    ) internal {
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

        address logger = IExchange(_exchange).logger();
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

    // slither-disable-next-line reentrancy-no-eth
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
    ) public payable virtual override noReentrant onlyOwnerOrRelayer {
        if (msg.sender != _owner) {
            require(
                _verifySignature(
                    deadline,
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

        if (networkFee > 0) {
            require(amountIn >= networkFee, "amountIn: less than network fee");
            amountIn -= networkFee;
            _collectNetworkFee(tokenIn, networkFee);
        }

        uint256 feeDebt = _feeDebts[tokenIn];
        if (feeDebt > 0) {
            require(amountIn >= feeDebt, "amountIn: less than fee debt");
            amountIn -= feeDebt;
            _collectFeeDebt(tokenIn, feeDebt);
        }

        uint256 collateralAmount = amountIn;
        bool swap = tokenIn != collateral;
        if (swap) {
            collateralAmount = _swap(tokenIn, collateral, amountIn, networkFee);

            feeDebt = _feeDebts[collateral];
            if (feeDebt > 0) {
                require(
                    collateralAmount >= feeDebt,
                    "collateralAmount: less than fee debt"
                );
                collateralAmount -= feeDebt;
                _collectFeeDebt(collateral, feeDebt);
            }
        }

        _increaseCollateral(
            adapter,
            collateral,
            index,
            isLong,
            collateralAmount,
            swap ? 0 : networkFee
        );
    }

    function _increaseCollateral(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 collateralAmount,
        uint256 networkFee
    ) internal {
        require(
            IExchange(_exchange).isRegisteredAdapter(adapter),
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

        address logger = IExchange(_exchange).logger();
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
    ) public payable virtual override onlyOwnerOrRelayer {
        if (msg.sender != _owner) {
            require(
                _verifySignature(
                    deadline,
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

        address logger = IExchange(_exchange).logger();
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

    function collectFeeDebt(
        address token,
        uint256 amount
    ) public virtual override onlyOrderKeeper {
        _collectFeeDebt(token, amount);
    }

    // slither-disable-next-line reentrancy-no-eth
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
    ) public payable virtual override noReentrant onlyOwnerOrRelayer {
        if (msg.sender != _owner) {
            require(
                _verifySignature(
                    deadline,
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
            IExchange(_exchange).isSupportedCollateralToken(collateral),
            "collateral: not supported"
        );
        require(
            IExchange(_exchange).isSupportedIndexToken(index),
            "index: not supported"
        );

        require(
            collateralAmount <= getWithdrawableBalance(collateral),
            "collateralAmount: greater than withdrawable balance"
        );

        if (networkFee > 0) {
            require(
                collateralAmount >= networkFee,
                "collateralAmount: less than network fee"
            );
            _collectNetworkFee(collateral, networkFee);
            collateralAmount -= networkFee;
        }
        require(
            executionFee <= collateralAmount,
            "executionFee: greater than collateralAmount"
        );

        _lockedBalances[collateral] += collateralAmount;

        IExchange(_exchange).createLimitOrder(
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
    ) public payable virtual override onlyOwnerOrRelayer {
        if (msg.sender != _owner) {
            require(
                _verifySignature(
                    deadline,
                    keccak256(
                        abi.encodePacked(limitOrderId, networkFee, deadline)
                    ),
                    signature
                ),
                "signature: invalid"
            );
        }

        IWarehouse.LimitOrder memory limitOrder
            = IExchange(_exchange).cancelLimitOrder(limitOrderId); // prettier-ignore

        _lockedBalances[limitOrder.collateral] -= limitOrder.collateralAmount;

        if (networkFee > 0) {
            _feeDebts[limitOrder.collateral] += networkFee;
        }
    }

    function executeLimitOrder(
        uint256 limitOrderId,
        address adapter
    ) public payable virtual override noReentrant onlyOrderKeeper {
        IWarehouse.LimitOrder memory limitOrder
            = IExchange(_exchange).executeLimitOrder(adapter, limitOrderId); // prettier-ignore

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
            limitOrder.executionFee // will be logged in `networkFee`
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
        uint256 networkFee,
        uint256 deadline,
        bytes calldata signature
    ) public payable virtual override noReentrant onlyOrderKeeper {
        if (msg.sender != _owner) {
            require(
                _verifySignature(
                    deadline,
                    keccak256(
                        abi.encodePacked(
                            adapter,
                            collateral,
                            index,
                            isLong,
                            size,
                            orderType,
                            triggerPrice,
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

        IExchange(_exchange).executeTriggerOrder(
            adapter,
            collateral,
            index,
            isLong,
            size,
            orderType,
            triggerPrice,
            acceptablePrice,
            networkFee
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

    function beacon() public view virtual override returns (address) {
        return StorageSlot.getAddressSlot(_BEACON_SLOT).value;
    }

    function version() public view virtual override returns (uint256) {
        return StorageSlot.getUint256Slot(_ACCOUNT_VERSION_SLOT).value;
    }

    function owner() public view virtual override returns (address) {
        return _owner;
    }

    function exchange() public view virtual override returns (address) {
        return _exchange;
    }

    function delegatedAccount() public view virtual override returns (address) {
        return _delegatedAccount;
    }

    function delegatedAccountExpiration()
        public
        view
        virtual
        override
        returns (uint256)
    {
        return _delegatedAccountExpiration;
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

    function _collectFeeDebt(address token, uint256 amount) internal {
        require(amount <= _feeDebts[token], "amount: greater than fee debt");
        _feeDebts[token] -= amount;

        IERC20(token).approve(_exchange, amount);
        IExchange(_exchange).collectFeeDebt(token, amount);
    }

    function _collectNetworkFee(address token, uint256 amount) internal {
        IERC20(token).approve(_exchange, amount);
        IExchange(_exchange).collectNetworkFee(token, amount);
    }

    function _collectExecutionFee(address token, uint256 amount) internal {
        IERC20(token).approve(_exchange, amount);
        IExchange(_exchange).collectExecutionFee(token, amount);
    }

    function _collectProtocolFee(address token, uint256 amount) internal {
        IERC20(token).approve(_exchange, amount);
        IExchange(_exchange).collectProtocolFee(token, amount);
    }

    function _verifySignature(
        uint256 deadline,
        bytes32 messageHash,
        bytes memory signature
    ) internal view returns (bool) {
        require(deadline >= block.timestamp, "deadline: expired");
        require(
            _delegatedAccountExpiration > block.timestamp,
            "delegatedAccount: expired"
        );
        return
            _recoverSigner(_getEthSignedMessageHash(messageHash), signature) ==
            _delegatedAccount;
    }

    function _getEthSignedMessageHash(
        bytes32 _messageHash
    ) internal pure returns (bytes32) {
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
    ) internal pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = _splitSignature(signature);

        return ecrecover(message, v, r, s);
    }

    function _splitSignature(
        bytes memory sig
    ) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "invalid signature length");

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }
}
