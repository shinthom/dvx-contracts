// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IMarginManager} from "../interfaces/IMarginManager.sol";

contract MarginManager is IMarginManager {
    function validateAddAcmmMargin(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 marginAmount
    ) external view override returns (bool) {
        return true;
    }

    function validateSubAcmmMargin(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 marginAmount
    ) external view override returns (bool) {
        return true;
    }
}
