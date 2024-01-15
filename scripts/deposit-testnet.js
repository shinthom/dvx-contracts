const { ethers } = require("hardhat");
const { deploy } = require("../test/fixture/setup");

async function main() {
  const {
    user,
    gmxV1,
    mux,
    exchange,
    warehouse,
    reader,
    quoter,
    account,
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
  } = await deploy();
  console.log(`
- user     : ${user.address}
- gmxV1    : ${gmxV1.target}
- mux      : ${mux.target}
- exchange : ${exchange.target}
- warehouse: ${warehouse.target}
- reader   : ${reader.target}
- quoter   : ${quoter.target}
- account  : ${account.target}
  `);

  console.log("`faucet`");
  await faucet(WBTC, ethers.parseUnits("100", 8));
  await faucet(USDC, ethers.parseUnits("1000000", 6));
  await faucet(USDCe, ethers.parseUnits("1000000", 6));
  await faucet(USDT, ethers.parseUnits("1000000", 6));
  const wbtcBalance = await wbtc.balanceOf(user.address);
  const usdcBalance = await usdc.balanceOf(user.address);
  const usdceBalance = await usdce.balanceOf(user.address);
  const usdtBalance = await usdt.balanceOf(user.address);

  console.log("\n`deposit`");
  await deposit(WBTC, wbtcBalance);
  await deposit(USDC, usdcBalance);
  await deposit(USDCe, usdceBalance);
  await deposit(USDT, usdtBalance);
  console.log("-  eth  : " + (await account.getBalance(ethers.ZeroAddress)));
  console.log("- wbtc  : " + (await account.getBalance(WBTC)));
  console.log("- usdc  : " + (await account.getBalance(USDC)));
  console.log("- usdc.e: " + (await account.getBalance(USDCe)));
  console.log("- usdt  : " + (await account.getBalance(USDT)));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
