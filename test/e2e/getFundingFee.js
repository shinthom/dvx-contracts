const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture");

describe("getReceiveToken", () => {
  it("gmx v1", async () => {
    const {
      account,
      gmxV1Adapter,
      WETH,
      setDummyPrice,
      deposit,
      increasePosition,
      updateCumulativeFundingRate,
    } = await loadFixture(deploy);
    await setDummyPrice();
    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;
    var acceptablePrice = ethers.parseUnits("2000", 18);
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(gmxV1Adapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    console.log(await gmxV1Adapter.getFundingFee(account.target, collateral, index, isLong)); // prettier-ignore
    await updateCumulativeFundingRate(collateral);
    console.log(await gmxV1Adapter.getFundingFee(account.target, collateral, index, isLong)); // prettier-ignore
  });

  it("mux", async () => {
    const {
      account,
      muxAdapter,
      WETH,
      setDummyPrice,
      deposit,
      increasePosition,
      updateFundingState,
    } = await loadFixture(deploy);
    await setDummyPrice();
    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;
    var acceptablePrice = ethers.parseUnits("2000", 18);
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(muxAdapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    console.log(await muxAdapter.getFundingFee(account.target, collateral, index, isLong)); // prettier-ignore
    await updateFundingState();
    console.log(await muxAdapter.getFundingFee(account.target, collateral, index, isLong)); // prettier-ignore
  });
});
