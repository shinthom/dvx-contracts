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
    account,
    ETH,
    WBTC,
    USDC,
    USDCe,
    USDT,
    wbtc,
    usdc,
    usdce,
    usdt,
    faucet,
    deposit,
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
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
