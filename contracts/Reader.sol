// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IExchange } from  "./interfaces/IExchange.sol";
import { IWarehouse } from  "./interfaces/IWarehouse.sol";
import { IAdapter } from  "./interfaces/IAdapter.sol";
import { IWarehouse } from "./interfaces/IWarehouse.sol";

contract Reader {
    address immutable public warehouse;

    constructor(address _warehouse) {
        warehouse = _warehouse;
    }

    struct Position {
        address adapter;
        address collateral;
        address index;
        IAdapter.Position position;
        IWarehouse.TriggerOrder[] pendingTriggerOrders;
    }

    struct TokenAmountInUseAsCollateral {
        address token;
        uint256 totalAmount;
    }

    function getTokenAmountInUseAsCollateral (
        address account,
        address[] memory adapters,
        address[] memory collaterals,
        address[] memory indexs
    ) external view returns (TokenAmountInUseAsCollateral[] memory tokenAmountInUseAsCollaterals) {
        Position[] memory positions = getPositions(account, adapters, collaterals, indexs);

        tokenAmountInUseAsCollaterals = new TokenAmountInUseAsCollateral[](collaterals.length);
        for (uint256 i = 0; i < collaterals.length; i++) {
            uint256 totalAmount;
            for (uint256 j = 0; j < positions.length; j++) {
                if (positions[j].collateral == collaterals[i]) {
                    totalAmount += positions[j].position.collateralAmount;
                }
            }
            tokenAmountInUseAsCollaterals[i] = TokenAmountInUseAsCollateral({
                token: collaterals[i],
                totalAmount: totalAmount
            });
        }
    }

    function getPositions(
        address account,
        address[] memory adapters,
        address[] memory collaterals,
        address[] memory indexs
    ) public view returns (Position[] memory) {
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
                                    adapters[i]).getWrapPosition(account, collaterals[j], indexs[k], isLongs[l]
                                ),
                                pendingTriggerOrders: getPendingTriggerOrders(
                                    account,
                                    adapters[i],
                                    collaterals[j],
                                    indexs[k],
                                    isLongs[l]
                                )
                            });
                    }
                }
            }
        }
        return positions;
    }

    function getTriggerOrders(
        address account,
        address adapter,
        address collateral,
        address index,
        bool isLong
    ) public view returns (IWarehouse.TriggerOrder[] memory) {
        bytes32 positionKey
            = IWarehouse(warehouse).getPositionKey(account, adapter, collateral, index, isLong);

        return IWarehouse(warehouse).getTriggerOrders(positionKey);
    }

    function getPendingTriggerOrders(
        address account,
        address adapter,
        address collateral,
        address index,
        bool isLong
    ) public view returns (IWarehouse.TriggerOrder[] memory) {
        IWarehouse.TriggerOrder[] memory triggerOrders
            = getTriggerOrders(account, adapter, collateral, index, isLong);

        uint256 numPendingTriggerOrder;
        for (uint256 i = 0; i < triggerOrders.length; i++) {
            if (triggerOrders[i].state == IWarehouse.TriggerOrderState.Pending) {
                numPendingTriggerOrder++;
            }
        }

        IWarehouse.TriggerOrder[] memory pendingTriggerOrders = new IWarehouse.TriggerOrder[](numPendingTriggerOrder);
        uint256 idx;
        for (uint256 i = 0; i < triggerOrders.length; i++) {
            if (triggerOrders[i].state == IWarehouse.TriggerOrderState.Pending) {
                pendingTriggerOrders[idx] = triggerOrders[i];
                idx++;
            }
        }

        return pendingTriggerOrders;
    }

    // function getLimitOrders(
    //     address account
    // ) public view returns (IExchange.LimitOrder[] memory) {
    //     uint256 limitOrderIndex = IWarehouse(warehouse).getLimitOrderIndex(account);

    //     IExchange.LimitOrder[] memory limitOrders = new IExchange.LimitOrder[](limitOrderIndex);
    //     for (uint256 i = 0; i < limitOrderIndex; i++) {
    //         limitOrders[i] = IWarehouse(warehouse).getLimitOrder(account, i);
    //     }

    //     return limitOrders;
    // }

    // function getPendingLimitOrders(
    //     address account
    // ) external view returns (IExchange.LimitOrder[] memory) {
    //     IExchange.LimitOrder[] memory limitOrders = getLimitOrders(account);

    //     uint256 numPendingLimitOrder;
    //     for (uint256 i = 0; i < limitOrders.length; i++) {
    //         if (limitOrders[i].size > 0) {
    //             numPendingLimitOrder++;
    //         }
    //     }

    //     IExchange.LimitOrder[] memory pendingLimitOrders = new IExchange.LimitOrder[](numPendingLimitOrder);
    //     uint256 idx;
    //     for (uint256 i = 0; i < limitOrders.length; i++) {
    //         if (limitOrders[i].size > 0) {
    //             pendingLimitOrders[idx] = limitOrders[i];
    //             idx++;
    //         }
    //     }

    //     return pendingLimitOrders;
    // }
}
