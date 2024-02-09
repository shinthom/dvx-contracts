// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

interface IMarginManager {
    function validateAddAcmmMargin(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 marginAmount
    ) external view returns (bool);

    function validateSubAcmmMargin(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 marginAmount
    ) external view returns (bool);
}
