// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;

import "../interfaces/exchanges/GMXV1/IVault.sol";

interface IAdapter {
    // function getPosition(
    //     address collateral,
    //     address index,
    //     bool isLong
    // ) external view returns(IVault.Position memory);

    // function getFee() external;

    function increasePosition(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 fee
    ) payable external;

    function decreasePosition(
        address collateral,
        address index,
        // uint256 collateralAmount,
        uint256 size,
        bool isLong,
        uint256 fee
    ) payable external;

    function increaseCollateral(
        address collateral,
        address index,
        uint256 collateralAmount,
        // uint256 size,
        bool isLong,
        uint256 fee
    ) payable external;

    function decreaseCollateral(
        address collateral,
        address index,
        uint256 collateralAmount,
        // uint256 size,
        bool isLong,
        uint256 fee
    ) payable external;
}