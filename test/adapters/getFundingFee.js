const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture/setup");

describe("getFundingFee", () => {
  it("gmx v1", async () => {
    const {
      user,
      account,
      gmxV1,
      vault,
      ETH,
      WETH,
      minExecutionFee,
      replaceFastPriceFeedAndSetPrice,
      executeIncreasePosition,
      updateCumulativeFundingRate,
    } = await loadFixture(deploy);
    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = true;

    var price = ethers.parseUnits("2000", 30);
    await replaceFastPriceFeedAndSetPrice(WETH, price, price);

    const positionOrder = await gmxV1.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
    await account
      .connect(user)
      .deposit(ETH, collateralAmount, { value: collateralAmount });
    await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }], { value: minExecutionFee }); // prettier-ignore
    await executeIncreasePosition(account.target);

    var position = await account.getPosition(gmxV1.target, collateral, index, isLong); // prettier-ignore
    var fundingFee = await gmxV1.getFundingFee(collateral, index, position.size, position.fundingRate, isLong); // prettier-ignore
    expect(fundingFee).to.be.equal(0);

    await updateCumulativeFundingRate(collateral);

    const cumulativeFundingRate = await vault.cumulativeFundingRates(collateral); // prettier-ignore
    const fundingRate = cumulativeFundingRate - position.fundingRate;
    const expectedFundingFee = (position.size * fundingRate) / 1000000n;
    var fundingFee = await gmxV1.getFundingFee(collateral, index, position.size, position.fundingRate, isLong); // prettier-ignore
    expect(fundingFee).to.be.equal(expectedFundingFee);
  });

  it("mux, long", async () => {
    const {
      user,
      account,
      mux,
      ETH,
      WETH,
      getAssetFromTokenAddress,
      replaceOracleReferenceAndSetPrice,
      fillPositionOrder,
      updateFundingState,
    } = await loadFixture(deploy);
    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = true;

    var price = ethers.parseUnits("2000", 8);
    await replaceOracleReferenceAndSetPrice(WETH, price);

    const positionOrder = await mux.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
    await account
      .connect(user)
      .deposit(ETH, collateralAmount, { value: collateralAmount });
    await account.connect(user).createMarketOrders([mux.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }]); // prettier-ignore
    await fillPositionOrder();

    var position = await account.getPosition(mux.target, collateral, index, isLong); // prettier-ignore
    var fundingFee = await mux.getFundingFee(collateral, index, size, position.fundingRate, isLong); // prettier-ignore
    expect(fundingFee).to.be.equal(0);

    await updateFundingState();

    var price = await mux.getPrice(WETH, true);
    const longCumulativeFunding = (await getAssetFromTokenAddress(WETH)).longCumulativeFundingRate; // prettier-ignore
    const cumulativeFundingRate =
      ((longCumulativeFunding - position.fundingRate) * price) / 10n ** 18n;
    const expectedFundingFee = (cumulativeFundingRate * position.size) / 10n ** 18n; // prettier-ignore
    var fundingFee = await mux.getFundingFee(collateral, index, size, position.fundingRate, isLong); // prettier-ignore
    expect(fundingFee).to.be.equal(expectedFundingFee);
  });

  it("mux, short", async () => {
    const {
      user,
      account,
      mux,
      ETH,
      WETH,
      getAssetFromTokenAddress,
      replaceOracleReferenceAndSetPrice,
      fillPositionOrder,
      updateFundingState,
    } = await loadFixture(deploy);
    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = false;

    var price = ethers.parseUnits("2000", 8);
    await replaceOracleReferenceAndSetPrice(WETH, price);

    const positionOrder = await mux.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
    await account
      .connect(user)
      .deposit(ETH, collateralAmount, { value: collateralAmount });
    await account.connect(user).createMarketOrders([mux.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }]); // prettier-ignore
    await fillPositionOrder();

    var position = await account.getPosition(mux.target, collateral, index, isLong); // prettier-ignore
    var fundingFee = await mux.getFundingFee(collateral, index, size, position.fundingRate, isLong); // prettier-ignore
    expect(fundingFee).to.be.equal(0);

    await updateFundingState();

    var price = await mux.getPrice(WETH, true);
    const shortCumulativeFunding = (await getAssetFromTokenAddress(WETH)).shortCumulativeFunding; // prettier-ignore
    const cumulativeFundingRate = shortCumulativeFunding - position.fundingRate;
    const expectedFundingFee = (cumulativeFundingRate * position.size) / 10n ** 18n; // prettier-ignore
    var fundingFee = await mux.getFundingFee(collateral, index, size, position.fundingRate, isLong); // prettier-ignore
    expect(fundingFee).to.be.equal(expectedFundingFee);
  });
});
