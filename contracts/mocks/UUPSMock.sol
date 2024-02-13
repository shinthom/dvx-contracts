// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract UUPSMock is UUPSUpgradeable {
    // Not having any checks in this function is dangerous! Do not do this outside tests!
    function _authorizeUpgrade(address) internal override {}

    function checkUpgrade() public view returns (uint256) {
        return 1;
    }
}