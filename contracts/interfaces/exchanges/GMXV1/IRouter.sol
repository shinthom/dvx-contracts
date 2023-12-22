// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IRouter {
    function approvedPlugins(address account, address plugin) external view returns (bool);
    function approvePlugin(address plugin) external;
}