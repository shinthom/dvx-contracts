// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

contract Governable {
    address public gov;

    constructor() {
        gov = msg.sender;
    }

    modifier onlyGov() {
        require(msg.sender == gov, "msg.sender: not gov");
        _;
    }

    function setGov(address _gov) external onlyGov {
        gov = _gov;
    }
}
