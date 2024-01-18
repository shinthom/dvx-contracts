const { ethers } = require("hardhat");

const PositionRouter = "0xb87a436b93ffe9d75c5cfa7bacfff96430b09868";
const Router = "0xabbc5f99639c9b6bcb58544ddf04efa6802f4064";
const Vault = "0x489ee077994b6658eafa855c308275ead8097c4a";

const OrderBook = "0xa19fD5aB6C8DCffa2A295F78a5Bb4aC543AAF5e3";
const LiquidityPool = "0x3e0199792ce69dc29a0a36146bfa68bd7c8d6633";

const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const USDT = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
const USDCe = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";

async function main() {
  let gasUsed = 0n;

  const waitAndLogAccumulatedGasUsed = async (tx) => {
    const receipt = await tx.wait();
    gasUsed += receipt.gasUsed;
    console.log("gasUsed:", gasUsed);
  };

  const Warehouse = await ethers.getContractFactory("Warehouse");
  const warehouse = await Warehouse.deploy();
  await waitAndLogAccumulatedGasUsed(warehouse.deploymentTransaction());

  const Exchange = await ethers.getContractFactory("Exchange");
  const exchange = await Exchange.deploy();
  await waitAndLogAccumulatedGasUsed(exchange.deploymentTransaction());

  const GmxV1Adapter = await ethers.getContractFactory("GmxV1Adapter");
  const gmxV1Adapter = await GmxV1Adapter.deploy(
    PositionRouter,
    Router,
    Vault,
    exchange.target
  );
  await waitAndLogAccumulatedGasUsed(gmxV1Adapter.deploymentTransaction());

  const MuxAdapter = await ethers.getContractFactory("MuxAdapter");
  // 11 is usdc
  const muxAdapter = await MuxAdapter.deploy(OrderBook, LiquidityPool, 11);
  await waitAndLogAccumulatedGasUsed(muxAdapter.deploymentTransaction());

  const Quoter = await ethers.getContractFactory("Quoter");
  const quoter = await Quoter.deploy();
  await waitAndLogAccumulatedGasUsed(quoter.deploymentTransaction());

  const Reader = await ethers.getContractFactory("Reader");
  const reader = await Reader.deploy(warehouse.target);
  await waitAndLogAccumulatedGasUsed(reader.deploymentTransaction());

  await waitAndLogAccumulatedGasUsed(
    await warehouse.setExchange(exchange.target)
  );
  await waitAndLogAccumulatedGasUsed(
    await exchange.setWarehouse(warehouse.target)
  );
  await waitAndLogAccumulatedGasUsed(
    await exchange.setWarehouse(warehouse.target)
  );
  await waitAndLogAccumulatedGasUsed(
    await exchange.setRegisteredAdapter(gmxV1Adapter.target, true)
  );
  await waitAndLogAccumulatedGasUsed(
    await exchange.setRegisteredAdapter(muxAdapter.target, true)
  );
  await waitAndLogAccumulatedGasUsed(await exchange.setStableToken(USDC, true));
  await waitAndLogAccumulatedGasUsed(await exchange.setStableToken(USDT, true));
  await waitAndLogAccumulatedGasUsed(
    await exchange.setStableToken(USDCe, true)
  );
  await waitAndLogAccumulatedGasUsed(
    await warehouse.setExchange(exchange.target)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
