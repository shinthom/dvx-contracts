// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "../interfaces/IERC20.sol";

// todo: implement FeeCollector (upgradeable)
contract FeeCollector is Ownable {
    function balanceOf(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function withdraw(
        address token,
        uint256 amount,
        address receiver
    ) external onlyOwner {
        IERC20(token).transfer(receiver, amount);
    }
}
