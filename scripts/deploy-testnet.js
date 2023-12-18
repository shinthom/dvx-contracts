const { ethers } = require("hardhat");
const { deploy } = require("../test/fixture/setup");

async function main() {
  const {
    user0,
    gmxV1,
    mux,
    reader,
    quoter,
    account,
    tokens,
    usdc,
    wbtc,
    executeIncreasePosition,
    executeDecreasePosition,
    fillPositionOrder,
    swap,
  } = await deploy();
  console.log(`
- user0  : ${user0.address}
- gmxV1  : ${gmxV1.target}
- mux    : ${mux.target}
- reader : ${reader.target}
- quoter : ${quoter.target}
- account: ${account.target}
  `);

  const { WETH, USDC, WBTC } = tokens;
  console.log("\n`faucet`");
  await swap(WETH, USDC, ethers.parseEther("10"));
  await swap(WETH, WBTC, ethers.parseEther("10"));
  console.log("- usdc:", await usdc.balanceOf(user0.address));
  console.log("- wbtc:", await wbtc.balanceOf(user0.address));

  const depositAndIncreasePosition = async (
    collateral,
    index,
    collateralAmount,
    leverage,
    isLong
  ) => {
    console.log("\n`quote`");
    const gmxOrder = await quoter.quoteGMX(
      0,
      collateral,
      index,
      collateralAmount,
      leverage,
      isLong
    );
    const muxOrder = await quoter.quoteMUX(
      0,
      collateral,
      index,
      collateralAmount,
      leverage,
      isLong
    );
    console.log(gmxOrder);
    console.log(muxOrder);

    console.log("\n`createOrder`");
    await account.createOrders(
      [gmxV1.target, mux.target],
      [
        {
          orderType: gmxOrder.orderType,
          collateral: gmxOrder.collateral,
          index: gmxOrder.index,
          collateralAmount: gmxOrder.collateralAmount,
          size: gmxOrder.size,
          isLong: gmxOrder.isLong,
        },
        {
          orderType: muxOrder.orderType,
          collateral: muxOrder.collateral,
          index: muxOrder.index,
          collateralAmount: muxOrder.collateralAmount,
          size: muxOrder.size,
          isLong: muxOrder.isLong,
        },
      ],
      {
        value: BigInt("180000000000000"),
      }
    );
    await executeIncreasePosition();
    await fillPositionOrder();

    console.log("\n`checkBalance`");
    const gmxV1Position = await gmxV1.getPosition(
      account.target,
      collateral,
      index,
      isLong
    );
    const muxPosition = await mux.getPosition(
      account.target,
      collateral,
      index,
      isLong
    );

    console.log(`- position(gmx-v1): ${gmxV1Position}`);
    console.log(`- position(mux)   : ${muxPosition}`);
  };

  // todo: optimization
  const collateralAmount = ethers.parseEther("1");
  const leverage = 10n;
  const long = true;
  const short = false;

  console.log("\n`deposit`");
  await account.deposit(ethers.ZeroAddress, collateralAmount * 2n, {
    value: collateralAmount * 2n,
  });
  await depositAndIncreasePosition(
    WETH,
    WETH,
    collateralAmount,
    leverage,
    long
  );

  console.log("\n`deposit`");
  const wbtcAmount = await wbtc.balanceOf(user0.address);
  await wbtc.approve(account.target, (wbtcAmount / 4n) * 2n);
  await account.deposit(WBTC, (wbtcAmount / 4n) * 2n);
  await depositAndIncreasePosition(WBTC, WBTC, wbtcAmount / 4n, leverage, long);

  console.log("\n`deposit`");
  const usdcAmount = await usdc.balanceOf(user0.address);
  await usdc.approve(account.target, (usdcAmount / 4n) * 2n);
  await account.deposit(USDC, (usdcAmount / 4n) * 2n);
  await depositAndIncreasePosition(
    USDC,
    WETH,
    usdcAmount / 4n,
    leverage,
    short
  );

  console.log("\n`deposit`");
  const usdcAmount1 = await usdc.balanceOf(user0.address);
  await usdc.approve(account.target, (usdcAmount1 / 4n) * 2n);
  await account.deposit(USDC, (usdcAmount1 / 4n) * 2n);
  await depositAndIncreasePosition(
    USDC,
    WBTC,
    usdcAmount1 / 4n,
    leverage,
    short
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
