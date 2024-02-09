// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IAdapter} from "../interfaces/IAdapter.sol";
import {ILogger} from "../interfaces/ILogger.sol";

abstract contract BaseAdapter is IAdapter {
    address private immutable _logger;

    constructor(address logger) {
        _logger = logger;
    }

    function logAddAcmmMargin(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 marginAmount,
        bool isLong
    ) internal {
        ILogger(_logger).logAddAcmmMargin(
            account,
            adapter,
            collateral,
            index,
            marginAmount,
            isLong
        );
    }

    function logSubAcmmMargin(
        address account,
        address adapter,
        address collateral,
        address index,
        uint256 marginAmount,
        bool isLong
    ) internal {
        ILogger(_logger).logSubAcmmMargin(
            account,
            adapter,
            collateral,
            index,
            marginAmount,
            isLong
        );
    }
}
