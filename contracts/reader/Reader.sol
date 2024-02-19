// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {IAccount} from "../interfaces/IAccount.sol";
import {IAdapter} from "../interfaces/IAdapter.sol";

contract Reader {
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

    function getAccountOwner(address account) external view returns (address) {
        return IAccount(account).owner();
    }

    function getAccountBeacon(address account) external view returns (address) {
        return IAccount(account).beacon();
    }

    function getAccountVersion(
        address account
    ) external view returns (uint256) {
        return IAccount(account).version();
    }

    function getAccountDelegatedAccount(
        address account
    ) external view returns (address) {
        return IAccount(account).delegatedAccount();
    }

    function getAccountDelegatedAccountExpiration(
        address account
    ) external view returns (uint256) {
        return IAccount(account).delegatedAccountExpiration();
    }

    function getAccountBalance(
        address account,
        address token
    ) external view returns (uint256) {
        return IAccount(account).getBalance(token);
    }

    function getAccountLockedBalance(
        address account,
        address token
    ) external view returns (uint256) {
        return IAccount(account).getLockedBalance(token);
    }

    function getAccountWithdrawableBalance(
        address account,
        address token
    ) external view returns (uint256) {
        return IAccount(account).getWithdrawableBalance(token);
    }

    function getAccountFeeDebt(
        address account,
        address token
    ) external view returns (uint256) {
        return IAccount(account).getFeeDebt(token);
    }

    function getTokenAmountInUse(
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
        tokenAmountInUseAsCollaterals = getTokenAmountInUseAsCollateral(
            account,
            adapters,
            collaterals,
            indexs
        );

        for (uint256 i = 0; i < collaterals.length; i++) {
            tokenAmountInUseAsCollaterals[i].totalAmount += IAccount(account)
                .getLockedBalance(collaterals[i]);
        }
    }

    function getTokenAmountInUseAsCollateral(
        address account,
        address[] memory adapters,
        address[] memory collaterals,
        address[] memory indexs
    )
        public
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
            uint256 totalAmount = 0;
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
