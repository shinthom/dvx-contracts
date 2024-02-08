const { ethers } = require("hardhat");

const PositionRouter = "0xb87a436b93ffe9d75c5cfa7bacfff96430b09868";
const Router = "0xabbc5f99639c9b6bcb58544ddf04efa6802f4064";
const Vault = "0x489ee077994b6658eafa855c308275ead8097c4a";
const Timelock = "0xe7E740Fa40CA16b15B621B49de8E9F0D69CF4858";

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

  // deploy Exchange contract
  const ExchangeImpl = await ethers.getContractFactory("Exchange");
  const exchangeImpl = await ExchangeImpl.deploy();
  await waitAndLogAccumulatedGasUsed(exchangeImpl.deploymentTransaction());
  console.log("ExchangeImpl deployed at:", exchangeImpl.target, "\n");
  const ExchangeProxy = await ethers.getContractFactory("ERC1967Proxy");
  const exchangeProxy = await ExchangeProxy.deploy(exchangeImpl.target, "0x");
  await waitAndLogAccumulatedGasUsed(exchangeProxy.deploymentTransaction());
  console.log("ExchangeProxy deployed at:", exchangeProxy.target, "\n");
  const exchange = await ethers.getContractAt("Exchange", exchangeProxy.target);
  await waitAndLogAccumulatedGasUsed(await exchange.initialize());
  console.log("Exchange: initialize\n");

  const WarehouseImpl = await ethers.getContractFactory("Warehouse");
  const warehouseImpl = await WarehouseImpl.deploy();
  await waitAndLogAccumulatedGasUsed(warehouseImpl.deploymentTransaction());
  console.log("WarehouseImpl deployed at:", warehouseImpl.target, "\n");
  const WarehouseProxy = await ethers.getContractFactory("ERC1967Proxy");
  const warehouseProxy = await WarehouseProxy.deploy(
    warehouseImpl.target,
    "0x"
  );
  await waitAndLogAccumulatedGasUsed(warehouseProxy.deploymentTransaction());
  console.log("WarehouseProxy deployed at:", warehouseProxy.target, "\n");
  const warehouse = await ethers.getContractAt(
    "Warehouse",
    warehouseProxy.target
  );
  await waitAndLogAccumulatedGasUsed(await warehouse.initialize());
  console.log("Warehouse: initialize\n");

  const AccountTarget = await ethers.getContractFactory("Account");
  const accountTarget = await AccountTarget.deploy();
  await waitAndLogAccumulatedGasUsed(accountTarget.deploymentTransaction());
  console.log("AccountTarget deployed at:", accountTarget.target, "\n");

  const AccountFactoryImpl = await ethers.getContractFactory("AccountFactory");
  const accountFactoryImpl = await AccountFactoryImpl.deploy();
  await waitAndLogAccumulatedGasUsed(
    accountFactoryImpl.deploymentTransaction()
  );
  console.log(
    "AccountFactoryImpl deployed at:",
    accountFactoryImpl.target,
    "\n"
  );
  const AccountFactoryProxy = await ethers.getContractFactory("ERC1967Proxy");
  const accountFactoryProxy = await AccountFactoryProxy.deploy(
    accountFactoryImpl.target,
    "0x"
  );
  await waitAndLogAccumulatedGasUsed(
    accountFactoryProxy.deploymentTransaction()
  );
  console.log(
    "AccountFactoryProxy deployed at:",
    accountFactoryProxy.target,
    "\n"
  );
  const accountFactory = await ethers.getContractAt(
    "AccountFactory",
    accountFactoryProxy.target
  );
  await waitAndLogAccumulatedGasUsed(
    await accountFactory.initialize(accountTarget.target, exchange.target)
  );
  console.log("AccountFactory: initialize\n");

  const Logger = await ethers.getContractFactory("Logger");
  const logger = await Logger.deploy();
  await waitAndLogAccumulatedGasUsed(logger.deploymentTransaction());
  console.log("Logger deployed at:", logger.target, "\n");

  const GmxV1Adapter = await ethers.getContractFactory("GmxV1Adapter");
  const gmxV1Adapter = await GmxV1Adapter.deploy(
    PositionRouter,
    Router,
    Vault,
    Timelock,
    exchange.target,
    logger.target
  );
  await waitAndLogAccumulatedGasUsed(gmxV1Adapter.deploymentTransaction());
  console.log("GmxV1Adapter deployed at:", gmxV1Adapter.target, "\n");

  const MuxAdapter = await ethers.getContractFactory("MuxAdapter");
  const muxAdapter = await MuxAdapter.deploy(
    OrderBook,
    LiquidityPool,
    exchange.target,
    logger.target
  );
  await waitAndLogAccumulatedGasUsed(muxAdapter.deploymentTransaction());
  console.log("MuxAdapter deployed at:", muxAdapter.target, "\n");

  const Quoter = await ethers.getContractFactory("Quoter");
  const quoter = await Quoter.deploy();
  await waitAndLogAccumulatedGasUsed(quoter.deploymentTransaction());
  console.log("Quoter deployed at:", quoter.target, "\n");

  const Reader = await ethers.getContractFactory("Reader");
  const reader = await Reader.deploy(warehouse.target);
  await waitAndLogAccumulatedGasUsed(reader.deploymentTransaction());
  console.log("Reader deployed at:", reader.target, "\n");

  const Swapper = await ethers.getContractFactory("Swapper");
  const swapper = await Swapper.deploy();
  await waitAndLogAccumulatedGasUsed(swapper.deploymentTransaction());
  console.log("Swapper deployed at:", swapper.target, "\n");

  const FeeCollector = await ethers.getContractFactory("FeeCollector");
  const feeCollector = await FeeCollector.deploy();
  await waitAndLogAccumulatedGasUsed(feeCollector.deploymentTransaction());
  console.log("FeeCollector deployed at:", feeCollector.target, "\n");

  await waitAndLogAccumulatedGasUsed(
    await exchange.setAccountFactory(accountFactory.target)
  );
  console.log("Exchange: setAccountFactory\n");

  await waitAndLogAccumulatedGasUsed(
    await exchange.setWarehouse(warehouse.target)
  );
  console.log("Exchange: setWarehouse\n");

  await waitAndLogAccumulatedGasUsed(await exchange.setLogger(logger.target));
  console.log("Exchange: setLogger\n");

  await waitAndLogAccumulatedGasUsed(await exchange.setSwapper(swapper.target));
  console.log("Exchange: setSwapper\n");

  await waitAndLogAccumulatedGasUsed(await exchange.setFeeCollector(feeCollector.target));
  console.log("Exchange: setFeeCollector\n");

  await waitAndLogAccumulatedGasUsed(
    await exchange.registerAdapter(gmxV1Adapter.target)
  );
  console.log("Exchange: registerAdapter\n");

  await waitAndLogAccumulatedGasUsed(
    await exchange.registerAdapter(muxAdapter.target)
  );
  console.log("Exchange: registerAdapter\n");

  await waitAndLogAccumulatedGasUsed(await exchange.setStableToken(USDC, true));
  console.log("Exchange: setStableToken\n");

  await waitAndLogAccumulatedGasUsed(await exchange.setStableToken(USDT, true));
  console.log("Exchange: setStableToken\n");

  await waitAndLogAccumulatedGasUsed(
    await exchange.setStableToken(USDCe, true)
  );
  console.log("Exchange: setStableToken\n");

  await waitAndLogAccumulatedGasUsed(
    await exchange.setDefaultStableToken(USDCe)
  );
  console.log("Exchange: setDefaultStableToken\n");

  await waitAndLogAccumulatedGasUsed(
    await warehouse.setExchange(exchange.target)
  );
  console.log("Warehouse: setExchange\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
