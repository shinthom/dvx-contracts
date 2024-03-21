# DVX Contracts

DVX is a perpetual DEX aggregator on Arbitrum. It routes orders from per-user margin accounts to underlying perpetual protocols such as GMX V1 and MUX, providing a unified interface for deposits, swaps, position management, and limit/trigger orders.

## Architecture

```
contracts/
├── Exchange.sol             # Protocol hub (UUPS): configuration, access control,
│                            # fees, and the account creation entry point
├── Warehouse.sol            # Limit/trigger order storage and validation (UUPS)
├── account/
│   ├── Account.sol          # Per-user margin account (delegatecalls into adapters)
│   ├── AccountProxy.sol     # Versioned proxy using Exchange as its beacon
│   ├── AccountFactory.sol   # Account factory (UUPS)
│   └── PayableMulticall.sol # Batched calls with msg.sender preserved
├── adapters/
│   ├── GMXV1Adapter.sol     # GMX V1 integration
│   └── MuxAdapter.sol       # MUX integration
├── swapper/Swapper.sol      # Uniswap V3 swap execution and quoting
├── manager/MarginManager.sol
├── logger/Logger.sol        # Event hub for off-chain indexing
├── reader/                  # Reader and Quoter (view-only aggregation)
├── token/                   # AlphaAccessCard (soulbound ERC1155), NFT
└── event/AttendanceBook.sol # Check-in campaign contract
```

### Key concepts

- **Account** — each user owns a dedicated margin account. The account holds collateral, tracks locked balances and fee debts, and executes position changes by `delegatecall`ing into registered adapters.
- **Delegated signing** — an account owner can authorize a delegated key. Relayers then submit deposits, withdrawals, swaps, and orders on the owner's behalf with a signature from the delegated key.
- **Versioned account upgrades** — `AccountProxy` resolves its implementation through the `Exchange` beacon, so account logic can be upgraded per version without migrating funds.
- **Adapters** — thin integration layers that normalize position management and pricing across underlying perpetual protocols.

## Getting started

This repository uses [Foundry](https://book.getfoundry.sh/). Dependencies are managed as git submodules under `lib/`.

```shell
git clone https://github.com/shinthom/dvx-contracts.git
cd dvx-contracts
git submodule update --init --recursive

forge build
```

## Testing

Unit and integration tests are written in Solidity under `test/` and run against local mocks — no fork required.

```shell
# run the full suite
forge test

# gas report
forge test --gas-report

# coverage
forge coverage
```

| Suite | Coverage |
| --- | --- |
| `Exchange.t.sol` | configuration, access control, fee math, adapter registry, UUPS upgrades |
| `Warehouse.t.sol` | limit/trigger order lifecycle and price validation |
| `Account.t.sol` | deposits/withdrawals (ERC20 + ETH), delegated signature flows, positions, collateral, fee debt, account upgrades, multicall |
| `AccountFactory.t.sol` | account creation and versioning |
| `AttendanceBook.t.sol`, `AlphaAccessCard.t.sol`, `NFT.t.sol` | campaign and token contracts |

The GMX/MUX adapters and the Uniswap V3 swapper embed Arbitrum mainnet addresses, so unit tests replace them with mocks (`test/mocks/`). To exercise the real integrations, run against an Arbitrum fork:

```shell
forge test --fork-url $ARBITRUM_RPC_URL
```

## Deployment

```shell
forge script script/Deploy.s.sol \
  --rpc-url $ARBITRUM_RPC_URL \
  --broadcast \
  --private-key $PRIVATE_KEY
```

The deploy script provisions the full protocol: Exchange, Warehouse, AccountFactory (all behind ERC1967 proxies), the account implementation, Logger, adapters, Swapper, Reader/Quoter, and initial configuration (tokens, keepers, relayers, fee collector).

## License

UNLICENSED
