const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { deploy } = require("../fixture");

describe("positionPnlUsd", () => {
  const expectedPnl = ethers.parseUnits("2000", 18);

  it("gmx v1", async () => {
    const {
      account,
      gmxV1Adapter,
      WETH,
      WBTC,
      USDC,
      setDummyPrice,
      setPrice,
      deposit,
      increasePosition,
    } = await loadFixture(deploy);
    // long eth market
    await setDummyPrice();
    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;
    var acceptablePrice = ethers.parseUnits("2000", 18);
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(gmxV1Adapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    var price = ethers.parseUnits("2200", 30);
    await setPrice(gmxV1Adapter, WETH, price, price, false);
    var [ hasProfit, profit ] = await gmxV1Adapter.getWrapPositionPnlUsd(account.target, collateral, index, isLong); // prettier-ignore
    expect(hasProfit).to.be.true;
    expect(profit).to.be.equal(expectedPnl);
    var price = ethers.parseUnits("1800", 30);
    await setPrice(gmxV1Adapter, WETH, price, price, false);
    var [ hasProfit, loss ] = await gmxV1Adapter.getWrapPositionPnlUsd(account.target, collateral, index, isLong); // prettier-ignore
    expect(hasProfit).to.be.false;
    expect(loss).to.be.equal(expectedPnl);
    // short eth market
    await setDummyPrice();
    var collateral = USDC;
    var collateralAmount = ethers.parseUnits("2000", 6);
    var isLong = false;
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(gmxV1Adapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    var price = ethers.parseUnits("1800", 30);
    await setPrice(gmxV1Adapter, WETH, price, price, false);
    var [ hasProfit, profit ] = await gmxV1Adapter.getWrapPositionPnlUsd(account.target, collateral, index, isLong); // prettier-ignore
    expect(hasProfit).to.be.true;
    expect(profit).to.be.equal(expectedPnl);
    var price = ethers.parseUnits("2200", 30);
    await setPrice(gmxV1Adapter, WETH, price, price, false);
    var [ hasProfit, loss ] = await gmxV1Adapter.getWrapPositionPnlUsd(account.target, collateral, index, isLong); // prettier-ignore
    expect(hasProfit).to.be.false;
    expect(loss).to.be.equal(expectedPnl);
    // long btc market
    await setDummyPrice();
    var collateral = WBTC;
    var index = WBTC;
    var collateralAmount = ethers.parseUnits("0.05", 8);
    var size = ethers.parseUnits("0.5", 8);
    var isLong = true;
    var acceptablePrice = ethers.parseUnits("40000", 18);
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(gmxV1Adapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    var price = ethers.parseUnits("44000", 30);
    await setPrice(gmxV1Adapter, WBTC, price, price, false);
    var [ hasProfit, profit ] = await gmxV1Adapter.getWrapPositionPnlUsd(account.target, collateral, index, isLong); // prettier-ignore
    expect(hasProfit).to.be.true;
    expect(profit).to.be.equal(expectedPnl);
    var price = ethers.parseUnits("36000", 30);
    await setPrice(gmxV1Adapter, WBTC, price, price, false);
    var [ hasProfit, loss ] = await gmxV1Adapter.getWrapPositionPnlUsd(account.target, collateral, index, isLong); // prettier-ignore
    expect(hasProfit).to.be.false;
    expect(loss).to.be.equal(expectedPnl);
    // short btc market
    await setDummyPrice();
    var collateral = USDC;
    var index = WBTC;
    var collateralAmount = ethers.parseUnits("2000", 6);
    var size = ethers.parseUnits("0.5", 8);
    var isLong = false;
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(gmxV1Adapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    var price = ethers.parseUnits("36000", 30);
    await setPrice(gmxV1Adapter, WBTC, price, price, false);
    var [ hasProfit, profit ] = await gmxV1Adapter.getWrapPositionPnlUsd(account.target, collateral, index, isLong); // prettier-ignore
    expect(hasProfit).to.be.true;
    expect(profit).to.be.equal(expectedPnl);
    var price = ethers.parseUnits("44000", 30);
    await setPrice(gmxV1Adapter, WBTC, price, price, false);
    var [ hasProfit, loss ] = await gmxV1Adapter.getWrapPositionPnlUsd(account.target, collateral, index, isLong); // prettier-ignore
    expect(hasProfit).to.be.false;
    expect(loss).to.be.equal(expectedPnl);
  });

  it("mux", async () => {
    const {
      account,
      muxAdapter,
      WETH,
      WBTC,
      USDC,
      setDummyPrice,
      setPrice,
      deposit,
      increasePosition,
    } = await loadFixture(deploy);
    // long eth market
    await setDummyPrice();
    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;
    var acceptablePrice = ethers.parseUnits("2000", 18);
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(muxAdapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    var price = ethers.parseUnits("2200", 8);
    await setPrice(muxAdapter, WETH, price, price, false);
    var [ hasProfit, profit ] = await muxAdapter.getWrapPositionPnlUsd(account.target, collateral, index, isLong); // prettier-ignore
    expect(hasProfit).to.be.true;
    expect(profit).to.be.equal(expectedPnl);
    var price = ethers.parseUnits("1800", 8);
    await setPrice(muxAdapter, WETH, price, price, false);
    var [ hasProfit, loss ] = await muxAdapter.getWrapPositionPnlUsd(account.target, collateral, index, isLong); // prettier-ignore
    expect(hasProfit).to.be.false;
    expect(loss).to.be.equal(expectedPnl);
    // short eth market
    await setDummyPrice();
    var collateral = USDC;
    var collateralAmount = ethers.parseUnits("2000", 6);
    var isLong = false;
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(muxAdapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    var price = ethers.parseUnits("1800", 8);
    await setPrice(muxAdapter, WETH, price, price, false);
    var [ hasProfit, profit ] = await muxAdapter.getWrapPositionPnlUsd(account.target, collateral, index, isLong); // prettier-ignore
    expect(hasProfit).to.be.true;
    expect(profit).to.be.equal(expectedPnl);
    var price = ethers.parseUnits("2200", 8);
    await setPrice(muxAdapter, WETH, price, price, false);
    var [ hasProfit, loss ] = await muxAdapter.getWrapPositionPnlUsd(account.target, collateral, index, isLong); // prettier-ignore
    expect(hasProfit).to.be.false;
    expect(loss).to.be.equal(expectedPnl);
    // long btc market
    await setDummyPrice();
    var collateral = WBTC;
    var index = WBTC;
    var collateralAmount = ethers.parseUnits("0.05", 8);
    var size = ethers.parseUnits("0.5", 8);
    var isLong = true;
    var acceptablePrice = ethers.parseUnits("40000", 18);
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(muxAdapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    var price = ethers.parseUnits("44000", 8);
    await setPrice(muxAdapter, WBTC, price, price, false);
    var [ hasProfit, profit ] = await muxAdapter.getWrapPositionPnlUsd(account.target, collateral, index, isLong); // prettier-ignore
    expect(hasProfit).to.be.true;
    expect(profit).to.be.equal(expectedPnl);
    var price = ethers.parseUnits("36000", 8);
    await setPrice(muxAdapter, WBTC, price, price, false);
    var [ hasProfit, loss ] = await muxAdapter.getWrapPositionPnlUsd(account.target, collateral, index, isLong); // prettier-ignore
    expect(hasProfit).to.be.false;
    expect(loss).to.be.equal(expectedPnl);
    // short btc market
    await setDummyPrice();
    var collateral = USDC;
    var index = WBTC;
    var collateralAmount = ethers.parseUnits("2000", 6);
    var size = ethers.parseUnits("0.5", 8);
    var isLong = false;
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(muxAdapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    var price = ethers.parseUnits("36000", 8);
    await setPrice(muxAdapter, WBTC, price, price, false);
    var [ hasProfit, profit ] = await muxAdapter.getWrapPositionPnlUsd(account.target, collateral, index, isLong); // prettier-ignore
    expect(hasProfit).to.be.true;
    expect(profit).to.be.equal(expectedPnl);
    var price = ethers.parseUnits("44000", 8);
    await setPrice(muxAdapter, WBTC, price, price, false);
    var [ hasProfit, loss ] = await muxAdapter.getWrapPositionPnlUsd(account.target, collateral, index, isLong); // prettier-ignore
    expect(hasProfit).to.be.false;
    expect(loss).to.be.equal(expectedPnl);
  });
});
