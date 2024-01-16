// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

contract AdapterMock {
    function getMinExecutionFee() external view returns (uint256) {
        return 10;
    }
}
