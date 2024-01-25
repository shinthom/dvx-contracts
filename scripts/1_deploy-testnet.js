const { deploy } = require("../test/fixture");

async function main() {
  const noAccount = true;
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
    USDC,
    USDCe,
    USDT,
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
  const wbtcAmount = ethers.parseUnits("10", 8);
  const usdAmount = ethers.parseUnits("100000", 6);

  await faucet(WETH, wethAmount);
  await faucet(WBTC, wbtcAmount);
  await faucet(USDT, usdAmount);
  await faucet(USDC, usdAmount);
  await faucet(USDCe, usdAmount);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
