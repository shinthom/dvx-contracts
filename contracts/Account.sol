// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IAccount} from "./interfaces/IAccount.sol";
import {IExchange} from "./interfaces/IExchange.sol";
import {IERC20} from "./interfaces/IERC20.sol";
import "hardhat/console.sol";

contract Account is IAccount {
    address public immutable override owner;
    address public immutable override exchange;

    receive() external payable {}

    constructor(address _owner, address _exchange) {
        require(_owner != address(0), "owner: zero address");
        require(_exchange != address(0), "exchange: zero address");

        owner = _owner;
        exchange = _exchange;
    }

    function getBalance(
        address token
    ) public view virtual override returns (uint256) {
        return
            token == address(0)
                ? address(this).balance
                : IERC20(token).balanceOf(address(this));
    }

    function deposit(address token, uint256 amount) external payable override {
        require(amount > 0, "amount: zero");

        if (token == address(0)) {
            require(amount == msg.value, "amount: not exact");
        } else {
            IERC20(token).transferFrom(msg.sender, address(this), amount);
        }
        emit Deposited(msg.sender, token, amount);
    }

    function withdraw(address token, uint256 amount) external override {
        require(amount > 0, "amount: zero");
        require(msg.sender == owner, "msg.sender: not owner");

        uint256 balance = getBalance(token);
        uint256 lockedBalance = IExchange(exchange).lockedBalance(
            address(this),
            token
        );
        require(amount <= balance - lockedBalance, "amount: exceed balance");

        if (token == address(0)) {
            payable(msg.sender).transfer(amount);
        } else {
            IERC20(token).transfer(msg.sender, amount);
        }
        emit Withdrawn(token, amount);
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external virtual returns (uint256 amountOut) {
        require(msg.sender == owner, "msg.sender: not owner");
        require(tokenIn != tokenOut, "same tokens");

        uint256 balance = getBalance(tokenIn);
        require(amountIn <= balance, "amountIn: exceed balance");

        if (tokenIn == address(0)) {
            amountOut = IExchange(exchange).swap{value: amountIn}(
                tokenIn,
                tokenOut,
                amountIn
            );
        } else {
            IERC20(tokenIn).approve(exchange, amountIn);
            amountOut = IExchange(exchange).swap(tokenIn, tokenOut, amountIn);
        }
        emit Swapped(address(this), tokenIn, tokenOut, amountIn, amountOut);
    }

    function increasePosition(
        address adapter,
        IExchange.MarketOrder calldata marketOrder
    ) external payable virtual override {
        require(msg.sender == exchange, "msg.sender: not exchange");
        require(adapter != address(0), "adapter: zero address");

        uint256 feeCollateral
            = IExchange(exchange).getOpenPositionFee(marketOrder.collateralAmount); // prettier-ignore
        uint256 collateralAmount = marketOrder.collateralAmount - feeCollateral;

        if (feeCollateral > 0) {
            address collateral = marketOrder.path[0];

            if (collateral == address(0)) {
                payable(exchange).transfer(feeCollateral);
            } else {
                IERC20(collateral).transfer(exchange, collateralAmount);
            }
        }

        // slither-disable-next-line controlled-delegatecall,low-level-calls
        (bool success, bytes memory data) = adapter.delegatecall(
            abi.encodeWithSignature(
                "increasePosition(address[],address,uint256,uint256,bool)",
                marketOrder.path,
                marketOrder.index,
                collateralAmount,
                marketOrder.size,
                marketOrder.isLong
            )
        );
        require(success, string(data));
    }

    function decreasePosition(
        address adapter,
        IExchange.MarketOrder calldata marketOrder
    ) external payable virtual override {
        require(msg.sender == exchange, "msg.sender: not exchange");
        require(adapter != address(0), "adapter: zero address");

        require(marketOrder.path.length == 1, "path: invalid length");

        // slither-disable-next-line controlled-delegatecall,low-level-calls
        (bool success, bytes memory data) = adapter.delegatecall(
            abi.encodeWithSignature(
                "decreasePosition(address,address,uint256,bool)",
                marketOrder.path[0],
                marketOrder.index,
                marketOrder.size,
                marketOrder.isLong
            )
        );
        require(success, string(data));
    }

    function increaseCollateral(
        address adapter,
        IExchange.MarketOrder calldata marketOrder
    ) external payable virtual override {
        require(msg.sender == exchange, "msg.sender: not exchange");
        require(adapter != address(0), "adapter: zero address");

        require(marketOrder.path.length == 1, "path: invalid length");

        // slither-disable-next-line controlled-delegatecall,low-level-calls
        (bool success, bytes memory data) = adapter.delegatecall(
            abi.encodeWithSignature(
                "increaseCollateral(address,address,uint256,bool)",
                marketOrder.path[0],
                marketOrder.index,
                marketOrder.collateralAmount,
                marketOrder.isLong
            )
        );
        require(success, string(data));
    }

    function decreaseCollateral(
        address adapter,
        IExchange.MarketOrder calldata marketOrder
    ) external payable virtual override {
        require(msg.sender == exchange, "msg.sender: not exchange");
        require(adapter != address(0), "adapter: zero address");

        require(marketOrder.path.length == 1, "path: invalid length");

        // slither-disable-next-line controlled-delegatecall,low-level-calls
        (bool success, bytes memory data) = adapter.delegatecall(
            abi.encodeWithSignature(
                "decreaseCollateral(address,address,uint256,bool)",
                marketOrder.path[0],
                marketOrder.index,
                marketOrder.collateralAmount,
                marketOrder.isLong
            )
        );
        require(success, string(data));
    }
}
