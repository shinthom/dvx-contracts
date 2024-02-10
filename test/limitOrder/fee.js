const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture");

describe("createLimitOrder, cancelLimitOrder", () => {
  it("zero fee", async () => {
    const { owner, account, WETH, weth, feeCollector, setDummyPrice, deposit } =
      await loadFixture(deploy);

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;

    await setDummyPrice();
    var acceptablePrice = ethers.parseUnits("2000", 18);
    var triggerPrice = ethers.parseUnits("2000", 18);
    var networkFee = 0;
    var executionFee = 0;
    var deadline = 0;

    await deposit(collateral, collateralAmount);
    await account
      .connect(owner)
      .createLimitOrder(
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        triggerPrice,
        acceptablePrice,
        networkFee,
        executionFee,
        deadline,
        "0x"
      );
    // console.log(await account.getLockedBalance(collateral));

    await account
      .connect(owner)
      .cancelLimitOrder(0, networkFee, deadline, "0x");
    // console.log(await account.getLockedBalance(collateral));
    // console.log(await account.getFeeDebt(collateral));
    console.log(await weth.balanceOf(feeCollector.target));
  });

  it("network fee", async () => {
    const { owner, account, WETH, weth, feeCollector, setDummyPrice, deposit } =
      await loadFixture(deploy);

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;

    await setDummyPrice();
    var acceptablePrice = ethers.parseUnits("2000", 18);
    var triggerPrice = ethers.parseUnits("2000", 18);
    var networkFee = ethers.parseEther("0.1");
    var executionFee = 0;
    var deadline = 0;

    await deposit(collateral, collateralAmount);
    await account
      .connect(owner)
      .createLimitOrder(
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        triggerPrice,
        acceptablePrice,
        networkFee,
        executionFee,
        deadline,
        "0x"
      );
    // console.log(await account.getLockedBalance(collateral));

    await account
      .connect(owner)
      .cancelLimitOrder(0, networkFee, deadline, "0x");
    // console.log(await account.getLockedBalance(collateral));
    // console.log(await account.getFeeDebt(collateral));
    console.log(await weth.balanceOf(feeCollector.target));
  });

  it("network fee + execution fee", async () => {
    const { owner, account, WETH, weth, feeCollector, setDummyPrice, deposit } =
      await loadFixture(deploy);

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;

    await setDummyPrice();
    var acceptablePrice = ethers.parseUnits("2000", 18);
    var triggerPrice = ethers.parseUnits("2000", 18);
    var networkFee = ethers.parseEther("0.1");
    var executionFee = ethers.parseEther("0.1");
    var deadline = 0;

    await deposit(collateral, collateralAmount);
    await account
      .connect(owner)
      .createLimitOrder(
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        triggerPrice,
        acceptablePrice,
        networkFee,
        executionFee,
        deadline,
        "0x"
      );
    // console.log(await account.getLockedBalance(collateral));

    await account
      .connect(owner)
      .cancelLimitOrder(0, networkFee, deadline, "0x");
    // console.log(await account.getLockedBalance(collateral));
    // console.log(await account.getFeeDebt(collateral));
    console.log(await weth.balanceOf(feeCollector.target));
  });
});

describe("createLimitOrder, executeLimitOrder", () => {
  it("zero fee", async () => {
    const {
      owner,
      orderKeeper,
      account,
      WETH,
      weth,
      feeCollector,
      gmxV1Adapter,
      setDummyPrice,
      deposit,
      executeIncreasePosition,
      checkPosition,
    } = await loadFixture(deploy);

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;

    await setDummyPrice();
    var acceptablePrice = ethers.parseUnits("2000", 18);
    var triggerPrice = ethers.parseUnits("2000", 18);
    var networkFee = 0;
    var executionFee = 0;
    var deadline = 0;

    await deposit(collateral, collateralAmount);
    await account
      .connect(owner)
      .createLimitOrder(
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        triggerPrice,
        acceptablePrice,
        networkFee,
        executionFee,
        deadline,
        "0x"
      );
    // console.log(await account.getLockedBalance(collateral));

    await account
      .connect(orderKeeper)
      .executeLimitOrder(0, gmxV1Adapter.target, {
        value: await gmxV1Adapter.getMinExecutionFee(),
      });
    await executeIncreasePosition(account.target);
    // await checkPosition(gmxV1Adapter, account, collateral, index, isLong);
    // console.log(await account.getLockedBalance(collateral));
    // console.log(await account.getFeeDebt(collateral));
    console.log(await weth.balanceOf(feeCollector.target));
  });

  it("network fee", async () => {
    const {
      owner,
      account,
      WETH,
      weth,
      feeCollector,
      orderKeeper,
      gmxV1Adapter,
      executeIncreasePosition,
      checkPosition,
      setDummyPrice,
      deposit,
    } = await loadFixture(deploy);

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;

    await setDummyPrice();
    var acceptablePrice = ethers.parseUnits("2000", 18);
    var triggerPrice = ethers.parseUnits("2000", 18);
    var networkFee = ethers.parseEther("0.1");
    var executionFee = 0;
    var deadline = 0;

    await deposit(collateral, collateralAmount);
    await account
      .connect(owner)
      .createLimitOrder(
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        triggerPrice,
        acceptablePrice,
        networkFee,
        executionFee,
        deadline,
        "0x"
      );
    // console.log(await account.getLockedBalance(collateral));

    await account
      .connect(orderKeeper)
      .executeLimitOrder(0, gmxV1Adapter.target, {
        value: await gmxV1Adapter.getMinExecutionFee(),
      });
    await executeIncreasePosition(account.target);
    // await checkPosition(gmxV1Adapter, account, collateral, index, isLong);
    // console.log(await account.getLockedBalance(collateral));
    // console.log(await account.getFeeDebt(collateral));
    console.log(await weth.balanceOf(feeCollector.target));
  });

  it("network fee + execution fee", async () => {
    const {
      owner,
      account,
      WETH,
      weth,
      feeCollector,
      orderKeeper,
      gmxV1Adapter,
      executeIncreasePosition,
      checkPosition,
      setDummyPrice,
      deposit,
    } = await loadFixture(deploy);

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;

    await setDummyPrice();
    var acceptablePrice = ethers.parseUnits("2000", 18);
    var triggerPrice = ethers.parseUnits("2000", 18);
    var networkFee = ethers.parseEther("0.1");
    var executionFee = ethers.parseEther("0.1");
    var deadline = 0;

    await deposit(collateral, collateralAmount);
    await account
      .connect(owner)
      .createLimitOrder(
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        triggerPrice,
        acceptablePrice,
        networkFee,
        executionFee,
        deadline,
        "0x"
      );
    // console.log(await account.getLockedBalance(collateral));

    await account
      .connect(orderKeeper)
      .executeLimitOrder(0, gmxV1Adapter.target, {
        value: await gmxV1Adapter.getMinExecutionFee(),
      });
    await executeIncreasePosition(account.target);
    // await checkPosition(gmxV1Adapter, account, collateral, index, isLong);
    // console.log(await account.getLockedBalance(collateral));
    // console.log(await account.getFeeDebt(collateral));
    console.log(await weth.balanceOf(feeCollector.target));
  });
});
