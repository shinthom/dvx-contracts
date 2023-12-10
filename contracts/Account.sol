// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;

import "./interfaces/tokens/IERC20.sol";
import "./interfaces/IAccount.sol";

contract Account is IAccount {
    enum Order {
        IncreasePosition,
        DecreasePosition,
        IncreaseCollateral,
        DecreaseCollateral
    }

    address private _owner;
    // address private _exchange;
    mapping(address => uint256) private _balances;

    constructor(
        // address exchange
    ) {
        // _exchange = exchange;
        _owner = msg.sender;
    }

    function _deposit(address token, uint256 amount) private {
        require(amount > 0, "Account: amount must be greater than 0");

        _balances[token] += amount;
        emit Deposited(msg.sender, token, amount);

        if (token != address(0)) {
            IERC20(token).transferFrom(msg.sender, address(this), amount );
        }
    }

    /// Regardless of whether the token is allowed or not, it can be withdrawn.
    /// If the only allowed token can be withdrawn, it could be locked in the vault forever.
    function _withdraw(address token, uint256 amount) private {
        require(
            _balances[token] >= amount,
            "Account: insufficient balance"
        );

        _balances[token] -= amount;
        emit Withdrawn(msg.sender, token, amount);

        if (token == address(0)) {
            payable(msg.sender).transfer(amount);
        } else {
            IERC20(token).transfer(msg.sender, amount);
        }
    }

    function deposit(address token, uint256 amount) override external {
        require(amount > 0, "Account: amount must be greater than 0");

        _deposit(token, amount);
    }

    function depositETH(uint256 amount) override payable external {
        require(amount > 0, "Account: amount must be greater than 0");
        require(amount == msg.value, "Account: amount must be equal to msg.value");

        _deposit(address(0), amount);
    }

    function withdraw(address token, uint256 amount) override external {
        require(
            msg.sender == _owner,
            "Account: only owner can withdraw"
        );

        _withdraw(token, amount);
    }

    function withdrawETH(uint256 amount) override payable external {
        require(
            msg.sender == _owner,
            "Account: only owner can withdraw"
        );
        require(amount > 0, "Account: amount must be greater than 0");

        _withdraw(address(0), amount);
    }

    function _createOrder(
        Order order,
        address exchange,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) private returns (bool success, bytes memory data) {
        if (order == Order.IncreasePosition) {
            return exchange.delegatecall(
                abi.encodeWithSignature(
                    "increasePosition(address,address,uint256,uint256,bool)",
                    collateral,
                    index,
                    collateralAmount,
                    size,
                    isLong
                )
            );
        } else if (order == Order.DecreasePosition) {
            return exchange.delegatecall(
                abi.encodeWithSignature(
                    "decreasePosition(address,address,uint256,bool)",
                    collateral,
                    index,
                    size,
                    isLong
                )
            );
        } else if (order == Order.IncreaseCollateral) {
            return exchange.delegatecall(
                abi.encodeWithSignature(
                    "increaseCollateral(address,address,uint256,bool)",
                    collateral,
                    index,
                    collateralAmount,
                    isLong
                )
            );
        } else if (order == Order.DecreaseCollateral) {
            return exchange.delegatecall(
                abi.encodeWithSignature(
                    "decreaseCollateral(address,address,uint256,bool)",
                    collateral,
                    index,
                    collateralAmount,
                    isLong
                )
            );
        }
    }

    function createOrders(
        Order order,
        address[] calldata exchange, // [exchange0, exchange1, ...]
        address collateral,
        address index,
        uint256[] calldata collateralAmount, // [collateralAmount0, collateralAmount1, ...]
        uint256[] calldata size, // [size0, size1, ...]
        bool isLong
    ) payable external {
        for (uint256 i = 0; i < exchange.length; i++) {
            (bool success, bytes memory data) = _createOrder(
                order,
                exchange[i],
                collateral,
                index,
                collateralAmount[i],
                size[i],
                isLong
            );
            require(success, string(data));
        }
    }

    // called by decentralized admin(or executor)
    // function manageOrders();

    // function getPositions();
    // TODO: consider using variable for multiple position
}
