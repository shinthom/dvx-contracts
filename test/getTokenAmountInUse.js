const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("./fixture");

describe("reader", () => {
  it("getTokenAmountInUse", async () => {
    const {
      owner,
      account,
      gmxV1Adapter,
      muxAdapter,
      reader,
      WETH,
      WBTC,
      USDC,
      setDummyPrice,
      deposit,
      executeIncreasePosition,
    } = await loadFixture(deploy);
    await setDummyPrice();

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;

    var acceptablePrice = ethers.parseUnits("2000", 18);
    var triggerPrice = ethers.parseUnits("2000", 18);

    var networkFee = 0;
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
        networkFee,
        deadline,
        "0x",
        { value: await gmxV1Adapter.getMinExecutionFee() }
      );
    await executeIncreasePosition(account.target);

    var tokenAmountInUseAsCollateral =
      await reader.getTokenAmountInUseAsCollateral(
        account.target,
        [gmxV1Adapter.target, muxAdapter.target],
        [WETH, WBTC, USDC],
        [WETH, WBTC]
      );
    var tokenAmountInUse = await reader.getTokenAmountInUse(
      account.target,
      [gmxV1Adapter.target, muxAdapter.target],
      [WETH, WBTC, USDC],
      [WETH, WBTC]
    );
    console.log(tokenAmountInUse);
    console.log(tokenAmountInUseAsCollateral);

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

    var tokenAmountInUseAsCollateral =
      await reader.getTokenAmountInUseAsCollateral(
        account.target,
        [gmxV1Adapter.target, muxAdapter.target],
        [WETH, WBTC, USDC],
        [WETH, WBTC]
      );
    var tokenAmountInUse = await reader.getTokenAmountInUse(
      account.target,
      [gmxV1Adapter.target, muxAdapter.target],
      [WETH, WBTC, USDC],
      [WETH, WBTC]
    );
    console.log(tokenAmountInUse);
    console.log(tokenAmountInUseAsCollateral);

    var collateral = WBTC;
    var index = WBTC;
    var collateralAmount = ethers.parseUnits("0.1", 8);
    var size = ethers.parseUnits("1", 8);
    var isLong = true;

    var acceptablePrice = ethers.parseUnits("40000", 18);
    var triggerPrice = ethers.parseUnits("40000", 18);

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

    var tokenAmountInUseAsCollateral =
      await reader.getTokenAmountInUseAsCollateral(
        account.target,
        [gmxV1Adapter.target, muxAdapter.target],
        [WETH, WBTC, USDC],
        [WETH, WBTC]
      );
    var tokenAmountInUse = await reader.getTokenAmountInUse(
      account.target,
      [gmxV1Adapter.target, muxAdapter.target],
      [WETH, WBTC, USDC],
      [WETH, WBTC]
    );
    console.log(tokenAmountInUse);
    console.log(tokenAmountInUseAsCollateral);

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
  });
});
