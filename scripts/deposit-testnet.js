const { ethers } = require("hardhat");
const { deploy } = require("../test/fixture/setup");

async function main() {
  const {
    user0,
    gmxV1,
    mux,
    exchange,
    warehouse,
    reader,
    quoter,
    account,
    tokens,
    usdc,
    wbtc,
    swap,
  } = await deploy();
  console.log(`
- user0    : ${user0.address}
- gmxV1    : ${gmxV1.target}
- mux      : ${mux.target}
- exchange : ${exchange.target}
- warehouse: ${warehouse.target}
- reader   : ${reader.target}
- quoter   : ${quoter.target}
- account  : ${account.target}
  `);

  const { WETH, USDC, WBTC } = tokens;

  const faucet = async (tokenAddress, tokenAmount, tokenName) => {
    await swap(WETH, tokenAddress, tokenAmount);

    const token = await ethers.getContractAt("IERC20", tokenAddress);
    console.log(`- ${tokenName}: ${await token.balanceOf(user0.address)}`);
  };

  console.log("`faucet`");
  await faucet(USDC, ethers.parseEther("300"), "USDC");
  await faucet(WBTC, ethers.parseEther("300"), "WBTC");

  await account.deposit(ethers.ZeroAddress, ethers.parseEther("30"), {
    value: ethers.parseEther("30"),
  });
  await usdc.approve(account.target, ethers.parseUnits("6000", 6));
  await account.deposit(USDC, ethers.parseUnits("6000", 6));
  await wbtc.approve(account.target, ethers.parseUnits("10", 8));
  await account.deposit(WBTC, ethers.parseUnits("10", 8));

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
