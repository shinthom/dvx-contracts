// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IAdapter} from "../../contracts/interfaces/IAdapter.sol";

// Implements the subset of IAdapter used by Exchange/Warehouse/Account.
// The position-mutating functions are executed via delegatecall from
// Account, so they must never touch storage.
contract MockAdapter {
    uint256 private _wrapPrice;
    uint256 private _positionSize;
    address private _profitToken;
    uint256 private _minExecutionFee;

    event MockIncreasePosition(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        uint256 acceptablePrice,
        bool isLong
    );
    event MockDecreasePosition(
        address collateral,
        address index,
        uint256 size,
        bool isLong,
        uint256 acceptablePrice
    );
    event MockIncreaseCollateral(
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong
    );
    event MockDecreaseCollateral(
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong
    );

    function setWrapPrice(uint256 price) external {
        _wrapPrice = price;
    }

    function setPositionSize(uint256 size) external {
        _positionSize = size;
    }

    function setProfitToken(address token) external {
        _profitToken = token;
    }

    function setMinExecutionFee(uint256 fee) external {
        _minExecutionFee = fee;
    }

    function name() external pure returns (string memory) {
        return "MockAdapter";
    }

    function getWrapPrice(address, bool) external view returns (uint256) {
        return _wrapPrice;
    }

    function getPrice(address, bool) external view returns (uint256) {
        return _wrapPrice;
    }

    function getPosition(
        address,
        address,
        address,
        bool isLong
    ) external view returns (IAdapter.Position memory) {
        return IAdapter.Position(0, _positionSize, 0, _wrapPrice, 0, isLong);
    }

    function getWrapPosition(
        address,
        address,
        address,
        bool isLong
    ) external view returns (IAdapter.Position memory) {
        return IAdapter.Position(0, _positionSize, 0, _wrapPrice, 0, isLong);
    }

    function getProfitToken(
        address collateral,
        address,
        bool
    ) external view returns (address) {
        return _profitToken == address(0) ? collateral : _profitToken;
    }

    function getMinExecutionFee() external view returns (uint256) {
        return _minExecutionFee;
    }

    // ----- delegatecall targets (storage must stay untouched) -----

    function increasePosition(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        uint256 acceptablePrice,
        bool isLong
    ) external payable {
        emit MockIncreasePosition(
            collateral,
            index,
            collateralAmount,
            size,
            acceptablePrice,
            isLong
        );
    }

    function decreasePosition(
        address collateral,
        address index,
        uint256 size,
        bool isLong,
        uint256 acceptablePrice
    ) external payable {
        emit MockDecreasePosition(collateral, index, size, isLong, acceptablePrice);
    }

    function increaseCollateral(
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong
    ) external payable {
        emit MockIncreaseCollateral(collateral, index, collateralAmount, isLong);
    }

    function decreaseCollateral(
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong
    ) external payable {
        emit MockDecreaseCollateral(collateral, index, collateralAmount, isLong);
    }
}
