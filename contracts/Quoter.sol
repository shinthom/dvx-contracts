// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interfaces/IAdapter.sol";
import "./interfaces/IExchange.sol";

contract Quoter {
    address private constant _vault = 0x489ee077994B6658eAfA855C308275EAd8097C4A;

    address[] private _adapters;

    constructor(address[] memory adapters) {
        _adapters = adapters;
    }

    struct Order {
        address collateral;
        address index;
        uint256 collateralAmount;
        uint256 leverage;
        bool isLong;
        // prices
        uint256 collateralPrice;
        uint256 indexPrice;
    }

    function makePositionOrder(
        IAdapter adapter,
        Order memory order
    ) public view returns (IExchange.PositionOrder memory) {
        IExchange.PositionOrder memory positionOrder
            = adapter.makePositionOrder(
                order.collateral,
                order.index,
                order.collateralAmount,
                order.leverage,
                order.isLong,
                order.collateralPrice,
                order.indexPrice
            );

        return positionOrder;
    }

    function getPosition(
        address account,
        IAdapter adapter,
        Order memory order
    ) public view returns (IAdapter.Position memory) {
        IExchange.PositionOrder memory positionOrder = makePositionOrder(adapter, order);

        return adapter.getPosition(
            account,
            positionOrder.path[positionOrder.path.length - 1],
            positionOrder.index,
            positionOrder.isLong
        );
    }

    function getFee(
        address account,
        IAdapter adapter,
        Order memory order
    ) public view returns (uint256 fee) {
        IExchange.PositionOrder memory positionOrder = adapter.makePositionOrder(
            order.collateral,
            order.index,
            order.collateralAmount,
            order.leverage,
            order.isLong,
            order.collateralPrice,
            order.indexPrice
        );
        IAdapter.Position memory position = adapter.getPosition(
            account,
            positionOrder.path[positionOrder.path.length - 1],
            positionOrder.index,
            positionOrder.isLong
        );

        // usd
        fee = adapter.getPositionFee(order.index, order.indexPrice, positionOrder.size);
        if (position.size > 0) {
            fee += adapter.getFundingFee(
                positionOrder.path[positionOrder.path.length - 1],
                order.index,
                positionOrder.size,
                position.fundingRate,
                order.isLong,
                order.indexPrice
            );

            // todo: get collateral amount (need to swap)
            // fee += adapter.getDepositFee(collateral, );
        }
    }

    function get(
        address account,
        IAdapter[] memory adapters,
        Order[] memory orders
    ) public view returns (
        uint256[] memory prices,
        uint256[] memory fees,
        uint256[] memory availableLiquiditys
    ) {
        prices = new uint256[](adapters.length);
        fees = new uint256[](adapters.length);
        availableLiquiditys = new uint256[](adapters.length);

        for (uint256 i = 0; i < adapters.length; i++) {
            prices[i] = adapters[i].getPrice(
                orders[i].index,
                orders[i].indexPrice,
                orders[i].isLong
            );
            fees[i] = getFee(account, adapters[i], orders[i]);
            availableLiquiditys[i] = adapters[i].getAvailableLiquidity(
                orders[i].index,
                orders[i].isLong
            );
        }
    }

    function quote(
        address account,
        IAdapter[] memory adapters,
        Order[] memory orders
    ) public view returns (
        IAdapter,
        Order memory,
        IExchange.PositionOrder memory
    ) {
        uint256[] memory fees = new uint256[](adapters.length);
        for (uint256 i = 0; i < adapters.length; i++) {
            fees[i] = getFee(account, adapters[i], orders[i]);
        }

        // sort by fee
        IExchange.PositionOrder[] memory positionOrders = new IExchange.PositionOrder[](adapters.length);
        for (uint256 i = 0; i < adapters.length; i++) {
            for (uint256 j = i + 1; j < adapters.length; j++) {
                if (fees[i] < fees[j]) {
                    IAdapter t0 = adapters[i];
                    adapters[i] = adapters[j];
                    adapters[j] = t0;

                    Order memory t1 = orders[i];
                    orders[i] = orders[j];
                    orders[j] = t1;

                    positionOrders[i] = makePositionOrder(adapters[i], orders[i]);
                }
            }
        }

        // todo: split position orders if available liquidity is not enough
        return (adapters[0], orders[0], positionOrders[0]);
    }

    // test
    function sort(uint256[] memory arr) public pure returns (uint256[] memory) {
        for (uint256 i = 0; i < arr.length; i++) {
            for (uint256 j = i + 1; j < arr.length; j++) {
                if (arr[i] < arr[j]) {
                    uint256 temp = arr[i];
                    arr[i] = arr[j];
                    arr[j] = temp;
                }
            }
        }

        return arr;
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