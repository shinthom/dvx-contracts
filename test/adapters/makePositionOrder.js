const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture/setup");

describe("makePositionOrder", () => {
  it("gmx v1", async () => {
    const { gmxV1, WETH, WBTC, USDC, replaceFastPriceFeedAndSetPrice } = await loadFixture(deploy); // prettier-ignore

    var ethPrice = ethers.parseUnits("2000", 30);
    await replaceFastPriceFeedAndSetPrice(WETH, ethPrice, ethPrice);

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;
    var positionOrder = await gmxV1.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
    expect(positionOrder.orderType).to.be.equal(0);
    expect(positionOrder.path.length).to.be.equal(1);
    expect(positionOrder.path[0]).to.be.equal(WETH);
    expect(positionOrder.index).to.be.equal(index);
    expect(positionOrder.collateralAmount).to.be.equal(collateralAmount);
    expect(positionOrder.size).to.be.equal((size * ethPrice) / 10n ** 18n);
    expect(positionOrder.isLong).to.be.equal(isLong);

    var collateral = USDC;
    var index = WETH;
    var collateralAmount = ethers.parseUnits("100", 6);
    var size = ethers.parseEther("10");
    var isLong = true;
    var positionOrder = await gmxV1.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
    expect(positionOrder.orderType).to.be.equal(0);
    expect(positionOrder.path.length).to.be.equal(2);
    expect(positionOrder.path[0]).to.be.equal(USDC);
    expect(positionOrder.path[1]).to.be.equal(WETH);
    expect(positionOrder.index).to.be.equal(index);
    expect(positionOrder.collateralAmount).to.be.equal(collateralAmount);
    expect(positionOrder.size).to.be.equal((size * ethPrice) / 10n ** 18n);
    expect(positionOrder.isLong).to.be.equal(isLong);

    var collateral = WBTC;
    var index = WETH;
    var collateralAmount = ethers.parseUnits("1", 8);
    var size = ethers.parseEther("10");
    var isLong = true;
    var positionOrder = await gmxV1.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
    expect(positionOrder.orderType).to.be.equal(0);
    expect(positionOrder.path.length).to.be.equal(2);
    expect(positionOrder.path[0]).to.be.equal(WBTC);
    expect(positionOrder.path[1]).to.be.equal(WETH);
    expect(positionOrder.index).to.be.equal(index);
    expect(positionOrder.collateralAmount).to.be.equal(collateralAmount);
    expect(positionOrder.size).to.be.equal((size * ethPrice) / 10n ** 18n);
    expect(positionOrder.isLong).to.be.equal(isLong);

    var collateral = USDC;
    var index = WETH;
    var collateralAmount = ethers.parseUnits("100", 6);
    var size = ethers.parseEther("10");
    var isLong = false;
    var positionOrder = await gmxV1.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
    expect(positionOrder.orderType).to.be.equal(0);
    expect(positionOrder.path.length).to.be.equal(1);
    expect(positionOrder.path[0]).to.be.equal(USDC);
    expect(positionOrder.index).to.be.equal(index);
    expect(positionOrder.collateralAmount).to.be.equal(collateralAmount);
    expect(positionOrder.size).to.be.equal((size * ethPrice) / 10n ** 18n);
    expect(positionOrder.isLong).to.be.equal(isLong);

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = false;
    var positionOrder = await gmxV1.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
    expect(positionOrder.orderType).to.be.equal(0);
    expect(positionOrder.path.length).to.be.equal(2);
    expect(positionOrder.path[0]).to.be.equal(WETH);
    expect(positionOrder.path[1]).to.be.equal(USDC);
    expect(positionOrder.index).to.be.equal(index);
    expect(positionOrder.collateralAmount).to.be.equal(collateralAmount);
    expect(positionOrder.size).to.be.equal((size * ethPrice) / 10n ** 18n);
    expect(positionOrder.isLong).to.be.equal(isLong);

    var collateral = WBTC;
    var index = WETH;
    var collateralAmount = ethers.parseUnits("1", 8);
    var size = ethers.parseEther("10");
    var isLong = false;
    var positionOrder = await gmxV1.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
    expect(positionOrder.orderType).to.be.equal(0);
    expect(positionOrder.path.length).to.be.equal(2);
    expect(positionOrder.path[0]).to.be.equal(WBTC);
    expect(positionOrder.path[1]).to.be.equal(USDC);
    expect(positionOrder.index).to.be.equal(index);
    expect(positionOrder.collateralAmount).to.be.equal(collateralAmount);
    expect(positionOrder.size).to.be.equal((size * ethPrice) / 10n ** 18n);
    expect(positionOrder.isLong).to.be.equal(isLong);
  });

  it("mux", async () => {
    const { mux, WETH, WBTC, USDC } = await loadFixture(deploy); // prettier-ignore

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;
    var positionOrder = await mux.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
    expect(positionOrder.orderType).to.be.equal(0);
    expect(positionOrder.path.length).to.be.equal(1);
    expect(positionOrder.path[0]).to.be.equal(WETH);
    expect(positionOrder.index).to.be.equal(index);
    expect(positionOrder.collateralAmount).to.be.equal(collateralAmount);
    expect(positionOrder.size).to.be.equal(size);
    expect(positionOrder.isLong).to.be.equal(isLong);

    var collateral = USDC;
    var index = WETH;
    var collateralAmount = ethers.parseUnits("100", 6);
    var size = ethers.parseEther("10");
    var isLong = true;
    var positionOrder = await mux.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
    expect(positionOrder.orderType).to.be.equal(0);
    expect(positionOrder.path.length).to.be.equal(1);
    expect(positionOrder.path[0]).to.be.equal(USDC);
    expect(positionOrder.index).to.be.equal(index);
    expect(positionOrder.collateralAmount).to.be.equal(collateralAmount);
    expect(positionOrder.size).to.be.equal(size);
    expect(positionOrder.isLong).to.be.equal(isLong);

    var collateral = WBTC;
    var index = WETH;
    var collateralAmount = ethers.parseUnits("1", 8);
    var size = ethers.parseEther("10");
    var isLong = true;
    var positionOrder = await mux.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
    expect(positionOrder.orderType).to.be.equal(0);
    expect(positionOrder.path.length).to.be.equal(1);
    expect(positionOrder.path[0]).to.be.equal(WBTC);
    expect(positionOrder.index).to.be.equal(index);
    expect(positionOrder.collateralAmount).to.be.equal(collateralAmount);
    expect(positionOrder.size).to.be.equal(size);
    expect(positionOrder.isLong).to.be.equal(isLong);

    var collateral = USDC;
    var index = WETH;
    var collateralAmount = ethers.parseUnits("100", 6);
    var size = ethers.parseEther("10");
    var isLong = false;
    var positionOrder = await mux.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
    expect(positionOrder.orderType).to.be.equal(0);
    expect(positionOrder.path.length).to.be.equal(1);
    expect(positionOrder.path[0]).to.be.equal(USDC);
    expect(positionOrder.index).to.be.equal(index);
    expect(positionOrder.collateralAmount).to.be.equal(collateralAmount);
    expect(positionOrder.size).to.be.equal(size);
    expect(positionOrder.isLong).to.be.equal(isLong);

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = false;
    var positionOrder = await mux.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
    expect(positionOrder.orderType).to.be.equal(0);
    expect(positionOrder.path.length).to.be.equal(1);
    expect(positionOrder.path[0]).to.be.equal(WETH);
    expect(positionOrder.index).to.be.equal(index);
    expect(positionOrder.collateralAmount).to.be.equal(collateralAmount);
    expect(positionOrder.size).to.be.equal(size);
    expect(positionOrder.isLong).to.be.equal(isLong);

    var collateral = WBTC;
    var index = WETH;
    var collateralAmount = ethers.parseUnits("1", 8);
    var size = ethers.parseEther("10");
    var isLong = false;
    var positionOrder = await mux.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
    expect(positionOrder.orderType).to.be.equal(0);
    expect(positionOrder.path.length).to.be.equal(1);
    expect(positionOrder.path[0]).to.be.equal(WBTC);
    expect(positionOrder.index).to.be.equal(index);
    expect(positionOrder.collateralAmount).to.be.equal(collateralAmount);
    expect(positionOrder.size).to.be.equal(size);
    expect(positionOrder.isLong).to.be.equal(isLong);
  });
});
