const { ethers } = require("hardhat");

const PositionRouter = "0xb87a436b93ffe9d75c5cfa7bacfff96430b09868";
const Router = "0xabbc5f99639c9b6bcb58544ddf04efa6802f4064";
const Vault = "0x489ee077994b6658eafa855c308275ead8097c4a";
const Timelock = "0xe7E740Fa40CA16b15B621B49de8E9F0D69CF4858";

const OrderBook = "0xa19fD5aB6C8DCffa2A295F78a5Bb4aC543AAF5e3";
const LiquidityPool = "0x3e0199792ce69dc29a0a36146bfa68bd7c8d6633";

const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const USDT = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
const USDCe = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";

const exchangeAddr = "0x09AE07dF36290EE6EFBDd12Aec99262331701B30";
const gmxV1AdapterAddr = "0x1Ad4748a84373e10FdB1965Ee1C4058Cd8aaf63F";
const muxAdapterAddr = "0x1458eC28C98E3121B2849bFF20c231845Bd6e5Ce";

async function main() {
  let gasUsed = 0n;

  const waitAndLogAccumulatedGasUsed = async (tx) => {
    const receipt = await tx.wait();
    gasUsed += receipt.gasUsed;
    console.log("gasUsed:", gasUsed);
  };

  const exchange = await ethers.getContractAt("Exchange", exchangeAddr);
  const weth = await ethers.getContractAt("IERC20", WETH);
  const gmxV1Adapter = await ethers.getContractAt(
    "GmxV1Adapter",
    gmxV1AdapterAddr
  );
  const muxAdapter = await ethers.getContractAt("MuxAdapter", muxAdapterAddr);

  const accountAddr = await exchange.getAccount(
    (
      await ethers.provider.getSigner()
    ).address
  );
  const account = await ethers.getContractAt("Account", accountAddr);
  console.log(accountAddr);

  console.log(await gmxV1Adapter.getPosition(accountAddr, WETH, WETH, true));
  console.log(
    await gmxV1Adapter.getWrapPosition(accountAddr, WETH, WETH, true)
  );
  console.log(await muxAdapter.getPosition(accountAddr, WETH, WETH, true));
  console.log(await muxAdapter.getWrapPosition(accountAddr, WETH, WETH, true));

  const gmxCloseSize = (
    await gmxV1Adapter.getWrapPosition(accountAddr, WETH, WETH, true)
  ).size;
  const muxCloseSize = (
    await muxAdapter.getWrapPosition(accountAddr, WETH, WETH, true)
  ).size;
  console.log("gmxCloseSize:", gmxCloseSize.toString());
  console.log("muxCloseSize:", muxCloseSize.toString());

  // const adapterFee = await gmxV1Adapter.getMinExecutionFee();
  // // decreasePosition
  // await waitAndLogAccumulatedGasUsed(
  //   await account.decreasePosition(
  //     gmxV1Adapter.target,
  //     WETH,
  //     WETH,
  //     true,
  //     gmxCloseSize,
  //     0,
  //     0,
  //     0,
  //     "0x",
  //     { value: adapterFee }
  //   )
  // );
  // console.log("Position decreased (GMX V1)\n");

  // // decreasePosition
  // await waitAndLogAccumulatedGasUsed(
  //   await account.decreasePosition(
  //     muxAdapter.target,
  //     WETH,
  //     WETH,
  //     true,
  //     muxCloseSize,
  //     0,
  //     0,
  //     0,
  //     "0x"
  //   )
  // );
  // console.log("Position decreased (MUX)\n");

  // // decreasePosition
  // await waitAndLogAccumulatedGasUsed(
  //   await account.decreasePosition(
  //     muxAdapter.target,
  //     WETH,
  //     WETH,
  //     true,
  //     muxCloseSize,
  //     0,
  //     0,
  //     0,
  //     "0x"
  //   )
  // );
  // console.log("Position decreased (MUX)\n");

  // console.log(await account.getBalance(WETH));

  // const withdrawAmount = await account.getBalance(WETH);
  // await waitAndLogAccumulatedGasUsed(
  //   await account.withdraw(WETH, withdrawAmount, 0, 0, "0x")
  // );
  // console.log("WETH withdrawn\n");

  // console.log(await account.getBalance(WETH));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
