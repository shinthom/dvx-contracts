const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture/setup");

describe("getPrice", () => {
  it("gmx v1", async () => {
    const { gmxV1, WETH, replaceFastPriceFeedAndSetPrice } = await loadFixture(deploy); // prettier-ignore

    var price = ethers.parseUnits("2000", 30);
    await replaceFastPriceFeedAndSetPrice(WETH, price, price);

    const expectedPrice = ethers.parseUnits("2000", 30);
    expect(await gmxV1.getPrice(WETH, true)).to.be.equal(expectedPrice);
    expect(await gmxV1.getPrice(WETH, false)).to.be.equal(expectedPrice);
  });

  it("mux", async () => {
    const { mux, WETH, replaceOracleReferenceAndSetPrice } = await loadFixture(deploy); // prettier-ignore

    var price = ethers.parseUnits("2000", 8);
    await replaceOracleReferenceAndSetPrice(WETH, price);

    const expectedPrice = ethers.parseUnits("2000", 18);
    expect(await mux.getPrice(WETH, true)).to.be.equal(expectedPrice);
    expect(await mux.getPrice(WETH, false)).to.be.equal(expectedPrice);
  });
});
