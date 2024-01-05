// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IAdapter } from  "./interfaces/IAdapter.sol";
import { IExchange } from  "./interfaces/IExchange.sol";
import { IQuoter } from "./interfaces/IQuoter.sol";

contract Quoter is IQuoter {
    uint256 public constant PRICE_DECIMAL = 2;

    function makePositionOrder(
        address adapter,
        Request memory request
    ) public view returns (IExchange.PositionOrder memory) {
        IExchange.PositionOrder memory positionOrder
            = IAdapter(adapter).makePositionOrder(
                request.collateral,
                request.index,
                request.collateralAmount,
                request.size,
                request.isLong
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
            request.size,
            request.isLong
        );
        IAdapter.Position memory currentPosition = IAdapter(adapter).getPosition(
            account,
            positionOrder.path[positionOrder.path.length - 1],
            positionOrder.index,
            positionOrder.isLong
        );

        fee = IAdapter(adapter).getPositionFee(request.index, positionOrder.size);
        if (currentPosition.size > 0) {
            fee += IAdapter(adapter).getFundingFee(
                positionOrder.path[positionOrder.path.length - 1],
                request.index,
                currentPosition.size,
                currentPosition.fundingRate,
                request.isLong
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

    function getPrice(
        address adapter,
        address token,
        bool isLong
    ) public view returns (uint256 price) {
        price = IAdapter(adapter).getPrice(token, isLong);

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
        answer.collateralPrice = getPrice(adapter, request.collateral, request.isLong);
        answer.indexPrice = getPrice(adapter, request.index, request.isLong);
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
        Request memory request
    ) override public view returns (Answer[] memory answers) {
        uint256[] memory fees = new uint256[](adapters.length);
        for (uint256 i = 0; i < adapters.length; i++) {
            fees[i] = getFee(account, adapters[i], request);
        }

        // sort by fee
        if (adapters.length > 1) {
            for (uint256 i = 0; i < adapters.length; i++) {
                for (uint256 j = i + 1; j < adapters.length; j++) {
                    if (fees[i] > fees[j]) {
                        address temp0 = adapters[i];
                        adapters[i] = adapters[j];
                        adapters[j] = temp0;
                    }
                }
            }
        }

        // todo: split answers following available liquditiy.
        answers = new Answer[](1);
        answers[0] = _get(account, adapters[0], request);
    }

    // test
    function quote2(
        address account,
        address[] memory adapters,
        Request[] memory requests
    ) public view returns (Answer[] memory answers) {
        require(
            adapters.length > 0 && adapters.length == requests.length,
            "Quoter: INVALID_LENGTH"
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
