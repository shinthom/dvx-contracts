const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture");

describe("limitOrder", () => {
  it("should execute a limit order", async () => {
    const {
      user,
      account,
      exchange,
      gmxV1Adapter,
      muxAdapter,
      WETH,
      deposit,
      executeIncreasePosition,
      fillPositionOrder,
    } = await loadFixture(deploy);

    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = true;

    const executionFee = await gmxV1Adapter.getMinExecutionFee();
    const triggerPrice = ethers.parseUnits("2000", 18);
    const acceptablePrice = ethers.parseUnits("2000", 18); // calculated by slippage tolerance

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
    console.log(await exchange.getLimitOrder(account.target, 0));

    await exchange.connect(user).cancelLimitOrder(account.target, 0);
    console.log(await exchange.getLimitOrder(account.target, 0));

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
    console.log(await exchange.getLimitOrder(account.target, 1));

    // quoter should choose the best router(adapter).

    await exchange.executeLimitOrder(gmxV1Adapter.target, account.target, 1);
    await executeIncreasePosition(account.target);
    console.log(
      await gmxV1Adapter.getPosition(account.target, collateral, index, isLong)
    );

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
    console.log(await exchange.getLimitOrder(account.target, 2));

    await exchange.executeLimitOrder(muxAdapter.target, account.target, 2);
    await fillPositionOrder(account.target);
    console.log(
      await muxAdapter.getPosition(account.target, collateral, index, isLong)
    );
  });
});
