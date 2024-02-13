// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import {ILogger} from "../interfaces/ILogger.sol";
import {IExchange} from "../interfaces/IExchange.sol";
import {Storage, Account} from "./Account.sol";

contract StorageV2 is Storage {}

contract AccountV2 is StorageV2, Account {
    function addAcmmMargin(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        address[] calldata tokens,
        uint256[] calldata amounts
    ) external payable virtual onlyOrderKeeper {
        require(tokens.length == amounts.length, "length: not match");

        uint256 marginAmount;
        for (uint256 i = 0; i < tokens.length; i++) {
            require(
                amounts[i] <= getWithdrawableBalance(tokens[i]),
                "marginAmount: greater than balance"
            );

            if (collateral != tokens[i]) {
                uint256 amountOut = _swap(
                    tokens[i],
                    collateral,
                    amounts[i],
                    0
                );
                marginAmount += amountOut;
            } else {
                marginAmount += amounts[i];
            }
        }

        require(
            IExchange(_exchange).validateAddAcmmMargin(
                adapter,
                collateral,
                index,
                isLong,
                marginAmount
            ),
            "validation failed"
        );

        uint256 addAcmmMarginFee
            = IExchange(_exchange).getAddAcmmMarginFee(marginAmount); // prettier-ignore
        if (addAcmmMarginFee > 0) {
            require(
                marginAmount >= addAcmmMarginFee,
                "marginAmount: less than margin management fee"
            );
            _collectProtocolFee(collateral, addAcmmMarginFee);
            marginAmount -= addAcmmMarginFee;
        }

        _addAcmmMargin(
            adapter,
            collateral,
            index,
            isLong,
            marginAmount,
            addAcmmMarginFee
        );
    }

    function _addAcmmMargin(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 marginAmount,
        uint256 addAcmmMarginFee
    ) private {
        require(
            IExchange(_exchange).isRegisteredAdapter(adapter),
            "adapter: not registered"
        );

        // slither-disable-next-line controlled-delegatecall,low-level-calls
        (bool success, bytes memory data) = adapter.delegatecall(
            abi.encodeWithSignature(
                "addAcmmMargin(address,address,bool,uint256)",
                collateral,
                index,
                isLong,
                marginAmount
            )
        );
        require(success, string(data));

        address logger = IExchange(_exchange).logger();
        if (logger != address(0)) {
            ILogger(logger).logAddAcmmMargin(
                address(this),
                adapter,
                collateral,
                index,
                marginAmount,
                isLong,
                addAcmmMarginFee
            );
        }
    }

    function subAcmmMargin(
        address adapter,
        address collateral,
        address index,
        bool isLong,
        uint256 marginAmount
    ) external payable virtual onlyOrderKeeper {
        require(
            IExchange(_exchange).validateSubAcmmMargin(
                adapter,
                collateral,
                index,
                isLong,
                marginAmount
            ),
            "validation failed"
        );

        // slither-disable-next-line controlled-delegatecall,low-level-calls
        (bool success, bytes memory data) = adapter.delegatecall(
            abi.encodeWithSignature(
                "subAcmmMargin(address,address,bool,uint256)",
                collateral,
                index,
                isLong,
                marginAmount
            )
        );
        require(success, string(data));

        address marginToken = IExchange(_exchange).getProfitToken(
            adapter,
            collateral,
            index,
            isLong
        );

        uint256 subAcmmMarginFee
            = IExchange(_exchange).getSubAcmmMarginFee(marginAmount); // prettier-ignore
        if (subAcmmMarginFee > 0) {
            _feeDebts[marginToken] += subAcmmMarginFee;
        }

        address logger = IExchange(_exchange).logger();
        if (logger != address(0)) {
            ILogger(logger).logSubAcmmMargin(
                address(this),
                adapter,
                collateral,
                index,
                marginAmount,
                isLong,
                subAcmmMarginFee
            );
        }
    }
}
