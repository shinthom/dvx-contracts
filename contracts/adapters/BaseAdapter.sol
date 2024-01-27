// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IAdapter} from "../interfaces/IAdapter.sol";
import {ILogger} from "../interfaces/ILogger.sol";

abstract contract BaseAdapter is IAdapter {
    address private immutable _logger;

    constructor(address logger) {
        _logger = logger;
    }

    function logIncreasePosition(
        uint256 marketOrderId,
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 entryPrice,
        uint256 fee
    ) internal {
        ILogger(_logger).logIncreasePosition(
            marketOrderId,
            account,
            adapter,
            collateral,
            index,
            collateralAmount,
            size,
            isLong,
            100, // fixme: entryPrice
            fee
        );
    }

    function logDecreasePosition(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 size,
        bool isLong
    ) internal {
        ILogger(_logger).logDecreasePosition(
            account,
            adapter,
            collateral,
            index,
            size,
            isLong
        );
    }

    function logIncreaseCollateral(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount
    ) internal {
        ILogger(_logger).logIncreaseCollateral(
            account,
            adapter,
            collateral,
            index,
            collateralAmount
        );
    }

    function logDecreaseCollateral(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 collateralAmount
    ) internal {
        ILogger(_logger).logDecreaseCollateral(
            account,
            adapter,
            collateral,
            index,
            collateralAmount
        );
    }
}
