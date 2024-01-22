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
    USDCe,
    deposit,
    increasePosition,
    printPosition,
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

  await increasePosition(gmxV1Adapter, WETH, WETH, ethCollateralAmount, ethSize, true, await gmxV1Adapter.getMinExecutionFee()); // prettier-ignore
  console.log(await gmxV1Adapter.getPosition(account.target, WETH, WETH, true)); // prettier-ignore

  await increasePosition(gmxV1Adapter, WBTC, WETH, wbtcCollateralAmount, ethSize, true, await gmxV1Adapter.getMinExecutionFee()); // prettier-ignore
  console.log(await gmxV1Adapter.getPosition(account.target, WETH, WETH, true));

  await increasePosition(gmxV1Adapter, USDC, WETH, usdcCollateralAmount, ethSize, true, await gmxV1Adapter.getMinExecutionFee()); // prettier-ignore
  console.log(await gmxV1Adapter.getPosition(account.target, WETH, WETH, true));

  await increasePosition(gmxV1Adapter, WETH, WBTC, ethCollateralAmount, wbtcSize, true, await gmxV1Adapter.getMinExecutionFee()); // prettier-ignore
  console.log(await gmxV1Adapter.getPosition(account.target, WBTC, WBTC, true));

  await increasePosition(gmxV1Adapter, WBTC, WBTC, wbtcCollateralAmount, wbtcSize, true, await gmxV1Adapter.getMinExecutionFee()); // prettier-ignore
  console.log(await gmxV1Adapter.getPosition(account.target, WBTC, WBTC, true));

  await increasePosition(gmxV1Adapter, USDC, WBTC, usdcCollateralAmount, wbtcSize, true, await gmxV1Adapter.getMinExecutionFee()); // prettier-ignore
  console.log(await gmxV1Adapter.getPosition(account.target, WBTC, WBTC, true));

  await increasePosition(gmxV1Adapter, WETH, WETH, ethCollateralAmount, ethSize, false, await gmxV1Adapter.getMinExecutionFee()); // prettier-ignore
  console.log(
    await gmxV1Adapter.getPosition(account.target, USDCe, WETH, false)
  );

  await increasePosition(gmxV1Adapter, WBTC, WETH, wbtcCollateralAmount, ethSize, false, await gmxV1Adapter.getMinExecutionFee()); // prettier-ignore
  console.log(
    await gmxV1Adapter.getPosition(account.target, USDCe, WETH, false)
  );

  await increasePosition(gmxV1Adapter, USDC, WETH, usdcCollateralAmount, ethSize, false, await gmxV1Adapter.getMinExecutionFee()); // prettier-ignore
  console.log(
    await gmxV1Adapter.getPosition(account.target, USDC, WETH, false)
  );

  await increasePosition(gmxV1Adapter, WETH, WBTC, ethCollateralAmount, wbtcSize, false, await gmxV1Adapter.getMinExecutionFee()); // prettier-ignore
  console.log(
    await gmxV1Adapter.getPosition(account.target, USDCe, WBTC, false)
  );

  await increasePosition(gmxV1Adapter, WBTC, WBTC, wbtcCollateralAmount, wbtcSize, false, await gmxV1Adapter.getMinExecutionFee()); // prettier-ignore
  console.log(
    await gmxV1Adapter.getPosition(account.target, USDCe, WBTC, false)
  );

  await increasePosition(gmxV1Adapter, USDC, WBTC, usdcCollateralAmount, wbtcSize, false, await gmxV1Adapter.getMinExecutionFee()); // prettier-ignore
  console.log(
    await gmxV1Adapter.getPosition(account.target, USDC, WBTC, false)
  );

  await increasePosition(muxAdapter, WETH, WETH, ethCollateralAmount, ethSize, true, await muxAdapter.getMinExecutionFee()); // prettier-ignore
  console.log(await muxAdapter.getPosition(account.target, WETH, WETH, true)); // prettier-ignore

  await increasePosition(muxAdapter, WBTC, WETH, wbtcCollateralAmount, ethSize, true, await muxAdapter.getMinExecutionFee()); // prettier-ignore
  console.log(await muxAdapter.getPosition(account.target, WBTC, WETH, true)); // prettier-ignore

  await increasePosition(muxAdapter, USDC, WETH, usdcCollateralAmount, ethSize, true, await muxAdapter.getMinExecutionFee()); // prettier-ignore
  console.log(await muxAdapter.getPosition(account.target, USDC, WETH, true)); // prettier-ignore

  await increasePosition(muxAdapter, WETH, WBTC, ethCollateralAmount, wbtcSize, true, await muxAdapter.getMinExecutionFee()); // prettier-ignore
  console.log(await muxAdapter.getPosition(account.target, WETH, WBTC, true)); // prettier-ignore

  await increasePosition(muxAdapter, WBTC, WBTC, wbtcCollateralAmount, wbtcSize, true, await muxAdapter.getMinExecutionFee()); // prettier-ignore
  console.log(await muxAdapter.getPosition(account.target, WBTC, WBTC, true)); // prettier-ignore

  await increasePosition(muxAdapter, USDC, WBTC, usdcCollateralAmount, wbtcSize, true, await muxAdapter.getMinExecutionFee()); // prettier-ignore
  console.log(await muxAdapter.getPosition(account.target, USDC, WBTC, true)); // prettier-ignore

  await increasePosition(muxAdapter, WETH, WETH, ethCollateralAmount, ethSize, false, await muxAdapter.getMinExecutionFee()); // prettier-ignore
  console.log(await muxAdapter.getPosition(account.target, WETH, WETH, false)); // prettier-ignore

  await increasePosition(muxAdapter, WBTC, WETH, wbtcCollateralAmount, ethSize, false, await muxAdapter.getMinExecutionFee()); // prettier-ignore
  console.log(await muxAdapter.getPosition(account.target, WBTC, WETH, false)); // prettier-ignore

  await increasePosition(muxAdapter, USDC, WETH, usdcCollateralAmount, ethSize, false, await muxAdapter.getMinExecutionFee()); // prettier-ignore
  console.log(await muxAdapter.getPosition(account.target, USDC, WETH, false)); // prettier-ignore

  await increasePosition(muxAdapter, WETH, WBTC, ethCollateralAmount, wbtcSize, false, await muxAdapter.getMinExecutionFee()); // prettier-ignore
  console.log(await muxAdapter.getPosition(account.target, WETH, WBTC, false)); // prettier-ignore

  await increasePosition(muxAdapter, WBTC, WBTC, wbtcCollateralAmount, wbtcSize, false, await muxAdapter.getMinExecutionFee()); // prettier-ignore
  console.log(await muxAdapter.getPosition(account.target, WBTC, WBTC, false)); // prettier-ignore

  await increasePosition(muxAdapter, USDC, WBTC, usdcCollateralAmount, wbtcSize, false, await muxAdapter.getMinExecutionFee()); // prettier-ignore
  console.log(await muxAdapter.getPosition(account.target, USDC, WBTC, false)); // prettier-ignore

  // const positions = await reader.getPositions(
  //   account.target,
  //   [gmxV1Adapter.target, muxAdapter.target],
  //   [WETH, WBTC, USDC],
  //   [WETH, WBTC]
  // );

  // console.log("`positions`");
  // for (const position of positions) {
  //   console.log(`- ${position}`);
  // }

  // const tokenAmountInUseAsCollateral =
  //   await reader.getTokenAmountInUseAsCollateral(
  //     account.target,
  //     [gmxV1Adapter.target, muxAdapter.target],
  //     [WETH, WBTC, USDC],
  //     [WETH, WBTC]
  //   );
  // console.log(tokenAmountInUseAsCollateral);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
