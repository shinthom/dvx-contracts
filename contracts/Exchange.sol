// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IAccount, Account} from "./Account.sol";
import {IERC20} from "./interfaces/IERC20.sol";
import {IAdapter} from "./interfaces/IAdapter.sol";
import {IExchange} from "./interfaces/IExchange.sol";
import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

contract Exchange is IExchange {
    address private constant _weth = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    address private constant _swapRouter =
        0xE592427A0AEce92De3Edee1F18E0157C05861564; // uniswap V3

    address public gov;

    mapping(address => address) public accounts;
    mapping(address => bool) private _registeredAdapters;

    mapping(address => bool) private _stableTokens;

    mapping(address => LimitOrder[]) private _limitOrders;
    mapping(bytes32 => TriggerOrder[]) private _triggerOrders;

    mapping(address => mapping(address => uint256)) lockedBalances;

    constructor() {
        gov = msg.sender;
    }

    function getPositionKey(
        address account,
        address adapter,
        address collateral,
        address index,
        bool isLong
    ) public pure override returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(account, adapter, collateral, index, isLong)
            );
    }

    function isStableToken(
        address token
    ) external view override returns (bool) {
        return _stableTokens[token];
    }

    function isRegisteredAdapter(address adapter) public view returns (bool) {
        return _registeredAdapters[adapter];
    }

    function getTriggerOrders(
        bytes32 positionKey
    ) public view override returns (TriggerOrder[] memory) {
        return _triggerOrders[positionKey];
    }

    function getTriggerOrder(
        bytes32 positionKey,
        uint256 id
    ) public view override returns (TriggerOrder memory) {
        return _triggerOrders[positionKey][id];
    }

    function getLimitOrders(
        address account
    ) public view override returns (LimitOrder[] memory) {
        return _limitOrders[account];
    }

    function getLimitOrder(
        address account,
        uint256 id
    ) public view override returns (LimitOrder memory) {
        return _limitOrders[account][id];
    }

    function setStableTokens(
        address[] memory tokens,
        bool[] memory isStable
    ) external {
        require(msg.sender == gov, "msg.sender: not gov");
        require(tokens.length == isStable.length, "length: mismatch");

        for (uint256 i = 0; i < tokens.length; i++) {
            _stableTokens[tokens[i]] = isStable[i];
        }
    }

    function setRegisteredAdapter(address adapter, bool registered) external {
        require(msg.sender == gov, "msg.sender: not gov");
        _registeredAdapters[adapter] = registered;
    }

    function createAccount() public override returns (address) {
        require(accounts[msg.sender] == address(0), "account: already exist");

        Account account = new Account(msg.sender, address(this));
        accounts[msg.sender] = address(account);
        emit CreateAccount(msg.sender, address(account));

        return address(account);
    }

    function createAccountAndDeposit(
        address token,
        uint256 amount
    ) external payable override returns (address account) {
        account = createAccount();
        IAccount(account).deposit{value: amount}(token, amount);
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external payable override returns (uint256 amountOut) {
        if (tokenOut == address(0)) {
            tokenOut = _weth;
        }

        if (tokenIn == address(0)) {
            require(msg.value == amountIn, "Exchange: INVALID_AMOUNT");
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

    // todo: executeMarketOrderMulti

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
    ) external payable override {
        require(accounts[msg.sender] == account, "account: not owner");
        require(path.length == 1 || path.length == 2, "path: invalid length");

        require(
            executionFee >= IAdapter(adapter).getMinExecutionFee(),
            "executionFee: insufficient"
        );
        require(isRegisteredAdapter(adapter), "adapter: not registered");

        if (orderType == OrderType.IncreasePosition) {
            require(collateralAmount != 0, "collateralAmount: zero");
            require(size != 0, "size: zero");

            IAccount(account).increasePosition{value: executionFee}(
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

            IAccount(account).decreasePosition{value: executionFee}(
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

            IAccount(account).increaseCollateral{value: executionFee}(
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

            IAccount(account).decreaseCollateral{value: executionFee}(
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

    function createTriggerOrder(
        address account,
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 size,
        TriggerOrderType orderType,
        uint256 triggerPrice, // 1e18
        uint256 acceptablePrice, // 1e18
        uint256 executionFee
    ) external payable {
        require(accounts[msg.sender] == address(account), "account: not owner");
        require(isRegisteredAdapter(adapter), "adapter: not registered");

        require(
            (isLong && triggerPrice >= acceptablePrice) ||
                (!isLong && triggerPrice <= acceptablePrice),
            "triggerPrice: invalid"
        );
        require(executionFee == msg.value, "executionFee: mismatch");

        uint256 minExeuctionFee = IAdapter(adapter).getMinExecutionFee();
        require(executionFee >= minExeuctionFee, "executionFee: insufficient");

        IAdapter.Position memory position = IAdapter(adapter).getPosition(
            account,
            collateral,
            index,
            isLong
        );
        require(position.size > 0, "position: not exist");

        bytes32 positionKey = getPositionKey(
            account,
            adapter,
            collateral,
            index,
            isLong
        );

        TriggerOrder memory triggerOrder = TriggerOrder({
            id: _triggerOrders[positionKey].length,
            state: TriggerOrderState.Pending,
            account: account,
            adapter: adapter,
            collateral: collateral,
            index: index,
            isLong: isLong,
            size: size,
            orderType: orderType,
            triggerPrice: triggerPrice,
            acceptablePrice: acceptablePrice,
            createdAt: block.timestamp
        });
        _triggerOrders[positionKey].push(triggerOrder);
        emit TriggerOrderCreated(account, positionKey, triggerOrder.id);
    }

    function cancelTriggerOrder(bytes32 positionKey, uint256 id) external {
        TriggerOrder memory triggerOrder = _triggerOrders[positionKey][id];
        require(
            triggerOrder.account == accounts[msg.sender],
            "account: not owner"
        );
        require(
            triggerOrder.state == TriggerOrderState.Pending,
            "state: not pending"
        );

        _triggerOrders[positionKey][id].state = TriggerOrderState.Canceled;
        emit TriggerOrderCanceled(triggerOrder.account, positionKey, id);
    }

    function executeTriggerOrder(
        address account,
        bytes32 positionKey,
        uint256 id
    ) external payable {
        TriggerOrder memory triggerOrder = _triggerOrders[positionKey][id];
        require(
            triggerOrder.state == TriggerOrderState.Pending,
            "state: not pending"
        );
        require(account == triggerOrder.account, "account: mismatch");

        IAdapter adapter = IAdapter(triggerOrder.adapter);
        uint256 minExecutionFee = adapter.getMinExecutionFee();
        require(address(this).balance >= minExecutionFee, "fee: insufficient");

        // 1e18
        uint256 markPrice = adapter.getWrapPrice(
            triggerOrder.index,
            triggerOrder.isLong
        );
        require(
            (triggerOrder.isLong &&
                markPrice >= triggerOrder.acceptablePrice) ||
                (!triggerOrder.isLong &&
                    markPrice <= triggerOrder.acceptablePrice),
            "price: not acceptable"
        );

        _triggerOrders[positionKey][id].state = TriggerOrderState.Executed;
        emit TriggerOrderExecuted(account, positionKey, id);

        address[] memory path = new address[](1);
        path[0] = triggerOrder.collateral;

        IAccount(account).decreasePosition(
            triggerOrder.adapter,
            MarketOrder({
                path: path,
                index: triggerOrder.index,
                collateralAmount: 0,
                size: triggerOrder.size,
                isLong: triggerOrder.isLong
            })
        );
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
        uint256 executionFee
    ) external payable {
        require(account == accounts[msg.sender], "account: not owner");

        require(
            (isLong && triggerPrice <= acceptablePrice) ||
                (!isLong && triggerPrice >= acceptablePrice),
            "triggerPrice: invalid"
        );
        require(executionFee == msg.value, "executionFee: mismatch");

        uint256 balance = collateral == _weth
            ? IAccount(account).getBalance(address(0))
            : IAccount(account).getBalance(collateral);
        require(
            balance - lockedBalances[account][collateral] >= collateralAmount,
            "collateralAmount: over balance"
        );
        lockedBalances[account][collateral] += collateralAmount;

        LimitOrder memory limitOrder = LimitOrder({
            id: _limitOrders[account].length,
            state: LimitOrderState.Pending,
            collateral: collateral,
            index: index,
            collateralAmount: collateralAmount,
            size: size,
            isLong: isLong,
            triggerPrice: triggerPrice,
            acceptablePrice: acceptablePrice,
            createdAt: block.timestamp
        });
        _limitOrders[account].push(limitOrder);
        emit LimitOrderCreated(account, limitOrder.id);
    }

    function cancelLimitOrder(address account, uint256 id) external {
        require(account == accounts[msg.sender], "account: not owner");

        LimitOrder memory limitOrder = _limitOrders[account][id];
        require(
            limitOrder.state == LimitOrderState.Pending,
            "state: not pending"
        );
        _limitOrders[account][id].state = LimitOrderState.Canceled;
        emit LimitOrderCanceled(account, id);

        lockedBalances[account][limitOrder.collateral] -= limitOrder.collateralAmount; // prettier-ignore
    }

    function executeLimitOrder(
        address adapter,
        address account,
        uint256 id
    ) external payable {
        IExchange.LimitOrder memory limitOrder = _limitOrders[account][id]; // prettier-ignore
        require(
            limitOrder.state == LimitOrderState.Pending,
            "state: not pending"
        );

        uint256 minExecutionFee = IAdapter(adapter).getMinExecutionFee();
        require(address(this).balance >= minExecutionFee, "fee: insufficient");

        uint256 markPrice = IAdapter(adapter).getWrapPrice(
            limitOrder.index,
            limitOrder.isLong
        );
        require(
            (limitOrder.isLong && markPrice >= limitOrder.acceptablePrice) ||
                (!limitOrder.isLong && markPrice <= limitOrder.acceptablePrice),
            "price: not acceptable"
        );
        _limitOrders[account][id].state = LimitOrderState.Executed;
        emit LimitOrderExecuted(account, id);

        lockedBalances[account][limitOrder.collateral] -= limitOrder.collateralAmount; // prettier-ignore

        MarketOrder memory marketOrder = IAdapter(adapter).makeMarketOrder(
            limitOrder.collateral,
            limitOrder.index,
            limitOrder.collateralAmount,
            limitOrder.size,
            limitOrder.isLong
        );
        IAccount(account).increasePosition{value: minExecutionFee}(
            adapter,
            marketOrder
        );
    }
}
