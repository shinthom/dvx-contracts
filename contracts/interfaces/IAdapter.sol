// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;

interface IAdapter {
    struct Position {
        uint256 collateralAmount;
        uint256 size;
        uint256 lastIncreasedTime;
        uint256 price;
        uint256 fundingRate;
        bool isLong;
    }

    function getPosition(
        address account,
        address collateral,
        address index,
        bool isLong
    ) external view returns (Position memory);

    // function getFee() external;

    function increasePosition(
        address collateral,
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
        address collateral,
        address index,
        uint256 collateralAmount,
        // uint256 size,
        bool isLong
    ) payable external;

    function decreaseCollateral(
        address collateral,
        address index,
        uint256 collateralAmount,
        // uint256 size,
        bool isLong
    ) payable external;
}