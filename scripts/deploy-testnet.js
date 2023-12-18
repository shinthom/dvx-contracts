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

  console.log("\n`deposit`");
  const depositAmount = ethers.parseEther("10");
  await account.deposit(ethers.ZeroAddress, depositAmount, {
    value: depositAmount,
  });
  console.log(await account.getBalance(ethers.ZeroAddress));

  console.log("\n`quote`");
  const orderType = {
    increasePosition: 0,
    decreasePosition: 1,
    increaseCollateral: 2,
    decreaseCollateral: 3,
  };
  const collateral = WETH;
  const index = WETH;
  const collateralAmount = ethers.parseEther("1");
  const leverage = 10n;
  const isLong = true;

  const [gmxOrder, muxOrder] = await quoter.quote(
    collateral,
    index,
    collateralAmount,
    leverage,
    isLong,
    ethers.parseEther("1234")
  );
  console.log(gmxOrder);
  console.log(muxOrder);

  console.log("\n`createOrder`");
  await account.createOrders(
    [gmxV1.target, mux.target],
    [
      {
        orderType: gmxOrder.order.orderType,
        collateral: gmxOrder.order.collateral,
        index: gmxOrder.order.index,
        collateralAmount: gmxOrder.order.collateralAmount,
        size: gmxOrder.order.size,
        isLong: gmxOrder.order.isLong,
      },
      {
        orderType: muxOrder.order.orderType,
        collateral: muxOrder.order.collateral,
        index: muxOrder.order.index,
        collateralAmount: muxOrder.order.collateralAmount,
        size: muxOrder.order.size,
        isLong: muxOrder.order.isLong,
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
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
