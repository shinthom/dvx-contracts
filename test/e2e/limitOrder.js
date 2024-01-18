const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture");

describe("limitOrder", () => {
  it("should execute a limit order", async () => {
    const {
      user,
      orderKeeper,
      account,
      exchange,
      warehouse,
      gmxV1Adapter,
      muxAdapter,
      WETH,
      deposit,
      executeIncreasePosition,
      fillPositionOrder,
      setPrice,
    } = await loadFixture(deploy);

    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = true;

    const executionFee = await gmxV1Adapter.getMinExecutionFee();
    var triggerPrice = ethers.parseUnits("2000", 18);
    var acceptablePrice = ethers.parseUnits("2000", 18); // calculated by slippage tolerance
    var price = ethers.parseUnits("2000", 30);
    await setPrice(gmxV1Adapter, WETH, price, price, false);

    await deposit(collateral, collateralAmount);
    await exchange
      .connect(user)
      .createLimitOrder(
        account.target,
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        triggerPrice,
        acceptablePrice,
        executionFee,
        { value: executionFee }
      );

    await exchange.connect(user).cancelLimitOrder(account.target, 0);

    await exchange
      .connect(user)
      .createLimitOrder(
        account.target,
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        triggerPrice,
        acceptablePrice,
        executionFee,
        { value: executionFee }
      );

    // quoter should choose the best router(adapter).

    await warehouse.setOrderKeeper(orderKeeper.address, true);
    await warehouse
      .connect(orderKeeper)
      .executeLimitOrder(account.target, gmxV1Adapter.target, 1);
    await executeIncreasePosition(account.target);
    console.log(
      await gmxV1Adapter.getWrapPosition(
        account.target,
        collateral,
        index,
        isLong
      )
    );

    var triggerPrice = ethers.parseUnits("2000", 18);
    var acceptablePrice = ethers.parseUnits("2000", 18);
    var price = ethers.parseUnits("2000", 8);
    await setPrice(muxAdapter, WETH, price, price, false);

    await deposit(collateral, collateralAmount);
    await exchange
      .connect(user)
      .createLimitOrder(
        account.target,
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        triggerPrice,
        acceptablePrice,
        executionFee,
        { value: executionFee }
      );

    await warehouse
      .connect(orderKeeper)
      .executeLimitOrder(account.target, muxAdapter.target, 2);
    await fillPositionOrder(account.target);
    console.log(
      await muxAdapter.getWrapPosition(
        account.target,
        collateral,
        index,
        isLong
      )
    );
  });
});
