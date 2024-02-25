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

    const collateral = USDC;
    const index = WBTC;
    const collateralAmount = ethers.parseUnits("1000", 6);
    const size = ethers.parseUnits("0.01", 8);
    const isLong = false;

    const acceptablePrice = ethers.parseUnits("40000", 18);
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

    var price = ethers.parseUnits("36000", 8);
    await setPrice(muxAdapter, WBTC, price, price, true);

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
