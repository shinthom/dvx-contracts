// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IExchange} from "./IExchange.sol";

interface IAdapter {
    struct Position {
        uint256 collateralAmount;
        uint256 size;
        uint256 lastIncreasedTime;
        uint256 price;
        uint256 fundingRate;
        bool isLong;
    }

    function makeMarketOrder(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) external view returns (IExchange.MarketOrder memory);

    function getMinExecutionFee() external view returns (uint256);

    function getDepositFee(
        address account,
        IExchange.MarketOrder memory marketOrder
    ) external view returns (uint256);

    function getFundingFee(
        address collateral,
        address index,
        uint256 size,
        uint256 fundingRate,
        bool isLong
    ) external view returns (uint256);

    function getPositionFee(
        address index,
        uint256 size
    ) external view returns (uint256);

    function getPriceDecimals() external view returns (uint256);

    function getPrice(
        address collateral,
        bool isLong
    ) external view returns (uint256);

    function getWrapPrice(
        address collateral,
        bool isLong
    ) external view returns (uint256);

    function getPosition(
        address account,
        address collateral,
        address index,
        bool isLong
    ) external view returns (Position memory);

    function getWrapPosition(
        address account,
        address collateral,
        address index,
        bool isLong
    ) external view returns (Position memory);

    function getAvailableLiquidity(
        address index,
        bool isLong
    ) external view returns (uint256);
}
