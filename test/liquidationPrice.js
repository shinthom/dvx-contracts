const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { deploy } = require("./fixture");

describe("liquidationPrice", () => {
  it("gmx v1", async () => {
    const {
      account,
      gmxV1Adapter,
      WETH,
      WBTC,
      USDC,
      setDummyPrice,
      deposit,
      increasePosition,
    } = await loadFixture(deploy);
    await setDummyPrice();
    // long eth market
    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;
    var acceptablePrice = ethers.parseUnits("2000", 18);
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(gmxV1Adapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    var liquidationPrice = await gmxV1Adapter.getLiquidationPrice(account.target, collateral, index, isLong); // prettier-ignore
    console.log(liquidationPrice);
    // short eth market
    var collateral = USDC;
    var collateralAmount = ethers.parseUnits("2000", 6);
    var isLong = false;
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(gmxV1Adapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    var liquidationPrice = await gmxV1Adapter.getLiquidationPrice(account.target, collateral, index, isLong); // prettier-ignore
    console.log(liquidationPrice);
    // long btc market
    var collateral = WBTC;
    var index = WBTC;
    var collateralAmount = ethers.parseUnits("0.05", 8);
    var size = ethers.parseUnits("0.5", 8);
    var isLong = true;
    var acceptablePrice = ethers.parseUnits("40000", 18);
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(gmxV1Adapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    var liquidationPrice = await gmxV1Adapter.getLiquidationPrice(account.target, collateral, index, isLong); // prettier-ignore
    console.log(liquidationPrice);
    // short btc market
    var collateral = USDC;
    var collateralAmount = ethers.parseUnits("2000", 6);
    var isLong = false;
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(gmxV1Adapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    var liquidationPrice = await gmxV1Adapter.getLiquidationPrice(account.target, collateral, index, isLong); // prettier-ignore
    console.log(liquidationPrice);
  });

  it("mux", async () => {
    const {
      account,
      muxAdapter,
      WETH,
      WBTC,
      USDC,
      setDummyPrice,
      deposit,
      increasePosition,
    } = await loadFixture(deploy);
    await setDummyPrice();
    // long eth market - weth
    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;
    var acceptablePrice = ethers.parseUnits("2000", 18);
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(muxAdapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    var liquidationPrice = await muxAdapter.getLiquidationPrice(account.target, collateral, index, isLong); // prettier-ignore
    console.log(liquidationPrice);
    // long eth market - wbtc
    var collateral = WBTC;
    var collateralAmount = ethers.parseUnits("0.05", 8);
    var isLong = true;
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(muxAdapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    var liquidationPrice = await muxAdapter.getLiquidationPrice(account.target, collateral, index, isLong); // prettier-ignore
    console.log(liquidationPrice);
    // long eth market - usdc
    var collateral = USDC;
    var collateralAmount = ethers.parseUnits("2000", 6);
    var isLong = true;
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(muxAdapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    var liquidationPrice = await muxAdapter.getLiquidationPrice(account.target, collateral, index, isLong); // prettier-ignore
    console.log(liquidationPrice);
    // short eth market - weth
    var collateral = WETH;
    var collateralAmount = ethers.parseEther("1");
    var isLong = false;
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(muxAdapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    var liquidationPrice = await muxAdapter.getLiquidationPrice(account.target, collateral, index, isLong); // prettier-ignore
    console.log(liquidationPrice);
    // short eth market - wbtc
    var collateral = WBTC;
    var collateralAmount = ethers.parseUnits("0.05", 8);
    var isLong = false;
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(muxAdapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    var liquidationPrice = await muxAdapter.getLiquidationPrice(account.target, collateral, index, isLong); // prettier-ignore
    console.log(liquidationPrice);
    // short eth market - usdc
    var collateral = USDC;
    var collateralAmount = ethers.parseUnits("2000", 6);
    var isLong = false;
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(muxAdapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    var liquidationPrice = await muxAdapter.getLiquidationPrice(account.target, collateral, index, isLong); // prettier-ignore
    console.log(liquidationPrice);

    // long btc market - weth
    var collateral = WETH;
    var index = WBTC;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseUnits("0.1", 8);
    var isLong = true;
    var acceptablePrice = ethers.parseUnits("2000", 18);
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(muxAdapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    var liquidationPrice = await muxAdapter.getLiquidationPrice(account.target, collateral, index, isLong); // prettier-ignore
    console.log(liquidationPrice);
    // long btc market - wbtc
    var collateral = WBTC;
    var collateralAmount = ethers.parseUnits("0.05", 8);
    var isLong = true;
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(muxAdapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    var liquidationPrice = await muxAdapter.getLiquidationPrice(account.target, collateral, index, isLong); // prettier-ignore
    console.log(liquidationPrice);
    // long btc market - usdc
    var collateral = USDC;
    var collateralAmount = ethers.parseUnits("2000", 6);
    var isLong = true;
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(muxAdapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    var liquidationPrice = await muxAdapter.getLiquidationPrice(account.target, collateral, index, isLong); // prettier-ignore
    console.log(liquidationPrice);
    // short btc market - weth
    var collateral = WETH;
    var collateralAmount = ethers.parseEther("1");
    var isLong = false;
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(muxAdapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    var liquidationPrice = await muxAdapter.getLiquidationPrice(account.target, collateral, index, isLong); // prettier-ignore
    console.log(liquidationPrice);
    // short btc market - wbtc
    var collateral = WBTC;
    var collateralAmount = ethers.parseUnits("0.05", 8);
    var isLong = false;
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(muxAdapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    var liquidationPrice = await muxAdapter.getLiquidationPrice(account.target, collateral, index, isLong); // prettier-ignore
    console.log(liquidationPrice);
    // short btc market - usdc
    var collateral = USDC;
    var collateralAmount = ethers.parseUnits("2000", 6);
    var isLong = false;
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(muxAdapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    var liquidationPrice = await muxAdapter.getLiquidationPrice(account.target, collateral, index, isLong); // prettier-ignore
    console.log(liquidationPrice);
  });

  describe("estimate", () => {
    it("gmxV1", async () => {
      const { account, gmxV1Adapter, WETH, WBTC, USDC, setDummyPrice } =
        await loadFixture(deploy);
      await setDummyPrice();
      // long eth market
      var collateral = WETH;
      var index = WETH;
      var collateralAmount = ethers.parseEther("1");
      var size = ethers.parseEther("10");
      var isLong = true;
      var estimatedLiquidationPrice =
        await gmxV1Adapter.estimateLiquidationPrice(
          account.target,
          collateral,
          index,
          collateralAmount,
          size,
          isLong
        );
      console.log(estimatedLiquidationPrice);
      // short eth market
      var collateral = USDC;
      var collateralAmount = ethers.parseUnits("2000", 6);
      var isLong = false;
      var estimatedLiquidationPrice =
        await gmxV1Adapter.estimateLiquidationPrice(
          account.target,
          collateral,
          index,
          collateralAmount,
          size,
          isLong
        );
      console.log(estimatedLiquidationPrice);
      // long btc market
      var collateral = WBTC;
      var index = WBTC;
      var collateralAmount = ethers.parseUnits("0.05", 8);
      var size = ethers.parseUnits("0.5", 8);
      var isLong = true;
      var estimatedLiquidationPrice =
        await gmxV1Adapter.estimateLiquidationPrice(
          account.target,
          collateral,
          index,
          collateralAmount,
          size,
          isLong
        );
      console.log(estimatedLiquidationPrice);
      // short btc market
      var collateral = USDC;
      var collateralAmount = ethers.parseUnits("2000", 6);
      var isLong = false;
      var estimatedLiquidationPrice =
        await gmxV1Adapter.estimateLiquidationPrice(
          account.target,
          collateral,
          index,
          collateralAmount,
          size,
          isLong
        );
      console.log(estimatedLiquidationPrice);
    });

    it("mux", async () => {
      const { account, muxAdapter, WETH, WBTC, USDC, setDummyPrice } =
        await loadFixture(deploy);
      await setDummyPrice();
      // long eth market - weth
      var collateral = WETH;
      var index = WETH;
      var collateralAmount = ethers.parseEther("1");
      var size = ethers.parseEther("10");
      var isLong = true;
      var estimatedLiquidationPrice = await muxAdapter.estimateLiquidationPrice(
        account.target,
        collateral,
        index,
        collateralAmount,
        size,
        isLong
      );
      console.log(estimatedLiquidationPrice);
      // long eth market - wbtc
      var collateral = WBTC;
      var collateralAmount = ethers.parseUnits("0.05", 8);
      var isLong = true;
      var estimatedLiquidationPrice = await muxAdapter.estimateLiquidationPrice(
        account.target,
        collateral,
        index,
        collateralAmount,
        size,
        isLong
      );
      console.log(estimatedLiquidationPrice);
      // long eth market - usdc
      var collateral = USDC;
      var collateralAmount = ethers.parseUnits("2000", 6);
      var isLong = true;
      var estimatedLiquidationPrice = await muxAdapter.estimateLiquidationPrice(
        account.target,
        collateral,
        index,
        collateralAmount,
        size,
        isLong
      );
      console.log(estimatedLiquidationPrice);
      // short eth market - weth
      var collateral = WETH;
      var collateralAmount = ethers.parseEther("1");
      var isLong = false;
      var estimatedLiquidationPrice = await muxAdapter.estimateLiquidationPrice(
        account.target,
        collateral,
        index,
        collateralAmount,
        size,
        isLong
      );
      console.log(estimatedLiquidationPrice);
      // short eth market - wbtc
      var collateral = WBTC;
      var collateralAmount = ethers.parseUnits("0.05", 8);
      var isLong = false;
      var estimatedLiquidationPrice = await muxAdapter.estimateLiquidationPrice(
        account.target,
        collateral,
        index,
        collateralAmount,
        size,
        isLong
      );
      console.log(estimatedLiquidationPrice);
      // short eth market - usdc
      var collateral = USDC;
      var collateralAmount = ethers.parseUnits("2000", 6);
      var isLong = false;
      var estimatedLiquidationPrice = await muxAdapter.estimateLiquidationPrice(
        account.target,
        collateral,
        index,
        collateralAmount,
        size,
        isLong
      );
      console.log(estimatedLiquidationPrice);

      // long btc market - weth
      var collateral = WETH;
      var index = WBTC;
      var collateralAmount = ethers.parseEther("1");
      var size = ethers.parseUnits("0.1", 8);
      var isLong = true;
      var estimatedLiquidationPrice = await muxAdapter.estimateLiquidationPrice(
        account.target,
        collateral,
        index,
        collateralAmount,
        size,
        isLong
      );
      console.log(estimatedLiquidationPrice);
      // long btc market - wbtc
      var collateral = WBTC;
      var collateralAmount = ethers.parseUnits("0.05", 8);
      var isLong = true;
      var estimatedLiquidationPrice = await muxAdapter.estimateLiquidationPrice(
        account.target,
        collateral,
        index,
        collateralAmount,
        size,
        isLong
      );
      console.log(estimatedLiquidationPrice);
      // long btc market - usdc
      var collateral = USDC;
      var collateralAmount = ethers.parseUnits("2000", 6);
      var isLong = true;
      var estimatedLiquidationPrice = await muxAdapter.estimateLiquidationPrice(
        account.target,
        collateral,
        index,
        collateralAmount,
        size,
        isLong
      );
      console.log(estimatedLiquidationPrice);
      // short btc market - weth
      var collateral = WETH;
      var collateralAmount = ethers.parseEther("1");
      var isLong = false;
      var estimatedLiquidationPrice = await muxAdapter.estimateLiquidationPrice(
        account.target,
        collateral,
        index,
        collateralAmount,
        size,
        isLong
      );
      console.log(estimatedLiquidationPrice);
      // short btc market - wbtc
      var collateral = WBTC;
      var collateralAmount = ethers.parseUnits("0.05", 8);
      var isLong = false;
      var estimatedLiquidationPrice = await muxAdapter.estimateLiquidationPrice(
        account.target,
        collateral,
        index,
        collateralAmount,
        size,
        isLong
      );
      console.log(estimatedLiquidationPrice);
      // short btc market - usdc
      var collateral = USDC;
      var collateralAmount = ethers.parseUnits("2000", 6);
      var isLong = false;
      var estimatedLiquidationPrice = await muxAdapter.estimateLiquidationPrice(
        account.target,
        collateral,
        index,
        collateralAmount,
        size,
        isLong
      );
      console.log(estimatedLiquidationPrice);
    });
  });
});
