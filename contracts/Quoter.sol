// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interfaces/IAdapter.sol";
import "./interfaces/IExchange.sol";
import "./interfaces/IQuoter.sol";

contract Quoter is IQuoter {
    uint256 public constant PRICE_DECIMAL = 2;

    function makePositionOrder(
        address adapter,
        Request memory order
    ) public view returns (IExchange.PositionOrder memory) {
        IExchange.PositionOrder memory positionOrder
            = IAdapter(adapter).makePositionOrder(
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
        address adapter,
        Request memory request
    ) public view returns (IAdapter.Position memory) {
        IExchange.PositionOrder memory positionOrder = makePositionOrder(adapter, request);

        return IAdapter(adapter).getPosition(
            account,
            positionOrder.path[positionOrder.path.length - 1],
            positionOrder.index,
            positionOrder.isLong
        );
    }

    function getFee(
        address account,
        address adapter,
        Request memory request
    ) public view returns (uint256 fee) {
        IExchange.PositionOrder memory positionOrder = IAdapter(adapter).makePositionOrder(
            request.collateral,
            request.index,
            request.collateralAmount,
            request.leverage,
            request.isLong,
            request.collateralPrice,
            request.indexPrice
        );
        IAdapter.Position memory currentPosition = IAdapter(adapter).getPosition(
            account,
            positionOrder.path[positionOrder.path.length - 1],
            positionOrder.index,
            positionOrder.isLong
        );

        // usd
        fee = IAdapter(adapter).getPositionFee(request.index, request.indexPrice, positionOrder.size);
        if (currentPosition.size > 0) {
            fee += IAdapter(adapter).getFundingFee(
                positionOrder.path[positionOrder.path.length - 1],
                request.index,
                currentPosition.size,
                currentPosition.fundingRate,
                request.isLong,
                request.indexPrice
            );
            fee += IAdapter(adapter).getDepositFee(account, positionOrder);
        }

        uint256 priceDecimals = IAdapter(adapter).getPriceDecimals();
        if (priceDecimals > PRICE_DECIMAL) {
            fee = fee / (10 ** (priceDecimals - PRICE_DECIMAL));
        } else {
            fee = fee * (10 ** (PRICE_DECIMAL - priceDecimals));
        }
    }

    function getCollateralPrice(
        address adapter,
        Request memory request
    ) public view returns (uint256 price) {
        price = IAdapter(adapter).getPrice(
            request.collateral,
            request.collateralPrice,
            request.isLong
        );

        uint256 priceDecimals = IAdapter(adapter).getPriceDecimals();
        if (priceDecimals > PRICE_DECIMAL) {
            price = price / (10 ** (priceDecimals - PRICE_DECIMAL));
        } else {
            price = price * (10 ** (PRICE_DECIMAL - priceDecimals));
        }
    }

    function getIndexPrice(
        address adapter,
        Request memory request
    ) public view returns (uint256 price) {
        price = IAdapter(adapter).getPrice(
            request.index,
            request.indexPrice,
            request.isLong
        );

        uint256 priceDecimals = IAdapter(adapter).getPriceDecimals();
        if (priceDecimals > PRICE_DECIMAL) {
            price = price / (10 ** (priceDecimals - PRICE_DECIMAL));
        } else {
            price = price * (10 ** (PRICE_DECIMAL - priceDecimals));
        }
    }

    function get(
        address account,
        address[] memory adapters,
        Request[] memory requests
    ) public view returns (Answer[] memory answers) {
        answers = new Answer[](adapters.length);
        for (uint256 i = 0; i < adapters.length; i++) {
            answers[i] = _get(account, adapters[i], requests[i]);
        }
    }

    function _get(
        address account,
        address adapter,
        Request memory request
    ) private view returns (Answer memory answer) {
        answer.adapter = adapter;
        answer.collateralPrice = getCollateralPrice(adapter, request);
        answer.indexPrice = getIndexPrice(adapter, request);
        answer.fee = getFee(account, adapter, request);
        answer.availableLiquidity = IAdapter(adapter).getAvailableLiquidity(
            request.index,
            request.isLong
        );
        answer.positionOrder = makePositionOrder(adapter, request);
    }

    function quote(
        address account,
        address[] memory adapters,
        Request[] memory requests
    ) override public view returns (Answer[] memory answers) {
        require(
            adapters.length > 0 && adapters.length == requests.length,
            "INVALID_LENGTH"
        );

        uint256[] memory feeList = new uint256[](adapters.length);
        for (uint256 i = 0; i < adapters.length; i++) {
            feeList[i] = getFee(account, adapters[i], requests[i]);
        }

        // sort by fee
        if (adapters.length > 1) {
            for (uint256 i = 0; i < adapters.length; i++) {
                for (uint256 j = i + 1; j < adapters.length; j++) {
                    if (feeList[i] > feeList[j]) {
                        address temp0 = adapters[i];
                        adapters[i] = adapters[j];
                        adapters[j] = temp0;

                        Request memory temp1 = requests[i];
                        requests[i] = requests[j];
                        requests[j] = temp1;
                    }
                }
            }
        }
        // todo: split answers following available liquditiy.
        answers = new Answer[](1);
        answers[0] = _get(account, adapters[0], requests[0]);
    }

    // test
    function quote2(
        address account,
        address[] memory adapters,
        Request[] memory requests
    ) public view returns (Answer[] memory answers) {
        require(
            adapters.length > 0 && adapters.length == requests.length,
            "INVALID_LENGTH"
        );

        uint256[] memory feeList = new uint256[](adapters.length);
        for (uint256 i = 0; i < adapters.length; i++) {
            feeList[i] = getFee(account, adapters[i], requests[i]);
        }

        // sort by fee
        for (uint256 i = 0; i < adapters.length; i++) {
            for (uint256 j = i + 1; j < adapters.length; j++) {
                if (feeList[i] > feeList[j]) {
                    address temp0 = adapters[i];
                    adapters[i] = adapters[j];
                    adapters[j] = temp0;

                    Request memory temp1 = requests[i];
                    requests[i] = requests[j];
                    requests[j] = temp1;
                }
            }
        }
        answers = get(account, adapters, requests);
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
