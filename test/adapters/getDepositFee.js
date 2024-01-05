const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture/setup");

describe("getDepositFee", () => {
  it("gmx v1", async () => {
    const {
      user,
      account,
      gmxV1,
      positionRouter,
      ETH,
      WETH,
      minExecutionFee,
      replaceFastPriceFeedAndSetPrice,
      executeIncreasePosition,
      updateCumulativeFundingRate,
    } = await loadFixture(deploy);
    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = true;

    var price = ethers.parseUnits("2000", 30);
    await replaceFastPriceFeedAndSetPrice(WETH, price, price);

    var positionOrder = await gmxV1.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
    expect(
      await gmxV1.getDepositFee(account.target, {
        orderType: positionOrder.orderType,
        path: [...positionOrder.path],
        index: positionOrder.index,
        collateralAmount: positionOrder.collateralAmount,
        size: positionOrder.size,
        isLong: positionOrder.isLong,
      })
    ).to.be.equal(0);

    await account
      .connect(user)
      .deposit(ETH, collateralAmount, { value: collateralAmount });
    await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }], { value: minExecutionFee }); // prettier-ignore
    await executeIncreasePosition(account.target);

    expect(
      await gmxV1.getDepositFee(account.target, {
        orderType: positionOrder.orderType,
        path: [...positionOrder.path],
        index: positionOrder.index,
        collateralAmount: positionOrder.collateralAmount,
        size: positionOrder.size,
        isLong: positionOrder.isLong,
      })
    ).to.be.equal(0);

    const newCollateralAmount = ethers.parseEther("1");
    const newSize = ethers.parseEther("2");
    var positionOrder = await gmxV1.makePositionOrder(collateral, index, newCollateralAmount, newSize, isLong); // prettier-ignore
    var price = await gmxV1.getPrice(WETH, true);
    const depositFeeRate = await positionRouter.depositFee();
    const expectedDepositFee =
      (collateralAmount * price * depositFeeRate) / 10000n / 10n ** 18n;
    expect(
      await gmxV1.getDepositFee(account.target, {
        orderType: positionOrder.orderType,
        path: [...positionOrder.path],
        index: positionOrder.index,
        collateralAmount: positionOrder.collateralAmount,
        size: positionOrder.size,
        isLong: positionOrder.isLong,
      })
    ).to.be.equal(expectedDepositFee);
  });
});
