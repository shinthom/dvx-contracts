// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IExchange} from "./IExchange.sol";

// prettier-ignore

interface IAdapter {
    struct Position {
        uint256 collateralAmount;
        uint256 size;
        uint256 lastIncreasedTime;
        uint256 price;
        uint256 fundingRate;
        bool isLong;
    }

    function increasePosition(
        uint256 marketOrderId,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        uint256 acceptablePrice,
        bool isLong
    ) external payable;
    function decreasePosition(
        address collateral,
        address index,
        uint256 size,
        bool isLong,
        uint256 acceptablePrice
    ) external payable;
    function increaseCollateral(
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong
    ) external payable;
    function decreaseCollateral(
        address collateral,
        address index,
        uint256 collateralAmount,
        bool isLong
    ) external payable;

    function addAcmmMargin(
        address collateral,
        address index,
        bool isLong,
        uint256 collateralAmount
    ) external payable;
    function subAcmmMargin(
        address collateral,
        address index,
        bool isLong,
        uint256 profitAmount
    ) external payable;

    function makeMarketOrder(
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) external view returns (IExchange.MarketOrder memory);

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

    function getProfitToken(
        address collateral,
        address index,
        bool isLong
    ) external view returns (address);
    function getPositionPnlUsd(
        address account,
        address collateral,
        address index,
        bool isLong
    ) external view returns (bool, uint256);
    function getWrapPositionPnlUsd(
        address account,
        address collateral,
        address index,
        bool isLong
    ) external view returns (bool, uint256);
    function getPositionNetValueUsd(
        address account,
        address collateral,
        address index,
        bool isLong
    ) external view returns (address, uint256, address, uint256);
    function getPositionWrapNetValueUsd(
        address account,
        address collateral,
        address index,
        bool isLong
    ) external view returns (address, uint256, address, uint256);
    function getPositionNetValueToken(
        address account,
        address collateral,
        address index,
        bool isLong
    ) external view returns (address, uint256, address, uint256);

    function getMinExecutionFee() external view returns (uint256);
    function getPositionFee(
        address index,
        uint256 size
    ) external view returns (uint256);
    function getDepositFee(
        address account,
        IExchange.MarketOrder memory marketOrder
    ) external view returns (uint256);
    function getFundingFee(
        address account,
        address collateral,
        address index,
        bool isLong
    ) external view returns (uint256);
    function getCloseFee(
        address account,
        address collateral,
        address index,
        bool isLong
    ) external view returns (uint256, uint256);

    function getPriceDecimals() external view returns (uint256);
    function getPrice(
        address collateral,
        bool isLong
    ) external view returns (uint256);
    function getWrapPrice(
        address collateral,
        bool isLong
    ) external view returns (uint256);
    function getLiquidationPrice(
        address account,
        address collateral,
        address index,
        bool isLong
    ) external view returns (int256);
    function estimateLiquidationPrice(
        address account,
        address collateral,
        address index,
        uint256 collateralAmount,
        uint256 size,
        bool isLong
    ) external view returns (int256 p);

    function getAvailableLiquidity(
        address index,
        bool isLong
    ) external view returns (uint256);
}
