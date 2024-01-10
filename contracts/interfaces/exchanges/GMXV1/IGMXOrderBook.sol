// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IGMXOrderBook {
    function minExecutionFee() external view returns (uint256);
}
