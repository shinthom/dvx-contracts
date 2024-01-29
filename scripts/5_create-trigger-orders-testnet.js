const { ethers } = require("hardhat");
const { deploy } = require("../test/fixture");

async function main() {
  const noAccount = false;
  const {
    owner,
    account,
    gmxV1Adapter,
    muxAdapter,
    exchange,
    warehouse,
    reader,
    quoter,
    accountFactory,
    logger,
    ETH,
    WETH,
    WBTC,
    USDC,
    USDCe,
    deposit,
    increasePosition,
    createTriggerOrder,
    executeTriggerOrder,
    setDummyPrice,
  } = await deploy(noAccount);
  console.log(`
- owner         : ${owner.address}
- gmxV1Adapter  : ${gmxV1Adapter.target}
- muxAdapter    : ${muxAdapter.target}
- exchange      : ${exchange.target}
- warehouse     : ${warehouse.target}
- reader        : ${reader.target}
- quoter        : ${quoter.target}
- logger        : ${logger.target}
- accountFactory: ${accountFactory.target}
- account       : ${noAccount ? "null" : account.target}
    `);

  const ethAmount = ethers.parseEther("100");
  const wbtcAmount = ethers.parseUnits("100", 8);
  const usdcAmount = ethers.parseUnits("1000000", 6);

  await deposit(WETH, ethAmount);
  await deposit(WBTC, wbtcAmount);
  await deposit(USDC, usdcAmount);
  console.log("-  eth: " + (await account.getBalance(WETH)));
  console.log("- wbtc: " + (await account.getBalance(WBTC)));
  console.log("- usdc: " + (await account.getBalance(USDC)));

  const ethCollateralAmount = ethers.parseEther("1");
  const wbtcCollateralAmount = ethers.parseUnits("0.1", 8);
  const usdcCollateralAmount = ethers.parseUnits("1000", 6);

  const ethSize = ethers.parseEther("10");
  const wbtcSize = ethers.parseUnits("1", 8);

  var triggerPrice = ethers.parseUnits("2000", 18);
  var acceptablePrice = ethers.parseUnits("1800", 18); // calculated by slippage tolerance

  await setDummyPrice();

  var orderId = 0;
  await increasePosition(muxAdapter, WETH, WETH, ethCollateralAmount, ethSize, true); // prettier-ignore
  console.log(await muxAdapter.getPosition(account.target, WETH, WETH, true)); // prettier-ignore
  await createTriggerOrder(muxAdapter, WETH, WETH, true, ethSize, 0, triggerPrice, acceptablePrice); // prettier-ignore
  var positionKey = await warehouse.getPositionKey(account.target, muxAdapter.target, WETH, WETH, true); // prettier-ignore
  // await executeTriggerOrder(positionKey, orderId++);
  // console.log(await muxAdapter.getPosition(account.target, WETH, WETH, true)); // prettier-ignore

  var orderId = 0;
  await increasePosition(gmxV1Adapter, WETH, WETH, ethCollateralAmount, ethSize, true); // prettier-ignore
  console.log(await gmxV1Adapter.getPosition(account.target, WETH, WETH, true)); // prettier-ignore
  await createTriggerOrder(gmxV1Adapter, WETH, WETH, true, ethSize, 1, triggerPrice, acceptablePrice); // prettier-ignore
  var positionKey = await warehouse.getPositionKey(account.target, gmxV1Adapter.target, WETH, WETH, true); // prettier-ignore
  // await executeTriggerOrder(positionKey, orderId++);
  // console.log(await gmxV1Adapter.getPosition(account.target, WETH, WETH, true)); // prettier-ignore
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
