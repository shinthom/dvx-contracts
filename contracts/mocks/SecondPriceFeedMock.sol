// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract SecondPriceFeedMock {
    mapping(address => uint256) private _minPrices;
    mapping(address => uint256) private _maxPrices;

    function setMinPrice(address token, uint256 minPrice) external {
        _minPrices[token] = minPrice;
    }

    function setMaxPrice(address token, uint256 maxPrice) external {
        _maxPrices[token] = maxPrice;
    }

    function getPrice(address token, uint256 /* refPrice */, bool maximise) external view returns (uint256) {
        return maximise ? _maxPrices[token] : _minPrices[token];
    }
}