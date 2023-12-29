// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interfaces/IAccount.sol";
import "./interfaces/IAdapter.sol";
import "./interfaces/IWarehouse.sol";
import "hardhat/console.sol";

contract Reader {
    struct Position {
        address adapter;
        address collateral;
        address index;
        IAdapter.Position position;
    }

    function getLimitOrders(address warehouse) external view returns (IExchange.LimitOrder[] memory) {
        return IWarehouse(warehouse).getLimitOrders(msg.sender);
    }

    function getTriggerOrders(address warehouse) external view returns (IExchange.TriggerOrder[] memory) {
        return IWarehouse(warehouse).getTriggerOrders(msg.sender);
    }

    function getPositions(
        address account,
        address[] memory adapters,
        address[] memory collaterals,
        address[] memory indexs
    ) external view returns (Position[] memory) {
        bool[] memory isLongs = new bool[](2);
        isLongs[0] = true;
        isLongs[1] = false;

        Position[] memory positions
            = new Position[](adapters.length * collaterals.length * indexs.length * isLongs.length);

        for (uint256 i = 0; i < adapters.length; i++) {
            for (uint256 j = 0; j < collaterals.length; j++) {
                for (uint256 k = 0; k < indexs.length; k++) {
                    for (uint256 l = 0; l < isLongs.length; l++) {
                        positions[i * collaterals.length * indexs.length * isLongs.length
                            + j * indexs.length * isLongs.length
                            + k * isLongs.length
                            + l]
                            = Position({
                                adapter: adapters[i],
                                collateral: collaterals[j],
                                index: indexs[k],
                                position: IAdapter(
                                    adapters[i]).getPosition(account, collaterals[j], indexs[k], isLongs[l]
                                )
                            });
                    }
                }
            }
        }
        return positions;
    }
}