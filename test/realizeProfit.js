const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("./fixture");

const deadline = Math.ceil(Date.now() / 1000) + 60 * 60 * 3;

describe("marketOrder", () => {
  it("directly from EOA", async () => {
    const {
      owner,
      account,
      muxAdapter,
      WETH,
      USDC,
      WBTC,
      checkBalance,
      setPrice,
      setDummyPrice,
      deposit,
      fillPositionOrder,
      fillWithdrawalOrder,
    } = await loadFixture(deploy);
    await setDummyPrice();

    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = true;

    const acceptablePrice = ethers.parseUnits("2000", 8);
    const networkFee = 0;
    const adapterFee = await muxAdapter.getMinExecutionFee();

    // deposit
    await deposit(collateral, collateralAmount);
    // increasePosition
    await account
      .connect(owner)
      .increasePosition(
        muxAdapter.target,
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        acceptablePrice,
        networkFee,
        0,
        "0x",
        { value: adapterFee }
      );
    await fillPositionOrder();
    var wrapPosition = await muxAdapter.getWrapPosition(
      account.target,
      collateral,
      index,
      isLong
    );
    console.log(wrapPosition);
    var position = await muxAdapter.getPosition(
      account.target,
      collateral,
      index,
      isLong
    );
    console.log(position);

    var price = ethers.parseUnits("2200", 8);
    await setPrice(muxAdapter, WETH, price, price, true);

    const pnlUsd = await muxAdapter.getPositionPnlUsd(
      account.target,
      collateral,
      index,
      isLong
    );
    console.log("pnlUsd:", pnlUsd.toString());
    // 10 % of 20000 = 2000
    // 2000

    await account
      .connect(owner)
      .decreasePosition(
        muxAdapter.target,
        collateral,
        index,
        isLong,
        size,
        acceptablePrice,
        networkFee,
        0,
        "0x",
        { value: adapterFee }
      );
    await fillPositionOrder();
    var wrapPosition = await muxAdapter.getWrapPosition(
      account.target,
      collateral,
      index,
      isLong
    );
    var position = await muxAdapter.getPosition(
      account.target,
      collateral,
      index,
      isLong
    );
    console.log(position);

    await checkBalance(account);

    const profitToken = await muxAdapter.getProfitToken(
      collateral,
      index,
      isLong
    );
    console.log(profitToken);
  });
});
