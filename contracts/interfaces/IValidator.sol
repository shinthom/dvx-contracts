// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

interface IValidator {
    function validateAddMargin(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 marginAmount
    ) external view returns (bool);

    function validateRealizeProfit(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 profitAmount
    ) external view returns (bool);
}
