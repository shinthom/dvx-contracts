const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture/setup");

describe("getPositionFee", () => {
  it("gmx v1", async () => {
    const { gmxV1, WETH, replaceFastPriceFeedAndSetPrice } = await loadFixture(deploy); // prettier-ignore

    var price = ethers.parseUnits("2000", 30);
    await replaceFastPriceFeedAndSetPrice(WETH, price, price);

    var price = await gmxV1.getPrice(WETH, true);
    const size = ethers.parseUnits("6000", 30);
    const expectedPositionFee = (size * 10n) / 10000n;
    expect(await gmxV1.getPositionFee(WETH, size)).to.be.equal(expectedPositionFee); // prettier-ignore
  });

  it("mux", async () => {
    const { mux, WETH, replaceOracleReferenceAndSetPrice } = await loadFixture(deploy); // prettier-ignore

    var price = ethers.parseUnits("2000", 8);
    await replaceOracleReferenceAndSetPrice(WETH, price);

    var price = await mux.getPrice(WETH, true);
    const size = ethers.parseEther("10");
    const expectedPositionFee = (price * size * 60n) / 100000n / 10n ** 18n;
    expect(await mux.getPositionFee(WETH, size)).to.be.equal(expectedPositionFee); // prettier-ignore
  });
});
