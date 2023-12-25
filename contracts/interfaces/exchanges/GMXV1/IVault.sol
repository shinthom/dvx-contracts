// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IVault {
    struct Position {
        uint256 size;
        uint256 collateral;
        uint256 averagePrice;
        uint256 entryFundingRate;
        uint256 reserveAmount;
        int256 realisedPnl;
        uint256 lastIncreasedTime;
    }

    function positions(bytes32 positionKey) external view returns (Position memory);

    function getPositionKey(
        address _account,
        address _collateralToken,
        address _indexToken,
        bool _isLong
    ) external pure returns (bytes32);

    function getMaxPrice(address _token) external view returns (uint256);

    function getMinPrice(address _token) external view returns (uint256);

    function poolAmounts(address token) external view returns (uint256);

    function guaranteedUsd(address _token) external view returns (uint256);

    function globalShortSizes(address _token) external view returns (uint256);

    function getPositionDelta(address _account, address _collateralToken, address _indexToken, bool _isLong) external view returns (bool, uint256);

    function getPosition(address _account, address _collateralToken, address _indexToken, bool _isLong) external view returns (uint256, uint256, uint256, uint256, uint256, uint256, bool, uint256);

    function FUNDING_RATE_PRECISION() external view returns (uint256);

    function cumulativeFundingRates(address _token) external view returns (uint256);

    function getPositionFee(uint256 _sizeDelta) external view returns (uint256);

    function getFundingFee(address _account, address _collateralToken, address _indexToken, bool _isLong, uint256 _size, uint256 _entryFundingRate) external view returns (uint256);

    function getFundingFee(address _collateralToken, uint256 _size, uint256 _entryFundingRate) external view returns (uint256);

    function marginFeeBasisPoints() external view returns (uint256);
}