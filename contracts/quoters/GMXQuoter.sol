// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;

import "../interfaces/tokens/IERC20.sol";
import "../interfaces/exchanges/GMXV1/IPositionRouter.sol";
import "../interfaces/exchanges/GMXV1/IVault.sol";
import "hardhat/console.sol";

contract GMXQuoter {
    address private WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;

    address private _vault = 0x489ee077994B6658eAfA855C308275EAd8097C4A;
    address private _positionRouter = 0xb87a436B93fFE9D75c5cFA7bAcFff96430b09868;

    function getPrice(
        address collateral,
        bool isLong
    ) public view returns (
        uint256 // 1e30
    ) {
        return isLong ?
            IVault(_vault).getMaxPrice(collateral) :
            IVault(_vault).getMinPrice(collateral);
    }

    function getExecutionFee(
        bool isLong
    ) public view returns (
        uint256 // 1e30
    ) {
        uint256 price = getPrice(WETH, isLong);
        uint256 fee = IPositionRouter(_positionRouter).minExecutionFee();

        return price * fee / 1e18;
    }

    function getPositionFee(
        uint256 size // 1e30
    ) public view returns (
        uint256 // 1e30
    ) {
        uint256 fee = IVault(_vault).getPositionFee(size);

        // bug: fee is not calculated correctly (should use 40 but 10)
        {
            uint256 marginFeeBasisPoints = IVault(_vault).marginFeeBasisPoints();
            console.log("marginFeeBasisPoints: %s", marginFeeBasisPoints); // 40

            uint256 fee0 = size * marginFeeBasisPoints / 10000; // 40
            uint256 fee1 = size * 10 / 10000; // 10
            console.log("fee0(40): %s", fee0);
            console.log("fee1(10): %s", fee1);
        }

        return fee;
    }

    function getAvailableLiquidity(address index) public view returns (uint256) {
        uint256 maxGlobalLongSize = IPositionRouter(_positionRouter).maxGlobalLongSizes(index);
        uint256 guaranteedUsd = IVault(_vault).guaranteedUsd(index);

        return maxGlobalLongSize - guaranteedUsd;
    }

    // todo: getFundingFee
    // todo: getDepositFee
}

