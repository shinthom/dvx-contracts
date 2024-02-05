// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

contract MultiCall {
    function multiCall(address[] calldata targets, bytes[] calldata data)
        external
        returns (bytes[] memory results)
    {
        results = new bytes[](targets.length);
        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, bytes memory result) = targets[i].call(data[i]);
            require(success, "ExecutionRouter: call failed");
            results[i] = result;
        }
    }
}
