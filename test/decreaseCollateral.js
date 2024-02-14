const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("./fixture");

describe("decreaseCollateral", () => {
  it("zero fee", async () => {
    const {
      owner,
      account,
      WETH,
      gmxV1Adapter,
      setDummyPrice,
      deposit,
      increasePosition,
      checkWrapPosition,
      executeDecreasePosition,
    } = await loadFixture(deploy);

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;

    await setDummyPrice();
    var acceptablePrice = ethers.parseUnits("2000", 18);

    await deposit(collateral, collateralAmount);
    await increasePosition(
      gmxV1Adapter,
      collateral,
      index,
      collateralAmount,
      size,
      acceptablePrice,
      isLong
    );
    await checkWrapPosition(gmxV1Adapter, account, collateral, index, isLong);

    var networkFee = 0;
    var deadline = 0;
    await account
      .connect(owner)
      .decreaseCollateral(
        gmxV1Adapter.target,
        collateral,
        index,
        isLong,
        collateralAmount / 2n,
        networkFee,
        deadline,
        "0x",
        { value: await gmxV1Adapter.getMinExecutionFee() }
      );
    await executeDecreasePosition(account.target);
    await checkWrapPosition(gmxV1Adapter, account, collateral, index, isLong);
  });

  it("network fee", async () => {
    const {
      owner,
      account,
      WETH,
      gmxV1Adapter,
      setDummyPrice,
      deposit,
      increasePosition,
      checkWrapPosition,
      executeDecreasePosition,
    } = await loadFixture(deploy);

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;

    await setDummyPrice();
    var acceptablePrice = ethers.parseUnits("2000", 18);

    await deposit(collateral, collateralAmount);
    await increasePosition(
      gmxV1Adapter,
      collateral,
      index,
      collateralAmount,
      size,
      acceptablePrice,
      isLong
    );
    await checkWrapPosition(gmxV1Adapter, account, collateral, index, isLong);

    var networkFee = ethers.parseUnits("0.01", 18);
    var deadline = 0;
    await account
      .connect(owner)
      .decreaseCollateral(
        gmxV1Adapter.target,
        collateral,
        index,
        isLong,
        collateralAmount / 2n,
        networkFee,
        deadline,
        "0x",
        { value: await gmxV1Adapter.getMinExecutionFee() }
      );
    await executeDecreasePosition(account.target);
    await checkWrapPosition(gmxV1Adapter, account, collateral, index, isLong);
    console.log(await account.getFeeDebt(collateral));
  });

  describe("relay", () => {
    it("decreaseCollateral", async () => {
      const {
        va,
        relayer,
        account,
        WETH,
        gmxV1Adapter,
        increasePosition,
        setDummyPrice,
        checkWrapPosition,
        deposit,
        executeDecreasePosition,
      } = await loadFixture(deploy);

      var collateral = WETH;
      var index = WETH;
      var collateralAmount = ethers.parseEther("1");
      var size = ethers.parseEther("10");
      var isLong = true;

      await setDummyPrice();
      var acceptablePrice = ethers.parseUnits("2000", 18);

      await deposit(collateral, collateralAmount);
      await increasePosition(
        gmxV1Adapter,
        collateral,
        index,
        collateralAmount,
        size,
        acceptablePrice,
        isLong
      );
      await checkWrapPosition(gmxV1Adapter, account, collateral, index, isLong);

      var networkFee = 0;
      var deadline = Math.ceil(Date.now() / 1000) + 60 * 60 * 3;

      var messageHash = ethers.solidityPackedKeccak256(
        [
          "address", // adapter
          "address", // collateral
          "address", // index
          "bool", // isLong
          "uint256", // collateralAmount
          "uint256", // networkFee
          "uint256", // deadline
        ],
        [
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          collateralAmount / 2n,
          networkFee,
          deadline,
        ]
      );
      var signature = await va.signMessage(ethers.getBytes(messageHash));

      await account
        .connect(relayer)
        .decreaseCollateral(
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          collateralAmount / 2n,
          networkFee,
          deadline,
          signature,
          { value: await gmxV1Adapter.getMinExecutionFee() }
        );

      await executeDecreasePosition(account.target);
      await checkWrapPosition(gmxV1Adapter, account, collateral, index, isLong);
    });
  });
});
