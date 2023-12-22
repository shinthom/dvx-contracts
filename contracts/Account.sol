// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;

import "./interfaces/tokens/IERC20.sol";
import "./interfaces/IAccount.sol";
import "./interfaces/IAdapter.sol";
import "./interfaces/IExchange.sol";

contract Account is IAccount {
    address private _owner;
    address private _exchange;

    constructor(
        address wallet,
        address exchange
    ) {
        _owner = wallet;
        _exchange = exchange;
    }

    receive() external payable {}

    function owner() public view returns (address) {
        return _owner;
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amount
    ) override external returns (uint256 amountOut) {
        if (tokenIn == address(0)) {
            require(address(this).balance >= amount, "INSUFFICIENT_BALANCE");
            amountOut = IExchange(_exchange).swap{value: amount}(tokenIn, tokenOut, amount);
        } else {
            IERC20(tokenIn).approve(_exchange, amount);
            amountOut = IExchange(_exchange).swap(tokenIn, tokenOut, amount);
        }
    }

    function getPositions(
        address adapter,
        address[] memory collaterals,
        address[] memory indexs
    ) public view returns (IAdapter.Position[] memory) {
        bool[] memory isLongs = new bool[](2);
        isLongs[0] = true;
        isLongs[1] = false;

        IAdapter.Position[] memory positions
            = new IAdapter.Position[](collaterals.length * indexs.length * isLongs.length);

        for (uint256 i = 0; i < collaterals.length; i++) {
            for (uint256 j = 0; j < indexs.length; j++) {
                for (uint256 k = 0; k < isLongs.length; k++) {
                    positions[i * indexs.length * isLongs.length + j * isLongs.length + k]
                        = IAdapter(adapter).getPosition(address(this), collaterals[i], indexs[j], isLongs[k]);
                }
            }
        }
        return positions;
    }

    function getPosition(
        address adapter,
        address collateral,
        address index,
        bool isLong
    ) public view returns (IAdapter.Position memory) {
        return IAdapter(adapter).getPosition(address(this), collateral, index, isLong);
    }

    function getBalance(address token) override public view returns (uint256) {
        if (token == address(0)) {
            return address(this).balance;
        } else {
            return IERC20(token).balanceOf(address(this));
        }
    }

    function deposit(address token, uint256 amount) override payable external {
        require(amount > 0, "ZERO_AMOUNT");

        if (token == address(0)) {
            require(amount == msg.value, "VAL");
        } else {
            IERC20(token).transferFrom(msg.sender, address(this), amount );
        }
        emit Deposited(msg.sender, token, amount);
    }

    function withdraw(address token, uint256 amount) override external {
        require(msg.sender == _owner, "NOT_OWNER");
        require(amount > 0, "ZERO_AMOUNT");

        if (token == address(0)) {
            payable(msg.sender).transfer(amount);
        } else {
            IERC20(token).transfer(msg.sender, amount);
        }
        emit Withdrawn(msg.sender, token, amount);
    }

    function _createOrder(
        address exchange,
        IExchange.Order calldata order
    ) private returns (bool success, bytes memory data) {
        IExchange.OrderType orderType = order.orderType;

        // // todo: fix
        // uint256 fee;
        // if (_exchange != address(0)) {
        //     fee = IExchange(_exchange).getFee(
        //         orderType,
        //         order
        //     );
        // }

        if (orderType == IExchange.OrderType.IncreasePosition) {
            return exchange.delegatecall(
                abi.encodeWithSignature(
                    "increasePosition(address,address,uint256,uint256,bool)",
                    order.collateral,
                    order.index,
                    order.collateralAmount,
                    order.size,
                    order.isLong
                )
            );
        } else if (orderType == IExchange.OrderType.DecreasePosition) {
            return exchange.delegatecall(
                abi.encodeWithSignature(
                    "decreasePosition(address,address,uint256,bool)",
                    order.collateral,
                    order.index,
                    order.size,
                    order.isLong
                )
            );
        } else if (orderType == IExchange.OrderType.IncreaseCollateral) {
            return exchange.delegatecall(
                abi.encodeWithSignature(
                    "increaseCollateral(address,address,uint256,bool)",
                    order.collateral,
                    order.index,
                    order.collateralAmount,
                    order.isLong
                )
            );
        } else if (orderType == IExchange.OrderType.DecreaseCollateral) {
            return exchange.delegatecall(
                abi.encodeWithSignature(
                    "decreaseCollateral(address,address,uint256,bool)",
                    order.collateral,
                    order.index,
                    order.collateralAmount,
                    order.isLong
                )
            );
        }
    }

    function createOrders(
        address[] calldata adapters,
        IExchange.Order[] calldata orders
    ) override payable external {
        for (uint256 i = 0; i < adapters.length; i++) {
            (bool success, bytes memory data) = _createOrder(
                adapters[i],
                orders[i]
            );
            emit OrderCreated(address(this), adapters[i], orders[i]);

            require(success, string(data));
        }
    }

    // called by decentralized admin(or executor)
    // function manageMargins() onlyExchange;

    // function getPositions();
    // TODO: consider using variable for multiple position
}
