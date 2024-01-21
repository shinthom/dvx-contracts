const { ethers } = require("hardhat");
const { deploy } = require("../test/fixture");

async function main() {
  const noAccount = false;
  const {
    user,
    account,
    gmxV1Adapter,
    muxAdapter,
    exchange,
    warehouse,
    reader,
    quoter,
    ETH,
    WETH,
    WBTC,
    USDC,
    deposit,
    increasePosition,
    createTriggerOrder,
  } = await deploy(noAccount);
  console.log(`
- user     : ${user.address}
- gmxV1    : ${gmxV1Adapter.target}
- mux      : ${muxAdapter.target}
- exchange : ${exchange.target}
- warehouse: ${warehouse.target}
- reader   : ${reader.target}
- quoter   : ${quoter.target}
- account  : ${noAccount ? "null" : account.target}
  `);

  const ethAmount = ethers.parseEther("100");
  const wbtcAmount = ethers.parseUnits("100", 8);
  const usdcAmount = ethers.parseUnits("1000000", 6);

  await deposit(ETH, ethAmount);
  await deposit(WBTC, wbtcAmount);
  await deposit(USDC, usdcAmount);
  console.log("-  eth: " + (await account.getBalance(ethers.ZeroAddress)));
  console.log("- wbtc: " + (await account.getBalance(WBTC)));
  console.log("- usdc: " + (await account.getBalance(USDC)));

  const ethCollateralAmount = ethers.parseEther("1");
  const wbtcCollateralAmount = ethers.parseUnits("0.1", 8);
  const usdcCollateralAmount = ethers.parseUnits("1000", 6);

  const ethSize = ethers.parseEther("10");
  const wbtcSize = ethers.parseUnits("1", 8);

  const gmxV1AdapterExecutionFee = await gmxV1Adapter.getMinExecutionFee();
  const muxAdapterExecutionFee = await muxAdapter.getMinExecutionFee();

  await increasePosition(gmxV1Adapter, WETH, WETH, ethCollateralAmount, ethSize, true, gmxV1AdapterExecutionFee); // prettier-ignore
  await increasePosition(gmxV1Adapter, WBTC, WETH, wbtcCollateralAmount, ethSize, true, gmxV1AdapterExecutionFee); // prettier-ignore
  await increasePosition(gmxV1Adapter, USDC, WETH, usdcCollateralAmount, ethSize, true, gmxV1AdapterExecutionFee); // prettier-ignore
  await increasePosition(muxAdapter, WETH, WETH, ethCollateralAmount, ethSize, true, muxAdapterExecutionFee); // prettier-ignore
  await increasePosition(muxAdapter, WBTC, WETH, wbtcCollateralAmount, ethSize, true, muxAdapterExecutionFee); // prettier-ignore
  await increasePosition(muxAdapter, USDC, WETH, usdcCollateralAmount, ethSize, true, muxAdapterExecutionFee); // prettier-ignore
  // await increasePosition(gmxV1Adapter, WETH, WBTC, ethCollateralAmount, wbtcSize, true, gmxV1AdapterExecutionFee); // prettier-ignore
  // await increasePosition(gmxV1Adapter, WBTC, WBTC, wbtcCollateralAmount, wbtcSize, true, gmxV1AdapterExecutionFee); // prettier-ignore
  // await increasePosition(gmxV1Adapter, USDC, WBTC, usdcCollateralAmount, wbtcSize, true, gmxV1AdapterExecutionFee); // prettier-ignore
  // await increasePosition(muxAdapter, WETH, WBTC, ethCollateralAmount, wbtcSize, true, muxAdapterExecutionFee); // prettier-ignore
  // await increasePosition(muxAdapter, WBTC, WBTC, wbtcCollateralAmount, wbtcSize, true, muxAdapterExecutionFee); // prettier-ignore
  // await increasePosition(muxAdapter, USDC, WBTC, usdcCollateralAmount, wbtcSize, true, muxAdapterExecutionFee); // prettier-ignore

  await increasePosition(gmxV1Adapter, WETH, WETH, ethCollateralAmount, ethSize, false, gmxV1AdapterExecutionFee); // prettier-ignore
  await increasePosition(gmxV1Adapter, WBTC, WETH, wbtcCollateralAmount, ethSize, false, gmxV1AdapterExecutionFee); // prettier-ignore
  await increasePosition(gmxV1Adapter, USDC, WETH, usdcCollateralAmount, ethSize, false, gmxV1AdapterExecutionFee); // prettier-ignore
  await increasePosition(muxAdapter, WETH, WETH, ethCollateralAmount, ethSize, false, muxAdapterExecutionFee); // prettier-ignore
  await increasePosition(muxAdapter, WBTC, WETH, wbtcCollateralAmount, ethSize, false, muxAdapterExecutionFee); // prettier-ignore
  await increasePosition(muxAdapter, USDC, WETH, usdcCollateralAmount, ethSize, false, muxAdapterExecutionFee); // prettier-ignore
  // await increasePosition(gmxV1Adapter, WETH, WBTC, ethCollateralAmount, wbtcSize, false, gmxV1AdapterExecutionFee); // prettier-ignore
  // await increasePosition(gmxV1Adapter, WBTC, WBTC, wbtcCollateralAmount, wbtcSize, false, gmxV1AdapterExecutionFee); // prettier-ignore
  // await increasePosition(gmxV1Adapter, USDC, WBTC, usdcCollateralAmount, wbtcSize, false, gmxV1AdapterExecutionFee); // prettier-ignore
  // await increasePosition(muxAdapter, WETH, WBTC, ethCollateralAmount, wbtcSize, false, muxAdapterExecutionFee); // prettier-ignore
  // await increasePosition(muxAdapter, WBTC, WBTC, wbtcCollateralAmount, wbtcSize, false, muxAdapterExecutionFee); // prettier-ignore
  // await increasePosition(muxAdapter, USDC, WBTC, usdcCollateralAmount, wbtcSize, false, muxAdapterExecutionFee); // prettier-ignore

  const triggerOrderType = { takeProfit: 0, stopLoss: 1 };

  var price = ethers.parseUnits("2000", 30);
  var triggerPrice = ethers.parseUnits("2000", 18);
  var acceptablePrice = ethers.parseUnits("1900", 18);

  const executionFee = await exchange.minExecutionFee();
  await createTriggerOrder(gmxV1Adapter, WETH, WETH, true, ethSize, triggerOrderType.takeProfit, triggerPrice, acceptablePrice, executionFee, gmxV1AdapterExecutionFee, { value: executionFee + gmxV1AdapterExecutionFee }); // prettier-ignore
  var positionKey = await warehouse.getPositionKey(account.target, gmxV1Adapter.target, WETH, WETH, true); // prettier-ignore
  console.log(await warehouse.getTriggerOrders(positionKey)); // prettier-ignore
  await createTriggerOrder(muxAdapter, WETH, WETH, true, ethSize, triggerOrderType.takeProfit, triggerPrice, acceptablePrice, executionFee, muxAdapterExecutionFee, { value: executionFee + muxAdapterExecutionFee }); // prettier-ignore
  var positionKey = await warehouse.getPositionKey(account.target, muxAdapter.target, WETH, WETH, true); // prettier-ignore
  console.log(await warehouse.getTriggerOrders(positionKey)); // prettier-ignore
  await createTriggerOrder(muxAdapter, WBTC, WETH, true, ethSize, triggerOrderType.takeProfit, triggerPrice, acceptablePrice, executionFee, muxAdapterExecutionFee, { value: executionFee + muxAdapterExecutionFee }); // prettier-ignore
  var positionKey = await warehouse.getPositionKey(account.target, muxAdapter.target, WBTC, WETH, true); // prettier-ignore
  console.log(await warehouse.getTriggerOrders(positionKey)); // prettier-ignore
  await createTriggerOrder(muxAdapter, USDC, WETH, true, ethSize, triggerOrderType.takeProfit, triggerPrice, acceptablePrice, executionFee, muxAdapterExecutionFee, { value: executionFee + muxAdapterExecutionFee }); // prettier-ignore
  var positionKey = await warehouse.getPositionKey(account.target, muxAdapter.target, USDC, WETH, true); // prettier-ignore
  console.log(await warehouse.getTriggerOrders(positionKey)); // prettier-ignore

  // short
  var triggerPrice = ethers.parseUnits("2000", 18);
  var acceptablePrice = ethers.parseUnits("2100", 18);
  await createTriggerOrder(gmxV1Adapter, USDC, WETH, false, ethSize, triggerOrderType.takeProfit, triggerPrice, acceptablePrice, executionFee, gmxV1AdapterExecutionFee, { value: executionFee + gmxV1AdapterExecutionFee }); // prettier-ignore
  var positionKey = await warehouse.getPositionKey(account.target, gmxV1Adapter.target, USDC, WETH, false); // prettier-ignore
  console.log(await warehouse.getTriggerOrders(positionKey)); // prettier-ignore
  await createTriggerOrder(muxAdapter, WETH, WETH, false, ethSize, triggerOrderType.takeProfit, triggerPrice, acceptablePrice, executionFee, muxAdapterExecutionFee, { value: executionFee + muxAdapterExecutionFee }); // prettier-ignore
  var positionKey = await warehouse.getPositionKey(account.target, muxAdapter.target, WETH, WETH, false); // prettier-ignore
  console.log(await warehouse.getTriggerOrders(positionKey)); // prettier-ignore
  await createTriggerOrder(muxAdapter, WBTC, WETH, false, ethSize, triggerOrderType.takeProfit, triggerPrice, acceptablePrice, executionFee, muxAdapterExecutionFee, { value: executionFee + muxAdapterExecutionFee }); // prettier-ignore
  var positionKey = await warehouse.getPositionKey(account.target, muxAdapter.target, WBTC, WETH, false); // prettier-ignore
  console.log(await warehouse.getTriggerOrders(positionKey)); // prettier-ignore
  await createTriggerOrder(muxAdapter, USDC, WETH, false, ethSize, triggerOrderType.takeProfit, triggerPrice, acceptablePrice, executionFee, muxAdapterExecutionFee, { value: executionFee + muxAdapterExecutionFee }); // prettier-ignore
  var positionKey = await warehouse.getPositionKey(account.target, muxAdapter.target, USDC, WETH, false); // prettier-ignore
  console.log(await warehouse.getTriggerOrders(positionKey)); // prettier-ignore
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
