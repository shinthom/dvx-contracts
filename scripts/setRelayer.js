const { ethers } = require("hardhat");

async function main() {
  const exchangeAddr = "";
  const exchange = await ethers.getContractAt("Exchange", exchangeAddr);

  const relayer = "";
  await exchange.setRelayer(relayer);
  console.log("Exchange: setRelayer\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
