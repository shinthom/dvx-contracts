const { ethers } = require("hardhat");

const PositionRouter = "0xb87a436b93ffe9d75c5cfa7bacfff96430b09868";
const Router = "0xabbc5f99639c9b6bcb58544ddf04efa6802f4064";
const Vault = "0x489ee077994b6658eafa855c308275ead8097c4a";
const Timelock = "0xe7E740Fa40CA16b15B621B49de8E9F0D69CF4858";

const OrderBook = "0xa19fD5aB6C8DCffa2A295F78a5Bb4aC543AAF5e3";
const LiquidityPool = "0x3e0199792ce69dc29a0a36146bfa68bd7c8d6633";

async function main() {
  let gasUsed = 0n;

  const waitAndLogAccumulatedGasUsed = async (tx) => {
    const receipt = await tx.wait();
    gasUsed += receipt.gasUsed;
    console.log("gasUsed:", gasUsed);
  };

  const MuxAdapter = await ethers.getContractFactory("MuxAdapter");
  const muxAdapter = await MuxAdapter.deploy(
    OrderBook,
    LiquidityPool,
    "0x5ef78e87319653BE9D325673CcC04B4a378E13F4"
  );
  await waitAndLogAccumulatedGasUsed(muxAdapter.deploymentTransaction());
  console.log("MuxAdapter deployed at:", muxAdapter.target, "\n");

  const exchange = await ethers.getContractAt(
    "Exchange",
    "0x5ef78e87319653BE9D325673CcC04B4a378E13F4"
  );

  await waitAndLogAccumulatedGasUsed(
    await exchange.registerAdapter(muxAdapter.target)
  );
  console.log("Exchange: registerAdapter\n");

  // await waitAndLogAccumulatedGasUsed(
  //   await exchange.unregisterAdapter(
  //     "0xa8d20C39F03Afa75fAba98d4d19f16988d250851"
  //   )
  // );
  // console.log("Exchange: unregisterAdapter\n");

  // await waitAndLogAccumulatedGasUsed(
  //   await exchange.unregisterAdapter(
  //     "0x026aE93186d08C23b7351C27db672C775419D023"
  //   )
  // );
  // console.log("Exchange: unregisterAdapter\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
