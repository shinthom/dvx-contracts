const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { deploy } = require("../fixture/setup");

const toObj = (answer) => {
  return {
    adapter: answer[0],
    collateralPrice: answer[1],
    indexPrice: answer[2],
    fee: answer[3],
    availableLiquidity: answer[4],
    positionOrder: {
      orderType: answer[5][0],
      path: [...answer[5][1]],
      index: answer[5][2],
      collateralAmount: answer[5][3],
      size: answer[5][4],
      isLong: answer[5][5],
    },
  };
};

describe("limitOrder", () => {
  it("create", async () => {
    const { user, other, account, warehouse, quoter, gmxV1, mux, ETH, WETH, replaceFastPriceFeedAndSetPrice, fillPositionOrder } = await loadFixture(deploy); // prettier-ignore
    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = true;
    const price = ethers.parseUnits("2000", 18);
    expect(
      account
        .connect(user)
        .createLimitOrder(
          collateral,
          index,
          collateralAmount,
          size,
          isLong,
          price
        )
    ).to.be.revertedWith("INSUFFICIENT_BALANCE");
    await account.deposit(ETH, collateralAmount, { value: collateralAmount });
    await account.connect(user).createLimitOrder(collateral, index, collateralAmount, size, isLong, price); // prettier-ignore
    const limitOrderIndex = await warehouse.getLimitOrderIndex(account.target); // prettier-ignore
    expect(limitOrderIndex).to.be.equal(1);
    const limitOrder = await warehouse.getLimitOrder(account.target, limitOrderIndex - 1n); // prettier-ignore
    expect(await account.getLockedBalance(collateral)).to.be.equal(collateralAmount); // prettier-ignore
    expect(
      account
        .connect(user)
        .createLimitOrder(
          collateral,
          index,
          collateralAmount,
          size,
          isLong,
          price
        )
    ).to.be.revertedWith("INSUFFICIENT_BALANCE");
  });

  it("cancel", async () => {
    const { user, other, account, warehouse, quoter, gmxV1, mux, ETH, WETH, replaceFastPriceFeedAndSetPrice, fillPositionOrder } = await loadFixture(deploy); // prettier-ignore
    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = true;
    const price = ethers.parseUnits("2000", 18);
    await account.deposit(ETH, collateralAmount, { value: collateralAmount });
    await account.connect(user).createLimitOrder(collateral, index, collateralAmount, size, isLong, price); // prettier-ignore
    const limitOrderIndex = await warehouse.getLimitOrderIndex(account.target); // prettier-ignore
    expect(limitOrderIndex).to.be.equal(1);
    expect(await account.getLockedBalance(collateral)).to.be.equal(collateralAmount); // prettier-ignore

    await account.connect(user).cancelLimitOrder(0);
    expect(await account.getLockedBalance(collateral)).to.be.equal(0); // prettier-ignore
    expect(account.connect(user).cancelLimitOrder(0)).to.be.revertedWith("Warehouse: non-existent limit order"); // prettier-ignore
  });

  it("execute", async () => {
    const { deployer: positionKeeper, user, account, warehouse, quoter, gmxV1, mux, ETH, WETH, fillPositionOrder } = await loadFixture(deploy); // prettier-ignore
    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = true;
    const price = ethers.parseUnits("2000", 18);
    await account.deposit(ETH, collateralAmount, { value: collateralAmount });
    await account.connect(user).createLimitOrder(collateral, index, collateralAmount, size, isLong, price); // prettier-ignore
    const limitOrderIndex = await warehouse.getLimitOrderIndex(account.target); // prettier-ignore
    expect(limitOrderIndex).to.be.equal(1);
    expect(await account.getLockedBalance(collateral)).to.be.equal(collateralAmount); // prettier-ignore

    const request = { collateral, index, collateralAmount, size, isLong };
    const answers = await quoter.quote(
      account.target,
      [gmxV1.target, mux.target],
      request
    );
    const answer = toObj(answers[0]);
    expect(
      warehouse.executeLimitOrder(account.target, 0, [answer])
    ).to.be.revertedWith("Warehouse: not order keeper");
    await warehouse.setOrderKeeper(positionKeeper.address, true);
    await warehouse.executeLimitOrder(account.target, 0, [answer]);
    await fillPositionOrder();
    expect(await account.getLockedBalance(collateral)).to.be.equal(0); // prettier-ignore
  });
});
