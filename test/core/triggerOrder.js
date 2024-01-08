const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { deploy } = require("../fixture/setup");

describe("triggerOrder", () => {
  it("create", async () => {
    const {
      gmxV1,
      deployer: positionKeeper,
      user,
      account,
      warehouse,
      minExecutionFee,
      ETH,
      WETH,
      checkBalance,
      printPosition,
      executeIncreasePosition,
      replaceFastPriceFeedAndSetPrice,
    } = await loadFixture(deploy);
    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = true;

    const price = ethers.parseUnits("2000", 30);
    await replaceFastPriceFeedAndSetPrice(WETH, price, price);

    await account.deposit(ETH, collateralAmount, { value: collateralAmount });
    expect(
      account
        .connect(user)
        .createTriggerOrder(
          gmxV1.target,
          collateral,
          index,
          isLong,
          size,
          price + 1n,
          price - 1n
        )
    ).to.be.revertedWith("Warehouse: NO_POSITION");

    const positionOrder = await gmxV1.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
    await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }], { value: minExecutionFee }); // prettier-ignore
    await executeIncreasePosition(account.target);

    const positionKey = await warehouse.getPositionKey(gmxV1.target, collateral, index, isLong); // prettier-ignore
    const triggerOrderSize = size / 2n;
    await account.connect(user).createTriggerOrder(gmxV1.target, collateral, index, isLong, triggerOrderSize, price + 1n, price - 1n); // prettier-ignore
    await account.connect(user).createTriggerOrder(gmxV1.target, collateral, index, isLong, triggerOrderSize, price + 1n, price - 1n); // prettier-ignore
    expect(await warehouse.getTriggerOrder(positionKey, 0)).to.eql((await warehouse.getTriggerOrders(positionKey))[0]); // prettier-ignore
    expect(await warehouse.getTriggerOrder(positionKey, 1)).to.eql((await warehouse.getTriggerOrders(positionKey))[1]); // prettier-ignore
    expect(await warehouse.getTriggerOrderSize(positionKey)).to.be.equal(size);
    expect(
      account
        .connect(user)
        .createTriggerOrder(
          gmxV1.target,
          collateral,
          index,
          isLong,
          1n,
          price + 1n,
          price - 1n
        )
    ).to.be.revertedWith("Warehouse: EXCEED_SIZE");
  });

  it("cancel", async () => {
    const {
      gmxV1,
      deployer: positionKeeper,
      user,
      account,
      warehouse,
      minExecutionFee,
      ETH,
      WETH,
      checkBalance,
      printPosition,
      executeIncreasePosition,
      replaceFastPriceFeedAndSetPrice,
    } = await loadFixture(deploy);
    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = true;

    const price = ethers.parseUnits("2000", 30);
    await replaceFastPriceFeedAndSetPrice(WETH, price, price);

    await account.deposit(ETH, collateralAmount, { value: collateralAmount });

    const positionOrder = await gmxV1.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
    await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }], { value: minExecutionFee }); // prettier-ignore
    await executeIncreasePosition(account.target);

    await account.connect(user).createTriggerOrder(gmxV1.target, collateral, index, isLong, size, price + 1n, price - 1n); // prettier-ignore
    const positionKey = await warehouse.getPositionKey(gmxV1.target, collateral, index, isLong); // prettier-ignore
    expect(await warehouse.getTriggerOrderSize(positionKey)).to.be.equal(size);

    await account.connect(user).cancelTriggerOrder(positionKey, 0);
    expect((await warehouse.getTriggerOrder(positionKey, 0)).state).to.be.equal(2); // prettier-ignore
    expect(await warehouse.getTriggerOrderSize(positionKey)).to.be.equal(0);
  });

  it("execute", async () => {
    const {
      gmxV1,
      deployer: positionKeeper,
      user,
      account,
      warehouse,
      minExecutionFee,
      ETH,
      WETH,
      checkBalance,
      printPosition,
      executeIncreasePosition,
      executeDecreasePosition,
      replaceFastPriceFeedAndSetPrice,
    } = await loadFixture(deploy);
    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = true;

    const price = ethers.parseUnits("2000", 30);
    await replaceFastPriceFeedAndSetPrice(WETH, price, price);

    await account.deposit(ETH, collateralAmount, { value: collateralAmount });

    const positionOrder = await gmxV1.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
    await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }], { value: minExecutionFee }); // prettier-ignore
    await executeIncreasePosition(account.target);

    await account.connect(user).createTriggerOrder(gmxV1.target, collateral, index, isLong, size, price + 1n, price - 1n); // prettier-ignore
    const positionKey = await warehouse.getPositionKey(gmxV1.target, collateral, index, isLong); // prettier-ignore
    expect(await warehouse.getTriggerOrderSize(positionKey)).to.be.equal(size);

    expect(
      warehouse
        .connect(positionKeeper)
        .executeTriggerOrder(account.target, positionKey, 0, {
          value: minExecutionFee,
        })
    ).to.be.revertedWith("Warehouse: not order keeper");
    await warehouse.setOrderKeeper(positionKeeper.address, true);
    await warehouse
      .connect(positionKeeper)
      .executeTriggerOrder(account.target, positionKey, 0, {
        value: minExecutionFee,
      });
    await executeDecreasePosition(account.target);
    expect(await warehouse.getTriggerOrderSize(positionKey)).to.be.equal(0);
  });
});
