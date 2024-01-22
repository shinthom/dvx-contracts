// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IAccount} from "./interfaces/IAccount.sol";
import {IExchange} from "./interfaces/IExchange.sol";
import {IERC20} from "./interfaces/IERC20.sol";

// todo: lockedBalance -> transfer assets (limit order)

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

    modifier onlyOwner() {
        require(msg.sender == owner, "msg.sender: not owner");
        _;
    }

    modifier onlyExchange() {
        require(msg.sender == exchange, "msg.sender: not exchange");
        _;
    }

    function getBalance(
        address token
    ) public view virtual override returns (uint256) {
        return
            token == address(0)
                ? address(this).balance
                : IERC20(token).balanceOf(address(this));
    }

    function getLockedBalance(
        address token
    ) public view virtual returns (uint256) {
        return IExchange(exchange).lockedBalances(address(this), token);
    }

    function getWithdrawableBalance(
        address token
    ) public view virtual returns (uint256) {
        return getBalance(token) - getLockedBalance(token);
    }

    function depositETH(uint256 amount) external payable override onlyOwner {
        require(amount > 0, "amount: zero");
        require(msg.value == amount, "amount: not exact");

        emit Deposited(msg.sender, address(0), msg.value);
    }

    function deposit(
        address token,
        uint256 amount
    ) external override onlyOwner {
        require(amount > 0, "amount: zero");

        IERC20(token).transferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, token, amount);
    }

    function withdrawETH(uint256 amount) external override onlyOwner {
        require(amount > 0, "amount: zero");

        uint256 withdrawableBalance = getWithdrawableBalance(address(0));
        require(amount <= withdrawableBalance, "amount: exceed balance");

        payable(owner).transfer(amount);
        emit Withdrawn(address(0), amount);
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
    }

    // todo: eth native swap
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external virtual onlyOwner returns (uint256 amountOut) {
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
    ) external payable virtual override onlyExchange {
        require(adapter != address(0), "adapter: zero address");

        // // todo
        // uint256 feeCollateral
        //     = IExchange(exchange).getOpenPositionFee(marketOrder.collateralAmount); // prettier-ignore
        // uint256 collateralAmount = marketOrder.collateralAmount - feeCollateral;

        // if (feeCollateral > 0) {
        //     if (marketOrder.collateral == address(0)) {
        //         payable(exchange).transfer(feeCollateral);
        //     } else {
        //         IERC20(marketOrder.collateral).transfer(
        //             exchange,
        //             collateralAmount
        //         );
        //     }
        // }

        // slither-disable-next-line controlled-delegatecall,low-level-calls
        (bool success, bytes memory data) = adapter.delegatecall(
            abi.encodeWithSignature(
                "increasePosition(address,address,uint256,uint256,bool)",
                marketOrder.collateral,
                marketOrder.index,
                marketOrder.collateralAmount,
                marketOrder.size,
                marketOrder.isLong
            )
        );
        require(success, string(data));
    }

    function decreasePosition(
        address adapter,
        IExchange.MarketOrder calldata marketOrder
    ) external payable virtual override onlyExchange {
        require(adapter != address(0), "adapter: zero address");

        // slither-disable-next-line controlled-delegatecall,low-level-calls
        (bool success, bytes memory data) = adapter.delegatecall(
            abi.encodeWithSignature(
                "decreasePosition(address,address,uint256,bool)",
                marketOrder.collateral,
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
    ) external payable virtual override onlyExchange {
        require(adapter != address(0), "adapter: zero address");

        // slither-disable-next-line controlled-delegatecall,low-level-calls
        (bool success, bytes memory data) = adapter.delegatecall(
            abi.encodeWithSignature(
                "increaseCollateral(address,address,uint256,bool)",
                marketOrder.collateral,
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
    ) external payable virtual override onlyExchange {
        require(adapter != address(0), "adapter: zero address");

        // slither-disable-next-line controlled-delegatecall,low-level-calls
        (bool success, bytes memory data) = adapter.delegatecall(
            abi.encodeWithSignature(
                "decreaseCollateral(address,address,uint256,bool)",
                marketOrder.collateral,
                marketOrder.index,
                marketOrder.collateralAmount,
                marketOrder.isLong
            )
        );
        require(success, string(data));
    }
}
