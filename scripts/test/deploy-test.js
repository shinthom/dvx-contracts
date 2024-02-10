const { ethers } = require("hardhat");

const PositionRouter = "0xb87a436b93ffe9d75c5cfa7bacfff96430b09868";
const Router = "0xabbc5f99639c9b6bcb58544ddf04efa6802f4064";
const Vault = "0x489ee077994b6658eafa855c308275ead8097c4a";
const Timelock = "0xe7E740Fa40CA16b15B621B49de8E9F0D69CF4858";

const OrderBook = "0xa19fD5aB6C8DCffa2A295F78a5Bb4aC543AAF5e3";
const LiquidityPool = "0x3e0199792ce69dc29a0a36146bfa68bd7c8d6633";

const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
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

  await waitAndLogAccumulatedGasUsed(
    await exchange.setAccountFactory(accountFactory.target)
  );
  console.log("Exchange: setAccountFactory\n");

  await waitAndLogAccumulatedGasUsed(
    await exchange.registerAdapter(gmxV1Adapter.target)
  );
  console.log("Exchange: registerAdapter\n");

  await waitAndLogAccumulatedGasUsed(
    await exchange.registerAdapter(muxAdapter.target)
  );
  console.log("Exchange: registerAdapter\n");

  // increasePosition

  const weth = await ethers.getContractAt("IERC20", WETH);
  const expiration = Math.floor(Date.now() / 1000) + 60 * 20;
  await waitAndLogAccumulatedGasUsed(
    await exchange.createAccount("0x" + "11".repeat(20), expiration)
  );
  console.log("Exchange: createAccount\n");

  const accountAddr = await exchange.getAccount(
    (
      await ethers.provider.getSigner()
    ).address
  );
  const account = await ethers.getContractAt("Account", accountAddr);

  var depositAmount = 5000000000000000n; // 0.005 ETH
  await waitAndLogAccumulatedGasUsed(
    await weth.deposit({ value: depositAmount })
  );
  console.log("WETH deposited\n");

  await waitAndLogAccumulatedGasUsed(
    await weth.approve(account.target, ethers.MaxUint256)
  );
  console.log("WETH approved\n");

  await waitAndLogAccumulatedGasUsed(
    await account.deposit(WETH, depositAmount, 0, 0, "0x")
  );
  console.log("WETH deposited to account\n");

  const size = ethers.parseEther("0.1");
  const adapterFee = await gmxV1Adapter.getMinExecutionFee();
  await waitAndLogAccumulatedGasUsed(
    await account.increasePosition(
      gmxV1Adapter.target,
      WETH,
      WETH,
      depositAmount,
      size,
      true,
      0,
      0,
      0,
      "0x",
      { value: adapterFee }
    )
  );
  console.log("Position increased (GMX V1)\n");

  var depositAmount = 5000000000000000n; // 0.005 ETH
  await waitAndLogAccumulatedGasUsed(
    await weth.deposit({ value: depositAmount })
  );
  console.log("WETH deposited\n");

  await waitAndLogAccumulatedGasUsed(
    await account.deposit(WETH, depositAmount, 0, 0, "0x")
  );
  console.log("WETH deposited to account\n");

  await waitAndLogAccumulatedGasUsed(
    await account.increasePosition(
      muxAdapter.target,
      WETH,
      WETH,
      depositAmount,
      size,
      true,
      0,
      0,
      0,
      "0x"
    )
  );
  console.log("Position increased (MUX)\n");

  // decreasePosition
  await waitAndLogAccumulatedGasUsed(
    await account.decreasePosition(
      gmxV1Adapter.target,
      WETH,
      WETH,
      true,
      size,
      0,
      0,
      0,
      "0x",
      { value: adapterFee }
    )
  );
  console.log("Position decreased (GMX V1)\n");

  // decreasePosition
  await waitAndLogAccumulatedGasUsed(
    await account.decreasePosition(
      muxAdapter.target,
      WETH,
      WETH,
      true,
      size,
      0,
      0,
      0,
      "0x"
    )
  );
  console.log("Position decreased (MUX)\n");

  console.log(await account.getBalance(WETH));

  // // withdraw
  // await waitAndLogAccumulatedGasUsed(
  //   await account.withdraw(WETH, depositAmount, 0, 0, "0x")
  // );
  // console.log("WETH withdrawn\n");
  // console.log(await account.getBalance(WETH));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
