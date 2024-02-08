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
    account,
    weth,
    wbtc,
    usdc,
    WETH,
    WBTC,
    USDC,
    USDCe,
    USDT,
    faucet,
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

  const wethAmount = ethers.parseEther("100");
  const wbtcAmount = ethers.parseUnits("100", 8);
  const usdAmount = ethers.parseUnits("1000000", 6);

  await faucet(WETH, wethAmount);
  await faucet(WBTC, wbtcAmount);
  await faucet(USDT, usdAmount);
  await faucet(USDC, usdAmount);
  await faucet(USDCe, usdAmount);

  const wethDepositAmount = ethers.parseEther("1");
  const wbtcDepositAmount = ethers.parseUnits("0.1", 8);
  const usdcDepositAmount = ethers.parseUnits("1000", 6);

  await weth.connect(owner).approve(account.target, wethDepositAmount);
  await account.connect(owner).deposit(WETH, wethDepositAmount, 0, 0, "0x");

  await wbtc.connect(owner).approve(account.target, wbtcDepositAmount);
  await account.connect(owner).deposit(WBTC, wbtcDepositAmount, 0, 0, "0x");

  await usdc.connect(owner).approve(account.target, usdcDepositAmount);
  await account.connect(owner).deposit(USDC, usdcDepositAmount, 0, 0, "0x");

  console.log("`deposit`");
  console.log("-  eth: " + (await account.getBalance(WETH)));
  console.log("- wbtc: " + (await account.getBalance(WBTC)));
  console.log("- usdc: " + (await account.getBalance(USDC)));

  // await account.connect(owner).withdraw(WETH, wethDepositAmount / 2n, 0, "0x");
  // await account.connect(owner).withdraw(WBTC, wbtcDepositAmount / 2n, 0, "0x");
  // await account.connect(owner).withdraw(USDC, usdcDepositAmount / 2n, 0, "0x");

  // console.log("\n`withdraw`");
  // console.log("-  eth: " + (await account.getBalance(WETH)));
  // console.log("- wbtc: " + (await account.getBalance(WBTC)));
  // console.log("- usdc: " + (await account.getBalance(USDC)));

  // await account
  //   .connect(owner)
  //   .swap(WETH, USDC, wethDepositAmount / 2n, 0, "0x");
  // await account
  //   .connect(owner)
  //   .swap(WBTC, USDC, wbtcDepositAmount / 2n, 0, "0x");
  // console.log("\n`swap`");
  // console.log("-  eth: " + (await account.getBalance(WETH)));
  // console.log("- wbtc: " + (await account.getBalance(WBTC)));
  // console.log("- usdc: " + (await account.getBalance(USDC)));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
