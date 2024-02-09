// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IAdapter} from "../interfaces/IAdapter.sol";

contract Reader {
    address private immutable _warehouse;

    constructor(address warehouse) {
        _warehouse = warehouse;
    }

    struct Position {
        address adapter;
        address collateral;
        address index;
        IAdapter.Position position;
    }

    struct TokenAmountInUseAsCollateral {
        address token;
        uint256 totalAmount;
    }

    function getTokenAmountInUseAsCollateral(
        address account,
        address[] memory adapters,
        address[] memory collaterals,
        address[] memory indexs
    )
        external
        view
        returns (
            TokenAmountInUseAsCollateral[] memory tokenAmountInUseAsCollaterals
        )
    {
        Position[] memory positions = getPositions(
            account,
            adapters,
            collaterals,
            indexs
        );

        tokenAmountInUseAsCollaterals = new TokenAmountInUseAsCollateral[](
            collaterals.length
        );
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

        Position[] memory positions = new Position[](
            adapters.length *
                collaterals.length *
                indexs.length *
                isLongs.length
        );

        for (uint256 i = 0; i < adapters.length; i++) {
            for (uint256 j = 0; j < collaterals.length; j++) {
                for (uint256 k = 0; k < indexs.length; k++) {
                    for (uint256 l = 0; l < isLongs.length; l++) {
                        positions[
                            i *
                                collaterals.length *
                                indexs.length *
                                isLongs.length +
                                j *
                                indexs.length *
                                isLongs.length +
                                k *
                                isLongs.length +
                                l
                        ] = Position({
                            adapter: adapters[i],
                            collateral: collaterals[j],
                            index: indexs[k],
                            position: IAdapter(adapters[i]).getWrapPosition(
                                account,
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
}
