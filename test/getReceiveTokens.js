const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("./fixture");

describe("getReceiveToken", () => {
  it("gmx v1", async () => {
    const {
      account,
      gmxV1Adapter,
      WETH,
      checkBalance,
      setPrice,
      setDummyPrice,
      deposit,
      increasePosition,
      decreasePosition,
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
    await checkBalance(account);
    // await updateCumulativeFundingRate(collateral);
    var price = ethers.parseUnits("2200", 30);
    await setPrice(gmxV1Adapter, WETH, price, price, false);
    console.log(await gmxV1Adapter.getPositionWrapNetValueUsd(account.target, collateral, index, isLong)); // prettier-ignore
    console.log(await gmxV1Adapter.getPositionNetValueToken(account.target, collateral, index, isLong)); // prettier-ignore
    await decreasePosition(gmxV1Adapter, collateral, index, isLong, size, 0); // prettier-ignore
    await checkBalance(account);
  });

  it("mux", async () => {
    const {
      account,
      muxAdapter,
      WETH,
      USDC,
      checkBalance,
      checkPosition,
      setPrice,
      setDummyPrice,
      deposit,
      increasePosition,
      decreasePosition,
      updateFundingState,
    } = await loadFixture(deploy);
    await setDummyPrice();
    var collateral = USDC;
    var index = WETH;
    var collateralAmount = ethers.parseUnits("2000", 6);
    var size = ethers.parseEther("10");
    var isLong = true;
    var acceptablePrice = ethers.parseUnits("2000", 18);
    await deposit(collateral, collateralAmount, "0x");
    await checkBalance(account);
    await increasePosition(muxAdapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    await checkBalance(account);
    await checkPosition(muxAdapter, account, collateral, index, isLong); // prettier-ignore
    // await updateFundingState();
    var price = ethers.parseUnits("2200", 8);
    await setPrice(muxAdapter, WETH, price, price, false);
    console.log(await muxAdapter.getPositionWrapNetValueUsd(account.target, collateral, index, isLong)); // prettier-ignore
    console.log(await muxAdapter.getPositionNetValueToken(account.target, collateral, index, isLong)); // prettier-ignore
    await decreasePosition(muxAdapter, collateral, index, isLong, size, 0); // prettier-ignore
    await checkBalance(account);
  });
});
