const { ethers } = require("hardhat");

async function main() {
  const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

  const muxAdapterAddr = "0x609972A53208858aACe59AD8bB2B7fa4DEc4fFb7"; // updated
  const accountAddr = "0xaaea6173fd59d9d8ced4d8c82be24e89471da40c";

  const muxAdapter = await ethers.getContractAt("IAdapter", muxAdapterAddr);
  console.log(await muxAdapter.getCloseFee(accountAddr, WBTC, WBTC, true));
  console.log(
    await muxAdapter.getPositionNetValueUsd(accountAddr, WBTC, WBTC, true)
  );
  console.log(
    await muxAdapter.getPositionNetValueToken(accountAddr, WBTC, WBTC, true)
  );
  console.log(await muxAdapter.getPosition(accountAddr, WBTC, WBTC, true));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
