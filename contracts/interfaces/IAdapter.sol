pragma solidity 0.8.0;

interface IAdapter {
    function increasePosition() external;
    function decreasePosition() external;
    function increaseCollateral() external;
    function decreaseCollateral() external;
    function getPosition() external;
    function getFee() external;
}