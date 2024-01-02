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
    usdc,
    wbtc,
    faucet,
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
  await faucet(USDC, ethers.parseEther("30"), "USDC");
  await faucet(WBTC, ethers.parseEther("30"), "WBTC");
  const usdcBalance = await usdc.balanceOf(user.address);
  const wbtcBalance = await wbtc.balanceOf(user.address);

  await account.deposit(ethers.ZeroAddress, ethers.parseEther("30"), {
    value: ethers.parseEther("30"),
  });
  await usdc.connect(user).approve(account.target, usdcBalance);
  await account.connect(user).deposit(USDC, usdcBalance);
  await wbtc.connect(user).approve(account.target, wbtcBalance);
  await account.connect(user).deposit(WBTC, wbtcBalance);

  console.log("\n`deposit`");
  console.log("- weth: " + (await account.getBalance(ethers.ZeroAddress)));
  console.log("- wbtc: " + (await account.getBalance(WBTC)));
  console.log("- usdc: " + (await account.getBalance(USDC)));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
