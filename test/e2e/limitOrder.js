const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture");

describe("limitOrder", () => {
  it("should execute a limit order", async () => {
    const {
      user,
      orderKeeper,
      account,
      warehouse,
      gmxV1Adapter,
      muxAdapter,
      WETH,
      checkBalance,
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

    var price = ethers.parseUnits("2000", 30);
    await setPrice(gmxV1Adapter, WETH, price, price, false);

    var triggerPrice = ethers.parseUnits("2000", 18);
    var acceptablePrice = ethers.parseUnits("2000", 18); // calculated by slippage tolerance

    await deposit(collateral, collateralAmount);
    await checkBalance(account);

    await account.connect(user).createLimitOrder(
      collateral,
      index,
      collateralAmount,
      size,
      isLong,
      0, // execution fee
      triggerPrice,
      acceptablePrice
    );
    console.log(await warehouse.getLimitOrders(account.target));

    const limitOrder = await warehouse.getLimitOrder(account.target, 0);
    await account.connect(user).cancelLimitOrder(
      limitOrder.orderId,
      0 // execution fee
    );

    await account.connect(user).createLimitOrder(
      collateral,
      index,
      collateralAmount,
      size,
      isLong,
      0, // execution fee
      triggerPrice,
      acceptablePrice
    );

    var executionFee = await gmxV1Adapter.getMinExecutionFee();
    await account
      .connect(orderKeeper)
      .executeLimitOrder(1, gmxV1Adapter.target, 0, {
        value: executionFee,
      });
    await executeIncreasePosition(account.target);
    console.log(
      await gmxV1Adapter.getPosition(account.target, collateral, index, isLong)
    );

    var ethPrice = ethers.parseUnits("2000", 8);
    await setPrice(muxAdapter, WETH, ethPrice, ethPrice, false);

    await deposit(collateral, collateralAmount);
    await account
      .connect(user)
      .createLimitOrder(
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        executionFee,
        triggerPrice,
        acceptablePrice
      );
    await account
      .connect(orderKeeper)
      .executeLimitOrder(2, muxAdapter.target, 0, {
        value: 0,
      });
    await fillPositionOrder();
    console.log(
      await muxAdapter.getPosition(account.target, collateral, index, isLong)
    );
  });

  it("multi", async () => {
    const {
      user,
      orderKeeper,
      account,
      warehouse,
      gmxV1Adapter,
      muxAdapter,
      WETH,
      deposit,
      executeIncreasePosition,
      fillPositionOrder,
      setDummyPrice,
    } = await loadFixture(deploy);

    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = true;

    await setDummyPrice();

    var triggerPrice = ethers.parseUnits("2000", 18);
    var acceptablePrice = ethers.parseUnits("2000", 18); // calculated by slippage tolerance

    await deposit(collateral, collateralAmount);
    await account.connect(user).createLimitOrder(
      collateral,
      index,
      collateralAmount,
      size,
      isLong,
      0, // execution fee
      triggerPrice,
      acceptablePrice
    );
    console.log(await warehouse.getLimitOrders(account.target));

    var adapterFee = await gmxV1Adapter.getMinExecutionFee();
    await account
      .connect(orderKeeper)
      .executeLimitOrderMulti(
        0,
        [gmxV1Adapter.target, muxAdapter.target],
        [collateralAmount / 2n, collateralAmount / 2n],
        [size / 2n, size / 2n],
        0,
        { value: adapterFee }
      );
    await executeIncreasePosition(account.target);
    await fillPositionOrder();

    console.log(
      await gmxV1Adapter.getWrapPosition(
        account.target,
        collateral,
        index,
        isLong
      )
    );
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
