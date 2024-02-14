const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("./fixture");

describe("increaseCollateral", () => {
  describe("no swap", () => {
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
        executeIncreasePosition,
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

      var tokenIn = collateral;
      var amountIn = collateralAmount;
      var networkFee = ethers.parseUnits("0.01", 18);
      var deadline = 0;
      await deposit(tokenIn, amountIn);
      await account
        .connect(owner)
        .increaseCollateral(
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          tokenIn,
          amountIn,
          networkFee,
          deadline,
          "0x",
          { value: await gmxV1Adapter.getMinExecutionFee() }
        );
      await executeIncreasePosition(account.target);
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
        executeIncreasePosition,
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

      var tokenIn = collateral;
      var amountIn = collateralAmount;
      var networkFee = ethers.parseUnits("0.01", 18);
      var deadline = 0;
      await deposit(tokenIn, amountIn);
      await account
        .connect(owner)
        .increaseCollateral(
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          tokenIn,
          amountIn,
          networkFee,
          deadline,
          "0x",
          { value: await gmxV1Adapter.getMinExecutionFee() }
        );
      await executeIncreasePosition(account.target);
      await checkWrapPosition(gmxV1Adapter, account, collateral, index, isLong);
    });
  });

  describe("swap", () => {
    it("zero fee", async () => {
      const {
        owner,
        account,
        WETH,
        USDC,
        gmxV1Adapter,
        setDummyPrice,
        deposit,
        increasePosition,
        checkWrapPosition,
        executeIncreasePosition,
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

      var tokenIn = USDC;
      var amountIn = ethers.parseUnits("2000", 6);
      var networkFee = 0;
      var deadline = 0;
      await deposit(tokenIn, amountIn);
      await account
        .connect(owner)
        .increaseCollateral(
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          tokenIn,
          amountIn,
          networkFee,
          deadline,
          "0x",
          { value: await gmxV1Adapter.getMinExecutionFee() }
        );
      await executeIncreasePosition(account.target);
      await checkWrapPosition(gmxV1Adapter, account, collateral, index, isLong);
    });

    it("network fee", async () => {
      const {
        owner,
        account,
        WETH,
        USDC,
        gmxV1Adapter,
        setDummyPrice,
        deposit,
        increasePosition,
        checkWrapPosition,
        executeIncreasePosition,
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

      var tokenIn = USDC;
      var amountIn = ethers.parseUnits("2000", 6);
      var networkFee = ethers.parseUnits("200", 6);
      var deadline = 0;
      await deposit(tokenIn, amountIn);
      await account
        .connect(owner)
        .increaseCollateral(
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          tokenIn,
          amountIn,
          networkFee,
          deadline,
          "0x",
          { value: await gmxV1Adapter.getMinExecutionFee() }
        );
      await executeIncreasePosition(account.target);
      await checkWrapPosition(gmxV1Adapter, account, collateral, index, isLong);
    });
  });

  describe("relay", () => {
    it("increaseCollateral", async () => {
      const {
        owner,
        va,
        relayer,
        account,
        WETH,
        weth,
        gmxV1Adapter,
        increasePosition,
        USDC,
        setDummyPrice,
        checkWrapPosition,
        deposit,
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

      var tokenIn = USDC;
      var amountIn = ethers.parseUnits("2000", 6);
      await deposit(tokenIn, amountIn);

      var networkFee = ethers.parseUnits("200", 6);
      var deadline = Math.ceil(Date.now() / 1000) + 60 * 60 * 3;

      var messageHash = ethers.solidityPackedKeccak256(
        [
          "address", // adapter
          "address", // collateral
          "address", // index
          "bool", // isLong
          "address", // tokenIn
          "uint256", // amountIn
          "uint256", // networkFee
          "uint256", // deadline
        ],
        [
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          tokenIn,
          amountIn,
          networkFee,
          deadline,
        ]
      );
      var signature = await va.signMessage(ethers.getBytes(messageHash));

      await account
        .connect(relayer)
        .increaseCollateral(
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          tokenIn,
          amountIn,
          networkFee,
          deadline,
          signature,
          { value: await gmxV1Adapter.getMinExecutionFee() }
        );
    });
  });
});
