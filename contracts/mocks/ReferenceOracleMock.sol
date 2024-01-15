// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

contract ReferenceOracleMock {
    int256 private _answer;

    constructor(int256 answer_) {
        _answer = answer_;
    }

    function decimals() external pure returns (uint8) {
        return 8;
    }

    function latestAnswer() public view returns (int256) {
        return _answer;
    }
}
