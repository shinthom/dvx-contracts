const { ethers } = require("hardhat");
const { deploy } = require("../test/fixture");

async function main() {
  const noAccount = false;
  const {
    owner,
    gmxV1Adapter,
    muxAdapter,
    exchange,
    warehouse,
    reader,
    quoter,
    logger,
    accountFactory,
    attendanceBook,
    account,
    weth,
    wbtc,
    usdc,
    WETH,
    WBTC,
    USDC,
    USDCe,
    USDT,
    deposit,
    setDummyPrice,
    increasePosition,
    createLimitOrder,
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
- attendanceBook: ${attendanceBook.target}
- account       : ${noAccount ? "null" : account.target}
  `);

  const wethAmount = ethers.parseEther("100");
  const wbtcAmount = ethers.parseUnits("100", 8);
  const usdcAmount = ethers.parseUnits("1000000", 6);

  await deposit(WETH, wethAmount);
  await deposit(WBTC, wbtcAmount);
  await deposit(USDC, usdcAmount);
  console.log("- weth: " + (await account.getBalance(WETH)));
  console.log("- wbtc: " + (await account.getBalance(WBTC)));
  console.log("- usdc: " + (await account.getBalance(USDC)));

  const ethCollateralAmount = ethers.parseEther("1");
  const wbtcCollateralAmount = ethers.parseUnits("0.1", 8);
  const usdcCollateralAmount = ethers.parseUnits("1000", 6);

  const ethSize = ethers.parseEther("10");
  const wbtcSize = ethers.parseUnits("1", 8);

  var triggerPrice = ethers.parseUnits("2000", 18);
  var acceptablePrice = ethers.parseUnits("2000", 18);
  await setDummyPrice();

  var orderId = 0;
  await createLimitOrder(WETH, WETH, ethCollateralAmount, ethSize, true, triggerPrice, acceptablePrice, 0); // prettier-ignore
  // await executeLimitOrder(orderId++, gmxV1Adapter, 0);
  // console.log(await gmxV1Adapter.getPosition(account.target, WETH, WETH, true));
  await createLimitOrder(WETH, WETH, ethCollateralAmount, ethSize, true, triggerPrice, acceptablePrice, 0); // prettier-ignore
  // await executeLimitOrder(orderId++, muxAdapter, 0);
  // console.log(await muxAdapter.getPosition(account.target, WETH, WETH, true));

  await createLimitOrder(WBTC, WETH, wbtcCollateralAmount, ethSize, true, triggerPrice, acceptablePrice, 0); // prettier-ignore
  // await executeLimitOrder(orderId++, gmxV1Adapter, 0);
  // console.log(await gmxV1Adapter.getPosition(account.target, WETH, WETH, true));
  await createLimitOrder(WBTC, WETH, wbtcCollateralAmount, ethSize, true, triggerPrice, acceptablePrice, 0); // prettier-ignore
  // await executeLimitOrder(orderId++, muxAdapter, 0);
  // console.log(await muxAdapter.getPosition(account.target, WBTC, WETH, true));

  await createLimitOrder(USDC, WETH, usdcCollateralAmount, ethSize, true, triggerPrice, acceptablePrice, 0); // prettier-ignore
  // await executeLimitOrder(orderId++, gmxV1Adapter, 0);
  // console.log(await gmxV1Adapter.getPosition(account.target, WETH, WETH, true));
  await createLimitOrder(USDC, WETH, usdcCollateralAmount, ethSize, true, triggerPrice, acceptablePrice, 0); // prettier-ignore
  // await executeLimitOrder(orderId++, muxAdapter, 0);
  // console.log(await muxAdapter.getPosition(account.target, USDC, WETH, true));

  var triggerPrice = ethers.parseUnits("2000", 18);
  var acceptablePrice = ethers.parseUnits("1980", 18);
  await createLimitOrder(WETH, WETH, ethCollateralAmount, ethSize, false, triggerPrice, acceptablePrice, 0); // prettier-ignore
  await createLimitOrder(WBTC, WETH, wbtcCollateralAmount, ethSize, false, triggerPrice, acceptablePrice, 0); // prettier-ignore
  await createLimitOrder(USDC, WETH, usdcCollateralAmount, ethSize, false, triggerPrice, acceptablePrice, 0); // prettier-ignore

  var triggerPrice = ethers.parseUnits("40000", 18);
  var acceptablePrice = ethers.parseUnits("40400", 18);
  await createLimitOrder(WETH, WBTC, ethCollateralAmount, wbtcSize, true, triggerPrice, acceptablePrice, 0); // prettier-ignore
  await createLimitOrder(WBTC, WBTC, wbtcCollateralAmount, wbtcSize, true, triggerPrice, acceptablePrice, 0); // prettier-ignore
  await createLimitOrder(USDC, WBTC, usdcCollateralAmount, wbtcSize, true, triggerPrice, acceptablePrice, 0); // prettier-ignore

  var triggerPrice = ethers.parseUnits("40000", 18);
  var acceptablePrice = ethers.parseUnits("39600", 18);
  await createLimitOrder(WETH, WBTC, ethCollateralAmount, wbtcSize, false, triggerPrice, acceptablePrice, 0); // prettier-ignore
  await createLimitOrder(WBTC, WBTC, wbtcCollateralAmount, wbtcSize, false, triggerPrice, acceptablePrice, 0); // prettier-ignore
  await createLimitOrder(USDC, WBTC, usdcCollateralAmount, wbtcSize, false, triggerPrice, acceptablePrice, 0); // prettier-ignore

  console.log(await warehouse.getLimitOrders(account.target));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
