// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IFastPriceFeed {
    function setPrices(address[] memory _tokens, uint256[] memory _prices, uint256 _timestamp) external;

    function maxTimeDeviation() external view returns (uint256);
}