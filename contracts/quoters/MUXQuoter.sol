// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;

import "../interfaces/tokens/IERC20.sol";
import "../interfaces/exchanges/MUX/ILiquidityPool.sol";
import "hardhat/console.sol";

contract MUXQuoter {
    address private _liquidityPool = 0x3e0199792Ce69DC29A0a36146bFa68bd7C8D6633;

    function _getIdFromAsset(address tokenAddress) private view returns (uint8) {
        ILiquidityPool.Asset[] memory assets = ILiquidityPool(_liquidityPool).getAllAssetInfo();
        for (uint256 i = 0; i < assets.length; i++) {
            if (assets[i].tokenAddress == tokenAddress) {
                return assets[i].id;
            }
        }
        revert("NOT_FOUND");
    }

    function getPositionFee(
        uint256 price, // 1e18
        address index,
        uint256 size // 10 ** token decimal
    ) public view returns (
        uint256 // 1e18
    ) {
        uint8 decimals = IERC20(index).decimals();
        uint8 indexId = _getIdFromAsset(index);
        uint32 positionFeeRate
            = (ILiquidityPool(_liquidityPool).getAssetInfo(indexId)).positionFeeRate;

        return price * size * positionFeeRate / 1e5 / 10 ** decimals;
    }

    // todo: getFundingFee
}
