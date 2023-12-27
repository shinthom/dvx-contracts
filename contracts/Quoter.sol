// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interfaces/IAdapter.sol";
import "./interfaces/IExchange.sol";

contract Quoter {
    uint256 public constant PRICE_DECIMAL = 2;

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

    struct Answer {
        uint256 price;
        uint256 fee;
        uint256 availableLiquidity;
        IExchange.PositionOrder positionOrder;
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
        IAdapter.Position memory currentPosition = adapter.getPosition(
            account,
            positionOrder.path[positionOrder.path.length - 1],
            positionOrder.index,
            positionOrder.isLong
        );

        // usd
        fee = adapter.getPositionFee(order.index, order.indexPrice, positionOrder.size);
        if (currentPosition.size > 0) {
            fee += adapter.getFundingFee(
                positionOrder.path[positionOrder.path.length - 1],
                order.index,
                currentPosition.size,
                currentPosition.fundingRate,
                order.isLong,
                order.indexPrice
            );
            fee += adapter.getDepositFee(account, positionOrder);
        }

        uint256 priceDecimals = adapter.getPriceDecimals();
        if (priceDecimals > PRICE_DECIMAL) {
            fee = fee / (10 ** (priceDecimals - PRICE_DECIMAL));
        } else {
            fee = fee * (10 ** (PRICE_DECIMAL - priceDecimals));
        }
    }

    function get(
        address account,
        IAdapter[] memory adapters,
        Order[] memory orders
    ) public view returns (Answer[] memory answers) {
        answers = new Answer[](adapters.length);
        for (uint256 i = 0; i < adapters.length; i++) {
            answers[i] = _get(account, adapters[i], orders[i]);
        }
    }

    function _get(
        address account,
        IAdapter adapter,
        Order memory order
    ) private view returns (Answer memory answer) {
        answer.price = adapter.getPrice(
            order.index,
            order.indexPrice,
            order.isLong
        );
        answer.fee = getFee(account, adapter, order);
        answer.availableLiquidity = adapter.getAvailableLiquidity(
            order.index,
            order.isLong
        );
        answer.positionOrder = makePositionOrder(adapter, order);
    }

    function quote(
        address account,
        IAdapter[] memory adapters,
        Order[] memory orders
    ) public view returns (Answer[] memory answers) {
        require(
            adapters.length > 0 && adapters.length == orders.length,
            "INVALID_LENGTH"
        );

        uint256[] memory feeList = new uint256[](adapters.length);
        for (uint256 i = 0; i < adapters.length; i++) {
            feeList[i] = getFee(account, adapters[i], orders[i]);
        }

        // sort by fee
        for (uint256 i = 0; i < adapters.length; i++) {
            for (uint256 j = i + 1; j < adapters.length; j++) {
                if (feeList[i] > feeList[j]) {
                    IAdapter temp0 = adapters[i];
                    adapters[i] = adapters[j];
                    adapters[j] = temp0;

                    Order memory temp1 = orders[i];
                    orders[i] = orders[j];
                    orders[j] = temp1;
                }
            }
        }
        answers = get(account, adapters, orders);
    }

    // test
    function sort(uint256[] memory arr) public pure returns (uint256[] memory) {
        for (uint256 i = 0; i < arr.length; i++) {
            for (uint256 j = i + 1; j < arr.length; j++) {
                if (arr[i] > arr[j]) {
                    uint256 temp = arr[i];
                    arr[i] = arr[j];
                    arr[j] = temp;
                }
            }
        }

        return arr;
    }
}
