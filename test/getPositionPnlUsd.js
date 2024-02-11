const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("./fixture");

describe("getWrapPositionPnlUsd", async () => {
  it("gmxV1", async () => {
    const {
      account,
      gmxV1Adapter,
      WETH,
      WBTC,
      USDC,
      checkBalance,
      checkPosition,
      deposit,
      setDummyPrice,
      setPrice,
      increasePosition,
    } = await loadFixture(deploy);
    await setDummyPrice();

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;
    var acceptablePrice = 0;

    await deposit(collateral, collateralAmount);
    await checkBalance(account);
    await checkPosition(gmxV1Adapter, account, collateral, index, isLong);

    await increasePosition(gmxV1Adapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    await checkBalance(account);
    await checkPosition(gmxV1Adapter, account, collateral, index, isLong);

    // [market: WETH, position: long, status: profit]
    var price = ethers.parseUnits("2200", 30);
    await setPrice(gmxV1Adapter, index, price, price, true);
    var positionPnlUsd = await gmxV1Adapter.getWrapPositionPnlUsd(
      account.target,
      collateral,
      index,
      isLong
    );
    console.log("positionPnlUsd", positionPnlUsd);

    // [market: WETH, position: long, status: loss]
    var price = ethers.parseUnits("1800", 30);
    await setPrice(gmxV1Adapter, index, price, price, true);
    var positionPnlUsd = await gmxV1Adapter.getWrapPositionPnlUsd(
      account.target,
      collateral,
      index,
      isLong
    );
    console.log("positionPnlUsd", positionPnlUsd);

    var collateral = WBTC;
    var index = WBTC;
    var collateralAmount = ethers.parseUnits("0.1", 8);
    var size = ethers.parseUnits("1", 8);
    var isLong = true;

    await deposit(collateral, collateralAmount);
    await checkBalance(account);
    await checkPosition(gmxV1Adapter, account, collateral, index, isLong);

    await increasePosition(gmxV1Adapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    await checkBalance(account);
    await checkPosition(gmxV1Adapter, account, collateral, index, isLong);

    // [market: WBTC, position: long, status: profit]
    var price = ethers.parseUnits("44000", 30);
    await setPrice(gmxV1Adapter, index, price, price, true);
    var positionPnlUsd = await gmxV1Adapter.getWrapPositionPnlUsd(
      account.target,
      collateral,
      index,
      isLong
    );
    console.log("positionPnlUsd", positionPnlUsd);

    // [market: WBTC, position: long, status: loss]
    var price = ethers.parseUnits("36000", 30);
    await setPrice(gmxV1Adapter, index, price, price, true);
    var positionPnlUsd = await gmxV1Adapter.getWrapPositionPnlUsd(
      account.target,
      collateral,
      index,
      isLong
    );
    console.log("positionPnlUsd", positionPnlUsd);

    var collateral = USDC;
    var index = WETH;
    var collateralAmount = ethers.parseUnits("100", 6);
    var size = ethers.parseEther("1");
    var isLong = false;

    await deposit(collateral, collateralAmount);
    await checkBalance(account);
    await checkPosition(gmxV1Adapter, account, collateral, index, isLong);

    await increasePosition(gmxV1Adapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    await checkBalance(account);
    await checkPosition(gmxV1Adapter, account, collateral, index, isLong);

    // [market: WETH, position: short, status: profit]
    var price = ethers.parseUnits("1800", 30);
    await setPrice(gmxV1Adapter, index, price, price, true);
    var positionPnlUsd = await gmxV1Adapter.getWrapPositionPnlUsd(
      account.target,
      collateral,
      index,
      isLong
    );
    console.log("positionPnlUsd", positionPnlUsd);

    // [market: WETH, position: short, status: loss]
    var price = ethers.parseUnits("2200", 30);
    await setPrice(gmxV1Adapter, index, price, price, true);
    var positionPnlUsd = await gmxV1Adapter.getWrapPositionPnlUsd(
      account.target,
      collateral,
      index,
      isLong
    );
    console.log("positionPnlUsd", positionPnlUsd);

    var collateral = USDC;
    var index = WBTC;
    var collateralAmount = ethers.parseUnits("100", 6);
    var size = ethers.parseUnits("0.1", 8);
    var isLong = false;

    await deposit(collateral, collateralAmount);
    await checkBalance(account);
    await checkPosition(gmxV1Adapter, account, collateral, index, isLong);

    await increasePosition(gmxV1Adapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    await checkBalance(account);
    await checkPosition(gmxV1Adapter, account, collateral, index, isLong);

    // [market: WBTC, position: short, status: profit]
    var price = ethers.parseUnits("36000", 30);
    await setPrice(gmxV1Adapter, index, price, price, true);
    var positionPnlUsd = await gmxV1Adapter.getWrapPositionPnlUsd(
      account.target,
      collateral,
      index,
      isLong
    );
    console.log("positionPnlUsd", positionPnlUsd);

    // [market: WBTC, position: short, status: loss]
    var price = ethers.parseUnits("44000", 30);
    await setPrice(gmxV1Adapter, index, price, price, true);
    var positionPnlUsd = await gmxV1Adapter.getWrapPositionPnlUsd(
      account.target,
      collateral,
      index,
      isLong
    );
    console.log("positionPnlUsd", positionPnlUsd);
  });

  it("mux", async () => {
    const {
      account,
      muxAdapter,
      WETH,
      WBTC,
      USDC,
      checkBalance,
      checkPosition,
      deposit,
      setDummyPrice,
      setPrice,
      increasePosition,
    } = await loadFixture(deploy);
    await setDummyPrice();

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;
    var acceptablePrice = 0;

    await deposit(collateral, collateralAmount);
    await checkBalance(account);
    await checkPosition(muxAdapter, account, collateral, index, isLong);

    await increasePosition(muxAdapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    await checkBalance(account);
    await checkPosition(muxAdapter, account, collateral, index, isLong);

    // [market: WETH, position: long, status: profit]
    var price = ethers.parseUnits("2200", 8);
    await setPrice(muxAdapter, index, price, price, true);
    var positionPnlUsd = await muxAdapter.getWrapPositionPnlUsd(
      account.target,
      collateral,
      index,
      isLong
    );
    console.log("positionPnlUsd", positionPnlUsd);

    // [market: WETH, position: long, status: loss]
    var price = ethers.parseUnits("1800", 8);
    await setPrice(muxAdapter, index, price, price, true);
    var positionPnlUsd = await muxAdapter.getWrapPositionPnlUsd(
      account.target,
      collateral,
      index,
      isLong
    );
    console.log("positionPnlUsd", positionPnlUsd);

    var collateral = WBTC;
    var index = WBTC;
    var collateralAmount = ethers.parseUnits("0.1", 8);
    var size = ethers.parseUnits("1", 8);
    var isLong = true;

    await deposit(collateral, collateralAmount);
    await checkBalance(account);
    await checkPosition(muxAdapter, account, collateral, index, isLong);

    await increasePosition(muxAdapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    await checkBalance(account);
    await checkPosition(muxAdapter, account, collateral, index, isLong);

    // [market: WBTC, position: long, status: profit]
    var price = ethers.parseUnits("44000", 8);
    await setPrice(muxAdapter, index, price, price, true);
    var positionPnlUsd = await muxAdapter.getWrapPositionPnlUsd(
      account.target,
      collateral,
      index,
      isLong
    );
    console.log("positionPnlUsd", positionPnlUsd);

    // [market: WBTC, position: long, status: loss]
    var price = ethers.parseUnits("36000", 8);
    await setPrice(muxAdapter, index, price, price, true);
    var positionPnlUsd = await muxAdapter.getWrapPositionPnlUsd(
      account.target,
      collateral,
      index,
      isLong
    );
    console.log("positionPnlUsd", positionPnlUsd);

    var collateral = USDC;
    var index = WETH;
    var collateralAmount = ethers.parseUnits("100", 6);
    var size = ethers.parseEther("1");
    var isLong = false;

    await deposit(collateral, collateralAmount);
    await checkBalance(account);
    await checkPosition(muxAdapter, account, collateral, index, isLong);

    await increasePosition(muxAdapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    await checkBalance(account);
    await checkPosition(muxAdapter, account, collateral, index, isLong);

    // [market: WETH, position: short, status: profit]
    var price = ethers.parseUnits("1800", 8);
    await setPrice(muxAdapter, index, price, price, true);
    var positionPnlUsd = await muxAdapter.getWrapPositionPnlUsd(
      account.target,
      collateral,
      index,
      isLong
    );
    console.log("positionPnlUsd", positionPnlUsd);

    // [market: WETH, position: short, status: loss]
    var price = ethers.parseUnits("2200", 8);
    await setPrice(muxAdapter, index, price, price, true);
    var positionPnlUsd = await muxAdapter.getWrapPositionPnlUsd(
      account.target,
      collateral,
      index,
      isLong
    );
    console.log("positionPnlUsd", positionPnlUsd);

    var collateral = USDC;
    var index = WBTC;
    var collateralAmount = ethers.parseUnits("100", 6);
    var size = ethers.parseUnits("0.1", 8);
    var isLong = false;

    await deposit(collateral, collateralAmount);
    await checkBalance(account);
    await checkPosition(muxAdapter, account, collateral, index, isLong);

    await increasePosition(muxAdapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    await checkBalance(account);
    await checkPosition(muxAdapter, account, collateral, index, isLong);

    // [market: WBTC, position: short, status: profit]
    var price = ethers.parseUnits("36000", 8);
    await setPrice(muxAdapter, index, price, price, true);
    var positionPnlUsd = await muxAdapter.getWrapPositionPnlUsd(
      account.target,
      collateral,
      index,
      isLong
    );
    console.log("positionPnlUsd", positionPnlUsd);

    // [market: WBTC, position: short, status: loss]
    var price = ethers.parseUnits("44000", 8);
    await setPrice(muxAdapter, index, price, price, true);
    var positionPnlUsd = await muxAdapter.getWrapPositionPnlUsd(
      account.target,
      collateral,
      index,
      isLong
    );
    console.log("positionPnlUsd", positionPnlUsd);
  });
});
