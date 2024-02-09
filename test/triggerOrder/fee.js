const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture");

describe("createTriggerOrder, executeTriggerOrder", () => {
  it("zero fee", async () => {
    const {
      owner,
      orderKeeper,
      account,
      WETH,
      gmxV1Adapter,
      setDummyPrice,
      deposit,
      checkPosition,
      executeIncreasePosition,
      executeDecreasePosition,
    } = await loadFixture(deploy);

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;

    await setDummyPrice();
    var acceptablePrice = ethers.parseUnits("2000", 18);
    var triggerPrice = ethers.parseUnits("2000", 18);
    var executionFee = 0;
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
        executionFee,
        deadline,
        "0x",
        { value: await gmxV1Adapter.getMinExecutionFee() }
      );
    await executeIncreasePosition(account.target);
    await checkPosition(gmxV1Adapter, account, collateral, index, isLong);

    await account
      .connect(orderKeeper)
      .executeTriggerOrder(
        gmxV1Adapter.target,
        collateral,
        index,
        isLong,
        size,
        0,
        triggerPrice,
        acceptablePrice,
        executionFee,
        { value: await gmxV1Adapter.getMinExecutionFee() }
      );
    await executeDecreasePosition(account.target);
    await checkPosition(gmxV1Adapter, account, collateral, index, isLong);
  });

  it("execution fee", async () => {
    const {
      owner,
      orderKeeper,
      account,
      WETH,
      gmxV1Adapter,
      setDummyPrice,
      deposit,
      checkPosition,
      executeIncreasePosition,
      executeDecreasePosition,
    } = await loadFixture(deploy);

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;

    await setDummyPrice();
    var acceptablePrice = ethers.parseUnits("2000", 18);
    var triggerPrice = ethers.parseUnits("2000", 18);
    var executionFee = 0;
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
        executionFee,
        deadline,
        "0x",
        { value: await gmxV1Adapter.getMinExecutionFee() }
      );
    await executeIncreasePosition(account.target);
    await checkPosition(gmxV1Adapter, account, collateral, index, isLong);

    await account
      .connect(orderKeeper)
      .executeTriggerOrder(
        gmxV1Adapter.target,
        collateral,
        index,
        isLong,
        size,
        0,
        triggerPrice,
        acceptablePrice,
        executionFee,
        { value: await gmxV1Adapter.getMinExecutionFee() }
      );
    await executeDecreasePosition(account.target);
    await checkPosition(gmxV1Adapter, account, collateral, index, isLong);
  });
});
