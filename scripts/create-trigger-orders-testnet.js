const { ethers } = require("hardhat");
const { deploy } = require("../test/fixture/setup");

async function main() {
  const {
    user,
    gmxV1,
    mux,
    exchange,
    warehouse,
    reader,
    quoter,
    account,
    WETH,
    WBTC,
    USDC,
    minExecutionFee,
    faucet,
    setPrice,
    replaceFastPriceFeedAndSetPrice,
    replaceOracleReferenceAndSetPrice,
    executeIncreasePosition,
    fillPositionOrder,
  } = await deploy();
  console.log(`
- user     : ${user.address}
- gmxV1    : ${gmxV1.target}
- mux      : ${mux.target}
- exchange : ${exchange.target}
- warehouse: ${warehouse.target}
- reader   : ${reader.target}
- quoter   : ${quoter.target}
- account  : ${account.target}
  `);

  console.log("`faucet`");
  await faucet(WBTC, ethers.parseUnits("100", 8));
  await faucet(USDC, ethers.parseUnits("1000000", 6));

  const depositAndIncreasePosition = async (
    collateral,
    index,
    collateralAmount,
    size,
    isLong,
    description
  ) => {
    const gmxOrder = await gmxV1.makePositionOrder(
      collateral,
      index,
      collateralAmount / 2n,
      size,
      isLong
    );
    const muxOrder = await mux.makePositionOrder(
      collateral,
      index,
      collateralAmount / 2n,
      size,
      isLong
    );

    if (collateral == WETH) {
      await account
        .connect(user)
        .deposit(ethers.ZeroAddress, collateralAmount, {
          value: collateralAmount,
        });
    } else {
      const token = await ethers.getContractAt("IERC20", collateral);
      await token.connect(user).approve(account.target, collateralAmount);
      await account.connect(user).deposit(collateral, collateralAmount);
    }

    await account.connect(user).createMarketOrders(
      [gmxV1.target],
      [
        {
          orderType: gmxOrder.orderType,
          path: [...gmxOrder.path],
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
    await account.connect(user).createMarketOrders(
      [mux.target],
      [
        {
          orderType: muxOrder.orderType,
          path: [...muxOrder.path],
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
    await executeIncreasePosition(account.target);
    await fillPositionOrder();

    const gmxV1Position = await gmxV1.getPosition(account.target, isLong ? index : USDC, index, isLong); // prettier-ignore
    const muxPosition =     await mux.getPosition(account.target, collateral,            index, isLong); // prettier-ignore
    console.log("\n- " + description);
    console.log(`  - position(gmx): ${gmxV1Position}`);
    console.log(`  - position(mux): ${muxPosition}`);
  };

  await replaceFastPriceFeedAndSetPrice(WETH, ethers.parseUnits("2000", 30), ethers.parseUnits("2000", 30)); // prettier-ignore
  await setPrice(WBTC, ethers.parseUnits("40000", 30), ethers.parseUnits("40000", 30)); // prettier-ignore
  await setPrice(USDC, ethers.parseUnits("1", 30), ethers.parseUnits("1", 30)); // prettier-ignore

  await replaceOracleReferenceAndSetPrice(WETH, ethers.parseUnits("2000", 8)); // prettier-ignore
  await replaceOracleReferenceAndSetPrice(WBTC, ethers.parseUnits("40000", 8)); // prettier-ignore
  await replaceOracleReferenceAndSetPrice(USDC, ethers.parseUnits("1", 8)); // prettier-ignore

  // long weth market
  await depositAndIncreasePosition(WETH, WETH, ethers.parseEther("1"),       ethers.parseEther("10"), true, "long: weth -> weth") // prettier-ignore
  await depositAndIncreasePosition(WBTC, WETH, ethers.parseUnits("0.1", 8),  ethers.parseEther("10"), true, "long: wbtc -> weth") // prettier-ignore
  await depositAndIncreasePosition(USDC, WETH, ethers.parseUnits("1000", 6), ethers.parseEther("10"), true, "long: usdc -> weth") // prettier-ignore
  // long wbtc market
  await depositAndIncreasePosition(WETH, WBTC, ethers.parseEther("1"),       ethers.parseUnits("1", 8), true, "long: weth -> wbtc") // prettier-ignore
  await depositAndIncreasePosition(WBTC, WBTC, ethers.parseUnits("0.1", 8),  ethers.parseUnits("1", 8), true, "long: wbtc -> wbtc") // prettier-ignore
  await depositAndIncreasePosition(USDC, WBTC, ethers.parseUnits("1000", 6), ethers.parseUnits("1", 8), true, "long: usdc -> wbtc") // prettier-ignore
  // short weth market
  await depositAndIncreasePosition(WETH, WETH, ethers.parseEther("10"),      ethers.parseEther("10"), false, "short: weth -> weth") // prettier-ignore
  await depositAndIncreasePosition(WBTC, WETH, ethers.parseUnits("0.1", 8),  ethers.parseEther("10"), false, "short: wbtc -> weth") // prettier-ignore
  await depositAndIncreasePosition(USDC, WETH, ethers.parseUnits("1000", 6), ethers.parseEther("10"), false, "short: usdc -> weth") // prettier-ignore
  // short wbtc market
  await depositAndIncreasePosition(WETH, WBTC, ethers.parseEther("10"),      ethers.parseUnits("1", 8), false, "short: weth -> wbtc") // prettier-ignore
  await depositAndIncreasePosition(WBTC, WBTC, ethers.parseUnits("0.1", 8),  ethers.parseUnits("1", 8), false, "short: wbtc -> wbtc") // prettier-ignore
  await depositAndIncreasePosition(USDC, WBTC, ethers.parseUnits("1000", 6), ethers.parseUnits("1", 8), false, "short: usdc -> wbtc") // prettier-ignore

  // multiple pending trigger orders.

  // gmx V1
  var tpPrice = ethers.parseUnits("2000", 30) + 1n;
  var slPrice = ethers.parseUnits("2000", 30) - 1n;
  var tpPriceBound = tpPrice - 1n;
  var slPriceBound = slPrice - 1n;
  await account.connect(user).createTriggerOrder(gmxV1.target, WETH, WETH, true, ethers.parseEther("10"), tpPrice, tpPriceBound, slPrice, slPriceBound, minExecutionFee, { value: minExecutionFee }); // prettier-ignore
  await account.connect(user).createTriggerOrder(gmxV1.target, WETH, WETH, true, ethers.parseEther("10"), tpPrice, tpPriceBound, 0, 0, minExecutionFee, { value: minExecutionFee }); // prettier-ignore
  await account.connect(user).createTriggerOrder(gmxV1.target, WETH, WETH, true, ethers.parseEther("10"), 0, 0, slPrice, slPriceBound, minExecutionFee, { value: minExecutionFee }); // prettier-ignore
  // // mux
  var tpPrice = ethers.parseUnits("2000", 18) + 1n;
  var slPrice = ethers.parseUnits("2000", 18) - 1n;
  var tpPriceBound = tpPrice - 1n;
  var slPriceBound = slPrice - 1n;
  await account.connect(user).createTriggerOrder(mux.target, WETH, WETH, true, ethers.parseEther("10"), tpPrice, tpPriceBound, slPrice, slPriceBound, minExecutionFee, { value: minExecutionFee }); // prettier-ignore
  await account.connect(user).createTriggerOrder(mux.target, WBTC, WETH, true, ethers.parseEther("10"), tpPrice, tpPriceBound, 0, 0, minExecutionFee, { value: minExecutionFee }); // prettier-ignore
  await account.connect(user).createTriggerOrder(mux.target, USDC, WETH, true, ethers.parseEther("10"), 0, 0, slPrice, slPriceBound, minExecutionFee, { value: minExecutionFee }); // prettier-ignore

  const positions = await reader.getPositions(
    account.target,
    [gmxV1.target, mux.target],
    [WETH, WBTC, USDC],
    [WETH, WBTC]
  );
  console.log(positions.map((position) => position.pendingTriggerOrders));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
