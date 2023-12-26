// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./IExchange.sol";

interface IAdapter {
    struct Position {
        uint256 collateralAmount;
        uint256 size;
        uint256 lastIncreasedTime;
        uint256 price;
        uint256 fundingRate;
        bool isLong;
    }

    function getPriceDecimals() external view returns (uint256);

    function getPrice(
        address collateral,
        uint256 price,
        bool isLong
    ) external view returns (uint256);

    function getDepositFee(
        address account,
        IExchange.PositionOrder memory positionOrder
    ) external view returns (uint256);

    function getFundingFee(
        address collateral,
        address index,
        uint256 size,
        uint256 entryFundingRate,
        bool isLong,
        uint256 indexPrice
    ) external view returns (uint256);

    function getPositionFee(
        address index,
        uint256 indexPrice,
        uint256 size
    ) external view returns (uint256);

    function getAvailableLiquidity(address index, bool isLong) external view returns (uint256);

    function makePositionOrder(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 leverage,
        bool isLong,
        uint256 collateralPrice,
        uint256 indexPrice
    ) external view returns (IExchange.PositionOrder memory);

    function getPosition(
        address account,
        address collateral,
        address index,
        bool isLong
    ) external view returns (Position memory);

    function increasePosition(
        address[] memory path,
        address index,
        uint256 collateralAmount,
        uint256 size, // TODO: considering using leverage instead of size (it could be more easy to calcualte size from leverage)
        bool isLong
    ) payable external;

    function decreasePosition(
        address collateral,
        address index,
        // uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) payable external;

    function increaseCollateral(
        address[] memory path,
        address index,
        uint256 collateralAmount,
        bool isLong
    ) payable external;

    function decreaseCollateral(
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong
    ) payable external;
}