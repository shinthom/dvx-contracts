const { ethers } = require("hardhat");
const { deploy } = require("../test/fixture/setup");

async function main() {
  const {
    user0,
    gmxV1,
    mux,
    exchange,
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
- user0   : ${user0.address}
- gmxV1   : ${gmxV1.target}
- mux     : ${mux.target}
- exchange: ${exchange.target}
- reader  : ${reader.target}
- quoter  : ${quoter.target}
- account : ${account.target}
  `);

  const { WETH, USDC, WBTC } = tokens;

  const faucet = async (tokenAddress, tokenAmount, tokenName) => {
    await swap(WETH, tokenAddress, tokenAmount);

    const token = await ethers.getContractAt("IERC20", tokenAddress);
    console.log(`- ${tokenName}: ${await token.balanceOf(user0.address)}`);
  };

  console.log("`faucet`");
  await faucet(USDC, ethers.parseEther("200"), "USDC");
  await faucet(WBTC, ethers.parseEther("200"), "WBTC");

  const depositAndIncreasePosition = async (
    collateral,
    index,
    collateralAmount,
    leverage,
    isLong,
    description
  ) => {
    const gmxOrder = await gmxV1.makePositionOrder(
      collateral,
      index,
      collateralAmount / 2n,
      leverage,
      isLong
    );
    const muxOrder = await mux.makePositionOrder(
      collateral,
      index,
      collateralAmount / 2n,
      leverage,
      isLong
    );

    if (collateral == WETH) {
      await account.deposit(ethers.ZeroAddress, collateralAmount, {
        value: collateralAmount,
      });
    } else {
      const token = await ethers.getContractAt("IERC20", collateral);
      await token.approve(account.target, collateralAmount);
      await account.deposit(collateral, collateralAmount);
    }

    await account.createOrders(
      [gmxV1.target],
      [
        {
          orderType: gmxOrder.orderType,
          collateral: gmxOrder.collateral,
          index: gmxOrder.index,
          collateralAmount: gmxOrder.collateralAmount,
          size: gmxOrder.size,
          isLong: gmxOrder.isLong,
        },
      ],
      {
        value:
          collateral == WETH
            ? BigInt("180000000000000") + gmxOrder.collateralAmount
            : BigInt("180000000000000"),
      }
    );
    await account.createOrders(
      [mux.target],
      [
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
        value: collateral == WETH ? muxOrder.collateralAmount : 0,
      }
    );

    await executeIncreasePosition();
    await fillPositionOrder();

    const gmxV1Position = await gmxV1.getPosition(account.target, isLong ? index : USDC, index, isLong); // prettier-ignore
    const muxPosition =     await mux.getPosition(account.target, collateral,            index, isLong); // prettier-ignore
    console.log("\n- " + description);
    console.log(`  - position(gmx): ${gmxV1Position}`);
    console.log(`  - position(mux): ${muxPosition}`);
  };

  // long weth market
  await depositAndIncreasePosition(WETH, WETH, ethers.parseEther("10"),     10n, true, "long: weth -> weth") // prettier-ignore
  await depositAndIncreasePosition(WBTC, WETH, ethers.parseUnits("1", 8),   10n, true, "long: wbtc -> weth") // prettier-ignore
  await depositAndIncreasePosition(USDC, WETH, ethers.parseUnits("100", 6), 10n, true, "long: usdc -> weth") // prettier-ignore
  // long wbtc market
  await depositAndIncreasePosition(WETH, WBTC, ethers.parseEther("10"),     10n, true, "long: weth -> wbtc") // prettier-ignore
  await depositAndIncreasePosition(WBTC, WBTC, ethers.parseUnits("1", 8),   10n, true, "long: wbtc -> wbtc") // prettier-ignore
  await depositAndIncreasePosition(USDC, WBTC, ethers.parseUnits("100", 6), 10n, true, "long: usdc -> wbtc") // prettier-ignore
  // short weth market
  await depositAndIncreasePosition(WETH, WETH, ethers.parseEther("10"),     10n, false, "short: weth -> weth") // prettier-ignore
  await depositAndIncreasePosition(WBTC, WETH, ethers.parseUnits("1", 8),   10n, false, "short: wbtc -> weth") // prettier-ignore
  await depositAndIncreasePosition(USDC, WETH, ethers.parseUnits("100", 6), 10n, false, "short: usdc -> weth") // prettier-ignore
  // short wbtc market
  await depositAndIncreasePosition(WETH, WBTC, ethers.parseEther("10"),     10n, false, "short: weth -> wbtc") // prettier-ignore
  await depositAndIncreasePosition(WBTC, WBTC, ethers.parseUnits("1", 8),   10n, false, "short: wbtc -> wbtc") // prettier-ignore
  await depositAndIncreasePosition(USDC, WBTC, ethers.parseUnits("100", 6), 10n, false, "short: usdc -> wbtc") // prettier-ignore

  const positions = await reader.getPositions(
    account.target,
    [gmxV1.target, mux.target],
    [WETH, WBTC, USDC],
    [WETH, WBTC]
  );
  console.log(`- positions: ${positions}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
