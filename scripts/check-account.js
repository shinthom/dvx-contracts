const { ethers } = require("hardhat");

async function main() {
  const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
  const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

  const muxAdapterAddr = "0x026aE93186d08C23b7351C27db672C775419D023";
  const accountAddr = "0xda722af1f6ff909471e4e192a45d3004cbd73c77";

  const exchangeAddr = "0x5ef78e87319653BE9D325673CcC04B4a378E13F4";
  const exchange = await ethers.getContractAt("Exchange", exchangeAddr);
  const position = await exchange.getPosition(
    muxAdapterAddr,
    accountAddr,
    WETH,
    WBTC,
    true
  );
  const wrapPosition = await exchange.getWrapPosition(
    muxAdapterAddr,
    accountAddr,
    WETH,
    WBTC,
    true
  );
  console.log(position);
  console.log(wrapPosition);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
