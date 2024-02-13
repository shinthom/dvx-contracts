const { ethers } = require("hardhat");

const PositionRouter = "0xb87a436b93ffe9d75c5cfa7bacfff96430b09868";
const Router = "0xabbc5f99639c9b6bcb58544ddf04efa6802f4064";
const Vault = "0x489ee077994b6658eafa855c308275ead8097c4a";
const Timelock = "0xe7E740Fa40CA16b15B621B49de8E9F0D69CF4858";

const OrderBook = "0xa19fD5aB6C8DCffa2A295F78a5Bb4aC543AAF5e3";
const LiquidityPool = "0x3e0199792ce69dc29a0a36146bfa68bd7c8d6633";

const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const USDT = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
const USDCe = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";

const relayer = "0x8411D1E7eED0EB00D2E1F7332122581156062fD2";
const triggerOrderKeeper = "0x38A9078645DA1DF08659837147fa8e0110ad1484";
const limitOrderKeeper = "0x1D9BE7c2F33B0E7B70fC552a0f3599424Cc16eC0";
const feeCollector = "0x0d8a1475bf3DA6b161a70E945f120ea3Fe6e0314";

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
  await waitAndLogAccumulatedGasUsed(
    await warehouse.initialize(exchange.target)
  );
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
    await accountFactory.initialize(exchange.target)
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
    exchange.target
  );
  await waitAndLogAccumulatedGasUsed(gmxV1Adapter.deploymentTransaction());
  console.log("GmxV1Adapter deployed at:", gmxV1Adapter.target, "\n");

  const MuxAdapter = await ethers.getContractFactory("MuxAdapter");
  const muxAdapter = await MuxAdapter.deploy(
    OrderBook,
    LiquidityPool,
    exchange.target
  );
  await waitAndLogAccumulatedGasUsed(muxAdapter.deploymentTransaction());
  console.log("MuxAdapter deployed at:", muxAdapter.target, "\n");

  const Quoter = await ethers.getContractFactory("Quoter");
  const quoter = await Quoter.deploy();
  await waitAndLogAccumulatedGasUsed(quoter.deploymentTransaction());
  console.log("Quoter deployed at:", quoter.target, "\n");

  const Reader = await ethers.getContractFactory("Reader");
  const reader = await Reader.deploy();
  await waitAndLogAccumulatedGasUsed(reader.deploymentTransaction());
  console.log("Reader deployed at:", reader.target, "\n");

  const Swapper = await ethers.getContractFactory("Swapper");
  const swapper = await Swapper.deploy();
  await waitAndLogAccumulatedGasUsed(swapper.deploymentTransaction());
  console.log("Swapper deployed at:", swapper.target, "\n");

  const MarginManager = await ethers.getContractFactory("MarginManager");
  const marginManager = await MarginManager.deploy();
  await waitAndLogAccumulatedGasUsed(marginManager.deploymentTransaction());
  console.log("MarginManager deployed at:", marginManager.target, "\n");

  await waitAndLogAccumulatedGasUsed(
    await exchange.addAccountImplementation(1, accountTarget.target)
  );
  console.log("Exchange: addAccountImplementation\n");

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

  await waitAndLogAccumulatedGasUsed(
    await exchange.setFeeCollector(feeCollector)
  );
  console.log("Exchange: setFeeCollector\n");

  await waitAndLogAccumulatedGasUsed(
    await exchange.setMarginManager(marginManager.target)
  );
  console.log("Exchange: setMarginManager\n");

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
    await exchange.addCollateralTokens([WBTC, WETH, USDCe, USDC, USDT])
  );
  console.log("Exchange: addCollateralTokens\n");

  await waitAndLogAccumulatedGasUsed(
    await exchange.addIndexTokens([WBTC, WETH])
  );
  console.log("Exchange: addIndexTokens\n");

  await waitAndLogAccumulatedGasUsed(
    await exchange.setOrderKeeper(triggerOrderKeeper, true)
  );
  console.log("Exchange: setOrderKeeper (triggerOrderKeeper)\n");

  await waitAndLogAccumulatedGasUsed(
    await exchange.setOrderKeeper(limitOrderKeeper, true)
  );
  console.log("Exchange: setOrderKeeper (limitOrderKeeper)\n");

  await waitAndLogAccumulatedGasUsed(await exchange.setRelayer(relayer, true));
  console.log("Exchange: setRelayer\n");

  // deploy AttendanceBook contract

  // const AttendanceBook = await ethers.getContractFactory("AttendanceBook");
  // const attendanceBook = await AttendanceBook.deploy(
  //   1707868800, // todo: fix
  //   marginManager.target // todo: fix
  // );
  // await waitAndLogAccumulatedGasUsed(attendanceBook.deploymentTransaction());
  // console.log("MarginManager deployed at:", attendanceBook.target, "\n");

  // await waitAndLogAccumulatedGasUsed(
  //   await exchange.setRelayer(attendanceBook.target, true)
  // );
  // console.log("Exchange: setRelayer (AttendanceBook)\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
