pragma solidity ^0.8.0;

import "./IExchange.sol";

interface IQuoter {
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
        address adapter;
        uint256 collateralPrice;
        uint256 indexPrice;
        uint256 fee;
        uint256 availableLiquidity;
        IExchange.PositionOrder positionOrder;
    }

    function quote(
        address account,
        address[] memory adapters,
        Order[] memory orders
    ) external view returns (Answer[] memory answers);
}
