const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture");

describe("realizeProfit", () => {
  it("change dynamically price", async () => {
    const {
      gmxV1Adapter,
      muxAdapter,
      quoter,
      account,
      WETH,
      WBTC,
      USDC,
      setPrice,
    } = await loadFixture(deploy);

    var ethPrice = ethers.parseUnits("2000", 30);
    var btcPrice = ethers.parseUnits("40000", 30);
    var usdcPrice = ethers.parseUnits("1", 30);
    await setPrice(gmxV1Adapter, WETH, ethPrice, ethPrice, false);
    await setPrice(gmxV1Adapter, WBTC, btcPrice, btcPrice, true);
    await setPrice(gmxV1Adapter, USDC, usdcPrice, usdcPrice, true);
    expect(await gmxV1Adapter.getPrice(WETH, true)).to.be.equal(ethPrice);
    expect(await gmxV1Adapter.getPrice(WBTC, true)).to.be.equal(btcPrice);
    expect(await gmxV1Adapter.getPrice(USDC, true)).to.be.equal(usdcPrice);

    var ethPrice = ethers.parseUnits("2200", 30);
    var btcPrice = ethers.parseUnits("44000", 30);
    await setPrice(gmxV1Adapter, WETH, ethPrice, ethPrice, true);
    await setPrice(gmxV1Adapter, WBTC, btcPrice, btcPrice, true);
    expect(await gmxV1Adapter.getPrice(WETH, true)).to.be.equal(ethPrice);
    expect(await gmxV1Adapter.getPrice(WBTC, true)).to.be.equal(btcPrice);
    expect(await gmxV1Adapter.getPrice(USDC, true)).to.be.equal(usdcPrice);

    var ethPrice = ethers.parseUnits("2000", 8);
    var btcPrice = ethers.parseUnits("40000", 8);
    var usdcPrice = ethers.parseUnits("1", 8);
    await setPrice(muxAdapter, WETH, ethPrice, ethPrice, false);
    await setPrice(muxAdapter, WBTC, btcPrice, btcPrice, true);
    await setPrice(muxAdapter, USDC, usdcPrice, usdcPrice, true);
    expect(await muxAdapter.getPrice(WETH, true)).to.be.equal(ethPrice * 10n ** 10n);
    expect(await muxAdapter.getPrice(WBTC, true)).to.be.equal(btcPrice * 10n ** 10n);
    expect(await muxAdapter.getPrice(USDC, true)).to.be.equal(usdcPrice * 10n ** 10n);

    var ethPrice = ethers.parseUnits("2200", 8);
    var btcPrice = ethers.parseUnits("44000", 8);
    await setPrice(muxAdapter, WETH, ethPrice, ethPrice, true);
    await setPrice(muxAdapter, WBTC, btcPrice, btcPrice, true);
    expect(await muxAdapter.getPrice(WETH, true)).to.be.equal(ethPrice * 10n ** 10n);
    expect(await muxAdapter.getPrice(WBTC, true)).to.be.equal(btcPrice * 10n ** 10n);
    expect(await muxAdapter.getPrice(USDC, true)).to.be.equal(usdcPrice * 10n ** 10n);
  });

  it("gmx: long", async () => {});
});
