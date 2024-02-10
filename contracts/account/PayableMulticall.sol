// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

abstract contract PayableMulticall {
    function multicall(
        bytes[] calldata data
    ) external payable virtual returns (bytes[] memory results) {
        results = new bytes[](data.length);

        for (uint256 i; i < data.length; i++) {
            (bool success, bytes memory result) = address(this).delegatecall(
                data[i]
            );
            require(success, "call failed");
            results[i] = result;
        }

        return results;
    }
}
