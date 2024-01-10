const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { deploy } = require("../fixture/setup");

describe("triggerOrder", () => {
  const triggerOrderState = {
    pending: 0,
    executed: 1,
    canceled: 2,
  };

  it("gmx v1", async () => {
    const {
      gmxV1,
      deployer: positionKeeper,
      user,
      account,
      warehouse,
      minExecutionFee,
      ETH,
      WETH,
      executeIncreasePosition,
      executeDecreasePosition,
      replaceFastPriceFeedAndSetPrice,
    } = await loadFixture(deploy);

    const minTriggerOrderExecutionFee = await gmxV1.getMinExecutionFee();

    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = true;

    const price = ethers.parseUnits("2000", 30);
    await replaceFastPriceFeedAndSetPrice(WETH, price, price);

    await account.deposit(ETH, collateralAmount, { value: collateralAmount });

    await expect(
      account.createTriggerOrder(
        gmxV1.target,
        collateral,
        index,
        isLong,
        size,
        price + 1n,
        price - 1n,
        minTriggerOrderExecutionFee,
        { value: minTriggerOrderExecutionFee }
      )
    ).to.be.revertedWith("Account: NOT_OWNER");
    await expect(
      account
        .connect(user)
        .createTriggerOrder(
          gmxV1.target,
          collateral,
          index,
          isLong,
          size,
          price + 1n,
          price - 1n,
          minTriggerOrderExecutionFee
        )
    ).to.be.revertedWith("Account: FEE_MISMATCH");
    await expect(
      account
        .connect(user)
        .createTriggerOrder(
          gmxV1.target,
          collateral,
          index,
          isLong,
          size,
          price + 1n,
          price - 1n,
          1,
          { value: 1 }
        )
    ).to.be.revertedWith("Account: INSUFFICIENT_FEE");
    await expect(
      account
        .connect(user)
        .createTriggerOrder(
          gmxV1.target,
          collateral,
          index,
          isLong,
          size,
          price + 1n,
          price - 1n,
          minTriggerOrderExecutionFee,
          { value: minTriggerOrderExecutionFee }
        )
    ).to.be.revertedWith("Warehouse: NO_POSITION");

    const positionOrder = await gmxV1.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
    await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }], { value: minExecutionFee }); // prettier-ignore
    await executeIncreasePosition(account.target);

    const position = await account.getPosition(gmxV1.target, collateral, index, isLong); // prettier-ignore
    const triggerOrderSize = position.size / 2n;
    await account.connect(user).createTriggerOrder(gmxV1.target, collateral, index, isLong, triggerOrderSize, price + 1n, price - 1n, minTriggerOrderExecutionFee, { value: minTriggerOrderExecutionFee }); // prettier-ignore
    await account.connect(user).createTriggerOrder(gmxV1.target, collateral, index, isLong, triggerOrderSize, price + 1n, price - 1n, minTriggerOrderExecutionFee, { value: minTriggerOrderExecutionFee }); // prettier-ignore
    const positionKey = await warehouse.getPositionKey(gmxV1.target, collateral, index, isLong); // prettier-ignore
    expect(await warehouse.getTriggerOrder(positionKey, 0)).to.eql((await warehouse.getTriggerOrders(positionKey))[0]); // prettier-ignore
    expect(await warehouse.getTriggerOrder(positionKey, 1)).to.eql((await warehouse.getTriggerOrders(positionKey))[1]); // prettier-ignore
    expect(await warehouse.getTriggerOrderSize(positionKey)).to.be.equal(position.size); // prettier-ignore
    await expect(
      account
        .connect(user)
        .createTriggerOrder(
          gmxV1.target,
          collateral,
          index,
          isLong,
          1n,
          price + 1n,
          price - 1n,
          minTriggerOrderExecutionFee,
          { value: minTriggerOrderExecutionFee }
        )
    ).to.be.revertedWith("Warehouse: EXCEED_SIZE");

    await account.connect(user).cancelTriggerOrder(positionKey, 0);
    expect((await warehouse.getTriggerOrder(positionKey, 0)).state).to.be.equal(triggerOrderState.canceled); // prettier-ignore
    expect(await warehouse.getTriggerOrderSize(positionKey)).to.be.equal(position.size / 2n); // prettier-ignore

    await expect(
      warehouse.executeTriggerOrder(account.target, positionKey, 0)
    ).to.be.revertedWith("Warehouse: NOT_ORDER_KEEPER");
    await warehouse.setOrderKeeper(positionKeeper.address, true);
    await expect(
      warehouse
        .connect(positionKeeper)
        .executeTriggerOrder(account.target, positionKey, 2)
    ).to.be.revertedWith("Warehouse: ORDER_NOT_EXIST");
    await expect(
      warehouse
        .connect(positionKeeper)
        .executeTriggerOrder(account.target, positionKey, 0)
    ).to.be.revertedWith("Warehouse: ORDER_NOT_PENDING");
    await warehouse
      .connect(positionKeeper)
      .executeTriggerOrder(account.target, positionKey, 1);
    await executeDecreasePosition(account.target);
    expect(await warehouse.getTriggerOrderSize(positionKey)).to.be.equal(0);
  });

  it("mux", async () => {
    const {
      mux,
      deployer: positionKeeper,
      user,
      account,
      warehouse,
      minExecutionFee,
      ETH,
      WETH,
      fillPositionOrder,
    } = await loadFixture(deploy);

    const minTriggerOrderExecutionFee = await mux.getMinExecutionFee();

    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = true;

    await account.deposit(ETH, collateralAmount, { value: collateralAmount });

    const price = ethers.parseUnits("2000", 8);
    await expect(
      account.createTriggerOrder(
        mux.target,
        collateral,
        index,
        isLong,
        size,
        price + 1n,
        price - 1n,
        0
      )
    ).to.be.revertedWith("Account: NOT_OWNER");
    await expect(
      account
        .connect(user)
        .createTriggerOrder(
          mux.target,
          collateral,
          index,
          isLong,
          size,
          price + 1n,
          price - 1n,
          0
        )
    ).to.be.revertedWith("Warehouse: NO_POSITION");

    const positionOrder = await mux.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
    await account.connect(user).createMarketOrders([mux.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }], { value: minExecutionFee }); // prettier-ignore
    await fillPositionOrder();

    const position = await account.getPosition(mux.target, collateral, index, isLong); // prettier-ignore
    const triggerOrderSize = position.size / 2n;
    await account.connect(user).createTriggerOrder(mux.target, collateral, index, isLong, triggerOrderSize, price + 1n, price - 1n, minTriggerOrderExecutionFee, { value: minTriggerOrderExecutionFee }); // prettier-ignore
    await account.connect(user).createTriggerOrder(mux.target, collateral, index, isLong, triggerOrderSize, price + 1n, price - 1n, minTriggerOrderExecutionFee, { value: minTriggerOrderExecutionFee }); // prettier-ignore
    const positionKey = await warehouse.getPositionKey(mux.target, collateral, index, isLong); // prettier-ignore
    expect(await warehouse.getTriggerOrder(positionKey, 0)).to.eql((await warehouse.getTriggerOrders(positionKey))[0]); // prettier-ignore
    expect(await warehouse.getTriggerOrder(positionKey, 1)).to.eql((await warehouse.getTriggerOrders(positionKey))[1]); // prettier-ignore
    expect(await warehouse.getTriggerOrderSize(positionKey)).to.be.equal(position.size); // prettier-ignore
    await expect(
      account
        .connect(user)
        .createTriggerOrder(
          mux.target,
          collateral,
          index,
          isLong,
          1n,
          price + 1n,
          price - 1n,
          0
        )
    ).to.be.revertedWith("Warehouse: EXCEED_SIZE");

    await account.connect(user).cancelTriggerOrder(positionKey, 0);
    expect((await warehouse.getTriggerOrder(positionKey, 0)).state).to.be.equal(triggerOrderState.canceled); // prettier-ignore
    expect(await warehouse.getTriggerOrderSize(positionKey)).to.be.equal(position.size / 2n); // prettier-ignore

    await expect(
      warehouse.executeTriggerOrder(account.target, positionKey, 0)
    ).to.be.revertedWith("Warehouse: NOT_ORDER_KEEPER");
    await warehouse.setOrderKeeper(positionKeeper.address, true);
    await expect(
      warehouse
        .connect(positionKeeper)
        .executeTriggerOrder(account.target, positionKey, 2)
    ).to.be.revertedWith("Warehouse: ORDER_NOT_EXIST");
    await expect(
      warehouse
        .connect(positionKeeper)
        .executeTriggerOrder(account.target, positionKey, 0)
    ).to.be.revertedWith("Warehouse: ORDER_NOT_PENDING");
    await warehouse
      .connect(positionKeeper)
      .executeTriggerOrder(account.target, positionKey, 1);
    await fillPositionOrder();
    expect(await warehouse.getTriggerOrderSize(positionKey)).to.be.equal(0);
  });
});
