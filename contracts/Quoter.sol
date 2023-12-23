// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interfaces/IAdapter.sol";
import "./interfaces/IExchange.sol";
import "./interfaces/tokens/IERC20.sol";
import "./interfaces/exchanges/GMXV1/IVault.sol";

contract Quoter {
    address private _vault = 0x489ee077994B6658eAfA855C308275EAd8097C4A;

    address[] private _adapters;

    constructor(address[] memory adapters) {
        _adapters = adapters;
    }

    struct OrderRequest {
        address collateral;
        address index;
        uint256 collateralAmount;
        uint256 leverage;
        bool isLong;
    }

    function quote(
        OrderRequest calldata orderRequest,
        IAdapter[] calldata adapters,
        uint256[] calldata collateralPrices,
        uint256[] calldata indexPrices
    ) external view {
        for (uint256 i = 0; i < adapters.length; i++) {
            IAdapter adapter = adapters[i];
            IExchange.Order memory order = adapter.makeOrder(
                orderRequest.collateral,
                orderRequest.index,
                orderRequest.collateralAmount,
                orderRequest.leverage,
                orderRequest.isLong,
                collateralPrices[i],
                indexPrices[i]
            );

            // calculate feeUsd and applied price decimal
            uint256 positionFee = adapter.getPositionFee(
                orderRequest.collateral,
                orderRequest.index,
                indexPrices[i],
                order.size
            );
            uint256 priceDecimals = adapter.priceDecimals();
            // note: make price 2 decimals
            if (priceDecimals > 2) {
                positionFee = positionFee / (10 ** (priceDecimals - 2));
            } else {
                positionFee = positionFee * (10 ** (2 - priceDecimals));
            }

            uint256 availableLiquidity
                = adapter.getAvailableLiquidity(orderRequest.index, orderRequest.isLong);

            // todo: fundingFee
        }
    }
}

// await fetch("https://app.mux.network/api/liquidityAsset", {
//     method: "GET", // HTTP 요청 메소드 (GET, POST, PUT, DELETE 등)
//     headers: {
//       "Content-Type": "application/json",
//     },
//   })
//     .then((response) => {
//       if (!response.ok) {
//         throw new Error("Network response was not ok");
//       }
//       return response.json();
//     })
//     .then((data) => {
//       apiData = {
//         assets: data.assets
//           .filter((asset) => asset.symbol === "ETH")
//           .map((asset) => ({
//             symbol: asset.symbol,
//             isStable: asset.isStable,
//             price: asset.price,
//           })),
//       };
//     })
//     .catch((error) => {
//       console.error(
//         "There has been a problem with your fetch operation:",
//         error
//       );
//     });