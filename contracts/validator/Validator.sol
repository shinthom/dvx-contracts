// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Validator is Ownable {
    address public exchange;

    constructor(address _exchange) {
        exchange = _exchange;
    }

    function setExchange(address _exchange) external onlyOwner {
        exchange = _exchange;
    }

    function validateAddMargin(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 marginAmount
    ) external view returns (bool) {}

    function validateRealizeProfit(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 profitAmount
    ) external view returns (bool) {}
}
