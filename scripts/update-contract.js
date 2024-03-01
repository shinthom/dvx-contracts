const { ethers } = require("hardhat");

const PositionRouter = "0xb87a436b93ffe9d75c5cfa7bacfff96430b09868";
const Router = "0xabbc5f99639c9b6bcb58544ddf04efa6802f4064";
const Vault = "0x489ee077994b6658eafa855c308275ead8097c4a";
const Timelock = "0xe7E740Fa40CA16b15B621B49de8E9F0D69CF4858";

const OrderBook = "0xa19fD5aB6C8DCffa2A295F78a5Bb4aC543AAF5e3";
const LiquidityPool = "0x3e0199792ce69dc29a0a36146bfa68bd7c8d6633";

const DAI = "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1";
const UNI = "0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0";
const LINK = "0xf97f4df75117a78c1a5a0dbb814af92458539fb4";
const ARB = "0x912ce59144191c1204e64559fe8253a0e49e6548";

async function main() {
  let gasUsed = 0n;

  const waitAndLogAccumulatedGasUsed = async (tx) => {
    const receipt = await tx.wait();
    gasUsed += receipt.gasUsed;
    console.log("gasUsed:", gasUsed);
  };

  // 🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨 fix me! 🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨
  const exchangeAddr = "";
  const gmxV1AdapterBeforeAddr = "";
  const muxAdapterBeforeAddr = "";

  // deploy Quoter contract
  const Quoter = await ethers.getContractFactory("Quoter");
  const quoter = await Quoter.deploy();
  await waitAndLogAccumulatedGasUsed(quoter.deploymentTransaction());
  console.log("Quoter deployed at:", quoter.target, "\n");

  // deploy GmxV1Adapter contract
  const GmxV1Adapter = await ethers.getContractFactory("GmxV1Adapter");
  const gmxV1Adapter = await GmxV1Adapter.deploy(
    PositionRouter,
    Router,
    Vault,
    Timelock,
    exchangeAddr
  );
  await waitAndLogAccumulatedGasUsed(gmxV1Adapter.deploymentTransaction());
  console.log("GmxV1Adapter deployed at:", gmxV1Adapter.target, "\n");

  // deploy MuxAdapter contract
  const MuxAdapter = await ethers.getContractFactory("MuxAdapter");
  const muxAdapter = await MuxAdapter.deploy(
    OrderBook,
    LiquidityPool,
    exchangeAddr
  );
  await waitAndLogAccumulatedGasUsed(muxAdapter.deploymentTransaction());
  console.log("MuxAdapter deployed at:", muxAdapter.target, "\n");

  const exchange = await ethers.getContractAt("Exchange", exchangeAddr);

  await waitAndLogAccumulatedGasUsed(
    await exchange.unregisterAdapter(gmxV1AdapterBeforeAddr)
  );
  console.log("unregistered GmxV1Adapter at:", gmxV1AdapterBeforeAddr, "\n");
  await waitAndLogAccumulatedGasUsed(
    await exchange.unregisterAdapter(muxAdapterBeforeAddr)
  );
  console.log("unregistered MuxAdapter at:", muxAdapterBeforeAddr, "\n");
  await waitAndLogAccumulatedGasUsed(
    await exchange.registerAdapter(gmxV1Adapter.target)
  );
  console.log("registered GmxV1Adapter at:", gmxV1Adapter.target, "\n");
  await waitAndLogAccumulatedGasUsed(
    await exchange.registerAdapter(muxAdapter.target)
  );
  console.log("registered MuxAdapter at:", muxAdapter.target, "\n");

  await waitAndLogAccumulatedGasUsed(
    await exchange.addCollateralTokens([DAI, UNI, LINK])
  );
  console.log("added collateral tokens:", [DAI, UNI, LINK], "\n");
  await waitAndLogAccumulatedGasUsed(await exchange.setStableToken(DAI, true));
  console.log("set stable token:", DAI, "\n");
  await waitAndLogAccumulatedGasUsed(
    await exchange.addIndexTokens([UNI, LINK, ARB])
  );
  console.log("added index tokens:", [UNI, LINK, ARB], "\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
