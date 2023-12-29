// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./Account.sol";
import "./interfaces/tokens/IERC20.sol";
import "./interfaces/IExchange.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

contract Exchange is IExchange, OwnableUpgradeable, UUPSUpgradeable {
    address private constant WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    address private constant SWAP_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564; // uniswap V3

    address private _warehouse;

    uint256 private _totalAccounts;
    mapping(address => address) private _accounts;
    mapping(address => bool) private _marginKeepers;

    address[] private _registeredTokens;
    address[] private _registeredAdapters;

    // todo: optimization
    Fee private _fee;

    receive() external payable {}

    function initialize(address warehouse_) external virtual initializer {
        _warehouse = warehouse_;
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function warehouse() override public view returns (address) { return _warehouse; }

    function totalAccount() public view returns (uint256) { return _totalAccounts; }

    function account(address wallet) override public view returns (address) { return _accounts[wallet]; }

    function isMarginKeeper(address keeper) public view returns (bool) { return _marginKeepers[keeper]; }

    function getAllRegisteredTokens() public view returns (address[] memory) { return _registeredTokens; }

    function getAllRegisteredAdapters() public view returns (address[] memory) { return _registeredAdapters; }

    function isRegisteredToken(address token) public view returns (bool) {
        for (uint256 i = 0; i < _registeredTokens.length; i++) {
            if (_registeredTokens[i] == token) {
                return true;
            }
        }
        return false;
    }
    function isRegisteredAdapter(address adapter) public view returns (bool) {
        for (uint256 i = 0; i < _registeredAdapters.length; i++) {
            if (_registeredAdapters[i] == adapter) {
                return true;
            }
        }
        return false;
    }

    function fee() public view returns (Fee memory) { return _fee; }

    function setFee(Fee memory newFee) external onlyOwner {
        _fee = newFee;
        emit FeeSet(newFee);
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amount
    ) override payable external returns (uint256) {
        uint256 amountOut;
        if (tokenIn == address(0)) {
            require(msg.value == amount, "INVALID_AMOUNT");
            IERC20(WETH).deposit{value: msg.value}();
            IERC20(WETH).approve(SWAP_ROUTER, amount);

            ISwapRouter.ExactInputSingleParams memory params =
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: WETH, // note: tokenIn is WETH
                    tokenOut: tokenOut,
                    fee: 3000,
                    recipient: address(this),
                    deadline: block.timestamp,
                    amountIn: amount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                });
            amountOut = ISwapRouter(SWAP_ROUTER).exactInputSingle(params);
        } else {
            IERC20(tokenIn).transferFrom(msg.sender, address(this), amount);
            IERC20(tokenIn).approve(SWAP_ROUTER, amount);

            ISwapRouter.ExactInputSingleParams memory params =
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    fee: 3000,
                    recipient: address(this),
                    deadline: block.timestamp,
                    amountIn: amount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                });
            amountOut = ISwapRouter(SWAP_ROUTER).exactInputSingle(params);
        }

        // todo: fee
        if (tokenOut == WETH) {
            IERC20(WETH).withdraw(amountOut);
            payable(msg.sender).transfer(amountOut);
        } else {
            IERC20(tokenOut).transfer(msg.sender, amountOut);
        }

        return amountOut;
    }

    function _createAccount() private returns (Account newAccount) {
        newAccount = new Account(msg.sender, address(this));
        emit AccountCreated(msg.sender, address(newAccount));

        _accounts[msg.sender] = address(newAccount);
        _totalAccounts++;
    }

    function createAccount() external returns (address) {
        Account newAccount = _createAccount();
        return address(newAccount);
    }

    function createAccountAndDeposit(address token, uint256 amount)
        external
        payable
        returns (address)
    {
        Account newAccount = _createAccount();
        token == address(0) ?
            newAccount.deposit{value: msg.value}(address(0), amount) :
            newAccount.deposit(token, amount);
        return address(newAccount);
    }

    function setMarginKeeper(address keeper, bool status) external onlyOwner {
        _marginKeepers[keeper] = status;
        emit MarginKeeperSet(keeper, status);
    }

    function registerAdapter(address adapter) external onlyOwner {
        for (uint256 i = 0; i < _registeredAdapters.length; i++) {
            require(_registeredAdapters[i] != adapter, "ALREADY_REGISTERED");
        }

        _registeredAdapters.push(adapter);
        emit AdapterRegistered(adapter);
    }

    function unregisterAdapter(address adapter) external onlyOwner {
        for (uint256 i = 0; i < _registeredAdapters.length; i++) {
            if (_registeredAdapters[i] == adapter) {
                _registeredAdapters[i] = _registeredAdapters[_registeredAdapters.length - 1];

                _registeredAdapters.pop();
                emit AdapterUnregistered(adapter);
                return;
            }
        }
        revert("NOT_REGISTERED");
    }

    function registerToken(address token) external onlyOwner {
        for (uint256 i = 0; i < _registeredTokens.length; i++) {
            require(_registeredTokens[i] != token, "ALREADY_REGISTERED");
        }

        _registeredTokens.push(token);
        emit TokenRegistered(token);
    }

    function unregisterToken(address token) external onlyOwner {
        for (uint256 i = 0; i < _registeredTokens.length; i++) {
            if (_registeredTokens[i] == token) {
                _registeredTokens[i] = _registeredTokens[_registeredTokens.length - 1];

                _registeredTokens.pop();
                emit TokenUnregistered(token);
                return;
            }
        }
        revert("NOT_REGISTERED");
    }
}
