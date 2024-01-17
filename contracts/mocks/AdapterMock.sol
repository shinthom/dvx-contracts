// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IAdapter} from "../interfaces/IAdapter.sol";

contract AdapterMock {
    uint256 private _size;
    uint256 private _minExeuctionFee;
    uint256 private _wrapPrice;

    constructor() {
        _size = 10;
        _minExeuctionFee = 10;
    }

    function setSize(uint256 size) external {
        _size = size;
    }

    function setMinExecutionFee(uint256 fee) external {
        _minExeuctionFee = fee;
    }

    function setWrapPrice(uint256 price) external {
        _wrapPrice = price;
    }

    function getMinExecutionFee() external view returns (uint256) {
        return _minExeuctionFee;
    }

    function getWrapPrice(
        address index,
        bool isLong
    ) external returns (uint256) {
        return _wrapPrice;
    }

    function getPosition(
        address account,
        address tokenIn,
        address tokenOut,
        bool isLong
    ) external view returns (IAdapter.Position memory) {
        return IAdapter.Position(10, _size, 10, 10, 10, true);
    }
}
