// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {Proxy} from "@openzeppelin/contracts/proxy/Proxy.sol";
import {StorageSlot} from "@openzeppelin/contracts/utils/StorageSlot.sol";

interface IBeacon {
    function accountImplementation(
        uint256 version
    ) external view returns (address);
}

contract AccountProxy is Proxy {
    bytes32 internal constant BEACON_SLOT =
        bytes32(uint256(keccak256("dvx.beacon")) - 1);
    bytes32 internal constant ACCOUNT_VERSION_SLOT =
        bytes32(uint256(keccak256("dvx.account.version")) - 1);

    constructor(address beacon, uint256 version) {
        require(beacon != address(0), "beacon: zero");
        require(version != 0, "version: zero");

        StorageSlot.getAddressSlot(BEACON_SLOT).value = beacon;
        StorageSlot.getUint256Slot(ACCOUNT_VERSION_SLOT).value = version;
    }

    function _implementation()
        internal
        view
        virtual
        override
        returns (address)
    {
        return IBeacon(_getBeacon()).accountImplementation(_getVersion());
    }

    function _getBeacon() internal view returns (address) {
        return StorageSlot.getAddressSlot(BEACON_SLOT).value;
    }

    function _getVersion() internal view returns (uint256) {
        return StorageSlot.getUint256Slot(ACCOUNT_VERSION_SLOT).value;
    }
}
