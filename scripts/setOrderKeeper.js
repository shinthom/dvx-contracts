const { ethers } = require("hardhat");

async function main() {
  const exchangeAddr = "";
  const exchange = await ethers.getContractAt("Exchange", exchangeAddr);

  const orderKeeper = "";
  await exchange.setOrderKeeper(orderKeeper);
  console.log("Exchange: setOrderKeeper\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
