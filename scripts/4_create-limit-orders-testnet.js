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
    createLimitOrder,
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

  const executionFee = await exchange.minExecutionFee();
  const gmxV1AdapterExecutionFee = await gmxV1Adapter.getMinExecutionFee();
  const muxAdapterExecutionFee = await muxAdapter.getMinExecutionFee();

  var triggerPrice = ethers.parseUnits("2000", 18);
  var acceptablePrice = ethers.parseUnits("2020", 18);
  await createLimitOrder(WETH, WETH, ethCollateralAmount, ethSize, true, triggerPrice, acceptablePrice, executionFee, gmxV1AdapterExecutionFee); // prettier-ignore
  await createLimitOrder(WBTC, WETH, wbtcCollateralAmount, ethSize, true, triggerPrice, acceptablePrice, executionFee, gmxV1AdapterExecutionFee); // prettier-ignore
  await createLimitOrder(USDC, WETH, usdcCollateralAmount, ethSize, true, triggerPrice, acceptablePrice, executionFee, gmxV1AdapterExecutionFee); // prettier-ignore

  var triggerPrice = ethers.parseUnits("2000", 18);
  var acceptablePrice = ethers.parseUnits("1980", 18);
  await createLimitOrder(WETH, WETH, ethCollateralAmount, ethSize, false, triggerPrice, acceptablePrice, executionFee, gmxV1AdapterExecutionFee); // prettier-ignore
  await createLimitOrder(WBTC, WETH, wbtcCollateralAmount, ethSize, false, triggerPrice, acceptablePrice, executionFee, gmxV1AdapterExecutionFee); // prettier-ignore
  await createLimitOrder(USDC, WETH, usdcCollateralAmount, ethSize, false, triggerPrice, acceptablePrice, executionFee, gmxV1AdapterExecutionFee); // prettier-ignore

  var triggerPrice = ethers.parseUnits("40000", 18);
  var acceptablePrice = ethers.parseUnits("40400", 18);
  await createLimitOrder(WETH, WBTC, ethCollateralAmount, wbtcSize, true, triggerPrice, acceptablePrice, executionFee, gmxV1AdapterExecutionFee); // prettier-ignore
  await createLimitOrder(WBTC, WBTC, wbtcCollateralAmount, wbtcSize, true, triggerPrice, acceptablePrice, executionFee, gmxV1AdapterExecutionFee); // prettier-ignore
  await createLimitOrder(USDC, WBTC, usdcCollateralAmount, wbtcSize, true, triggerPrice, acceptablePrice, executionFee, gmxV1AdapterExecutionFee); // prettier-ignore

  var triggerPrice = ethers.parseUnits("40000", 18);
  var acceptablePrice = ethers.parseUnits("39600", 18);
  await createLimitOrder(WETH, WBTC, ethCollateralAmount, wbtcSize, false, triggerPrice, acceptablePrice, executionFee, gmxV1AdapterExecutionFee); // prettier-ignore
  await createLimitOrder(WBTC, WBTC, wbtcCollateralAmount, wbtcSize, false, triggerPrice, acceptablePrice, executionFee, gmxV1AdapterExecutionFee); // prettier-ignore
  await createLimitOrder(USDC, WBTC, usdcCollateralAmount, wbtcSize, false, triggerPrice, acceptablePrice, executionFee, gmxV1AdapterExecutionFee); // prettier-ignore

  console.log(await warehouse.getLimitOrders(account.target));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
