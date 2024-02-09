const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture");

describe("increasePosition", () => {
  it("zero fee", async () => {
    const {
      owner,
      account,
      WETH,
      gmxV1Adapter,
      setDummyPrice,
      deposit,
      checkPosition,
      executeIncreasePosition,
    } = await loadFixture(deploy);

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;

    await setDummyPrice();
    var acceptablePrice = ethers.parseUnits("2000", 18);
    var networkFee = 0;
    var deadline = 0;

    await deposit(collateral, collateralAmount);
    await account
      .connect(owner)
      .increasePosition(
        gmxV1Adapter.target,
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        acceptablePrice,
        networkFee,
        deadline,
        "0x",
        { value: await gmxV1Adapter.getMinExecutionFee() }
      );
    await executeIncreasePosition(account.target);
    await checkPosition(gmxV1Adapter, account, collateral, index, isLong);
  });

  it("execution fee", async () => {
    const {
      owner,
      account,
      WETH,
      gmxV1Adapter,
      setDummyPrice,
      deposit,
      checkPosition,
      executeIncreasePosition,
    } = await loadFixture(deploy);

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;

    await setDummyPrice();
    var acceptablePrice = ethers.parseUnits("2000", 18);
    var networkFee = ethers.parseEther("0.1");
    var deadline = 0;

    await deposit(collateral, collateralAmount);
    await account
      .connect(owner)
      .increasePosition(
        gmxV1Adapter.target,
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        acceptablePrice,
        networkFee,
        deadline,
        "0x",
        { value: await gmxV1Adapter.getMinExecutionFee() }
      );
    await executeIncreasePosition(account.target);
    await checkPosition(gmxV1Adapter, account, collateral, index, isLong);
  });

  it("execution fee + position fee", async () => {
    const {
      owner,
      account,
      exchange,
      WETH,
      gmxV1Adapter,
      setDummyPrice,
      deposit,
      checkPosition,
      executeIncreasePosition,
    } = await loadFixture(deploy);

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;

    await setDummyPrice();
    var acceptablePrice = ethers.parseUnits("2000", 18);
    var networkFee = ethers.parseEther("0.1");
    var deadline = 0;
    var positionFeeRate = ethers.parseUnits("0.01", 8); // 1%
    await exchange.setPositionFeeRate(positionFeeRate);

    await deposit(collateral, collateralAmount);
    await account
      .connect(owner)
      .increasePosition(
        gmxV1Adapter.target,
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        acceptablePrice,
        networkFee,
        deadline,
        "0x",
        { value: await gmxV1Adapter.getMinExecutionFee() }
      );
    await executeIncreasePosition(account.target);
    await checkPosition(gmxV1Adapter, account, collateral, index, isLong);
  });

  it("execution fee + position fee + swap fee", async () => {
    const {
      owner,
      account,
      exchange,
      USDC,
      WETH,
      gmxV1Adapter,
      setDummyPrice,
      deposit,
      checkPosition,
      executeIncreasePosition,
    } = await loadFixture(deploy);

    var collateral = USDC;
    var index = WETH;
    var collateralAmount = ethers.parseUnits("2000", 6);
    var size = ethers.parseEther("10");
    var isLong = true;

    await setDummyPrice();
    var acceptablePrice = ethers.parseUnits("2000", 18);
    var networkFee = ethers.parseUnits("200", 6);
    var deadline = 0;
    var positionFeeRate = ethers.parseUnits("0.01", 8); // 1%
    await exchange.setPositionFeeRate(positionFeeRate);
    var swapFeeRate = ethers.parseUnits("0.1", 8); // 10%
    await exchange.setSwapFeeRate(swapFeeRate);

    await deposit(collateral, collateralAmount);
    await account
      .connect(owner)
      .swapAndIncreasePosition(
        gmxV1Adapter.target,
        [USDC, WETH],
        index,
        collateralAmount,
        size,
        isLong,
        acceptablePrice,
        networkFee,
        deadline,
        "0x",
        { value: await gmxV1Adapter.getMinExecutionFee() }
      );
    await executeIncreasePosition(account.target);
    await checkPosition(gmxV1Adapter, account, WETH, index, isLong);
  });
});
