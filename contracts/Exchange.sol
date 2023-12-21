// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;

import "./Account.sol";
import "./interfaces/tokens/IERC20.sol";
import "./interfaces/IExchange.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol"; // test

contract Exchange is IExchange {
    address constant private weth = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;

    address private _owner;
    address private _swapRouter;

    uint256 private _totalAccount;
    mapping(address => address) private _accounts; // wallet => account

    mapping(address => bool) private _registeredTokens;
    mapping(address => bool) private _registeredAdapters;

    uint256 private _positionFeeBasisPoints;

    constructor(address swapRouter) {
        _owner = msg.sender;
        _swapRouter = swapRouter;
    }

    receive() external payable {}

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amount
    ) override payable external returns (uint256) {
        uint256 amountOut;
        if (tokenIn == address(0)) {
            require(msg.value == amount, "INVALID_AMOUNT");
            IERC20(weth).deposit{value: msg.value}();

            IERC20(weth).approve(_swapRouter, amount);

            amountOut = ISwapRouter(_swapRouter).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: weth, // note: tokenIn is weth
                    tokenOut: tokenOut,
                    fee: 3000,
                    recipient: address(this),
                    deadline: block.timestamp,
                    amountIn: amount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            IERC20(tokenIn).transferFrom(msg.sender, address(this), amount);

            IERC20(tokenIn).approve(_swapRouter, amount);

            amountOut = ISwapRouter(_swapRouter).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    fee: 3000,
                    recipient: address(this),
                    deadline: block.timestamp,
                    amountIn: amount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
        }

        // todo: fee
        if (tokenOut == weth) {
            IERC20(weth).withdraw(amountOut);
            payable(msg.sender).transfer(amountOut);
        } else {
            IERC20(tokenOut).transfer(msg.sender, amountOut);
        }

        return amountOut;
    }

    function account(address wallet) public view returns (address) {
        return _accounts[wallet];
    }

    function totalAccount() public view returns (uint256) {
        return _totalAccount;
    }

    function isRegisteredAdapter(address adapter) public view returns (bool) {
        return _registeredAdapters[adapter];
    }

    function isRegisteredToken(address token) public view returns (bool) {
        return _registeredTokens[token];
    }

    function _createAccount() private returns (Account account) {
        account = new Account(msg.sender, address(this));
        emit AccountCreated(msg.sender, address(account));

        _accounts[msg.sender] = address(account);
        _totalAccount++;
    }

    function createAccount() external returns (address) {
        Account account = _createAccount();
        return address(account);
    }

    function createAccountAndDeposit(address token, uint256 amount)
        external
        payable
        returns (address)
    {
        Account account = _createAccount();

        token == address(0) ?
            account.deposit{value: msg.value}(address(0), amount) :
            account.deposit(token, amount);
        return address(account);
    }

    function registerAdapter(address adapter) external {
        require(msg.sender == _owner, "NOT_OWNER");
        _registeredAdapters[adapter] = true;
    }

    function unregisterAdapter(address adapter) external {
        require(msg.sender == _owner, "NOT_OWNER");
        _registeredAdapters[adapter] = false;
    }

    function registerToken(address token) external {
        require(msg.sender == _owner, "NOT_OWNER");
        _registeredTokens[token] = true;
    }

    function unregisterToken(address token) external {
        require(msg.sender == _owner, "NOT_OWNER");
        _registeredTokens[token] = false;
    }
}
