pragma solidity ^0.8.0;

import "./IExchange.sol";

interface IQuoter {
    struct Request {
        address collateral;
        address index;
        uint256 collateralAmount;
        uint256 size;
        bool isLong;
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
        Request memory request
    ) external view returns (Answer[] memory answers);
}
