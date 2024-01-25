const { ethers } = require("hardhat");
const { deploy } = require("../test/fixture");

async function main() {
  const noAccount = false;
  const {
    user,
    gmxV1Adapter,
    muxAdapter,
    exchange,
    warehouse,
    reader,
    quoter,
    logger,
    account,
    WETH,
    WBTC,
    USDT,
    USDC,
    USDCe,
    weth,
    wbtc,
    usdc,
    faucet,
  } = await deploy(noAccount);
  console.log(`
- user        : ${user.address}
- gmxV1Adapter: ${gmxV1Adapter.target}
- muxAdapter  : ${muxAdapter.target}
- exchange    : ${exchange.target}
- warehouse   : ${warehouse.target}
- reader      : ${reader.target}
- quoter      : ${quoter.target}
- logger      : ${logger.target}
- account     : ${noAccount ? "null" : account.target}
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

  await weth.connect(user).approve(account.target, wethDepositAmount);
  await account.connect(user).deposit(WETH, wethDepositAmount);

  await wbtc.connect(user).approve(account.target, wbtcDepositAmount);
  await account.connect(user).deposit(WBTC, wbtcDepositAmount);

  await usdc.connect(user).approve(account.target, usdcDepositAmount);
  await account.connect(user).deposit(USDC, usdcDepositAmount);

  console.log("`deposit`");
  console.log("-  eth: " + (await account.getBalance(WETH)));
  console.log("- wbtc: " + (await account.getBalance(WBTC)));
  console.log("- usdc: " + (await account.getBalance(USDC)));

  await account.connect(user).withdraw(WETH, wethDepositAmount / 2n);
  await account.connect(user).withdraw(WBTC, wbtcDepositAmount / 2n);
  await account.connect(user).withdraw(USDC, usdcDepositAmount / 2n);

  console.log("\n`withdraw`");
  console.log("-  eth: " + (await account.getBalance(WETH)));
  console.log("- wbtc: " + (await account.getBalance(WBTC)));
  console.log("- usdc: " + (await account.getBalance(USDC)));

  await account.connect(user).swap(WETH, USDC, wethDepositAmount / 2n);
  await account.connect(user).swap(WBTC, USDC, wbtcDepositAmount / 2n);
  console.log("\n`swap`");
  console.log("-  eth: " + (await account.getBalance(WETH)));
  console.log("- wbtc: " + (await account.getBalance(WBTC)));
  console.log("- usdc: " + (await account.getBalance(USDC)));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
