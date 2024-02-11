const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("./fixture");

describe("marginManagement", async () => {
  it("addMargin - gmxV1", async () => {
    const {
      orderKeeper,
      account,
      gmxV1Adapter,
      WETH,
      WBTC,
      checkPosition,
      deposit,
      setDummyPrice,
      increasePosition,
      executeIncreasePosition,
    } = await loadFixture(deploy);
    await setDummyPrice();

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;
    var acceptablePrice = ethers.parseUnits("2000", 18);

    await deposit(collateral, collateralAmount);
    await increasePosition(gmxV1Adapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    await checkPosition(gmxV1Adapter, account, collateral, index, isLong);

    const marginWETH = ethers.parseEther("0.1");
    const marginWBTC = ethers.parseEther("0.005");

    const adapterFee = await gmxV1Adapter.getMinExecutionFee();
    await expect(
      account.addAcmmMargin(
        gmxV1Adapter.target,
        collateral,
        index,
        isLong,
        [WETH],
        [marginWETH],
        { value: adapterFee }
      )
    ).to.be.revertedWith("msg.sender: not order keeper");

    await expect(
      account
        .connect(orderKeeper)
        .addAcmmMargin(
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          [WETH],
          [marginWETH],
          { value: adapterFee }
        )
    ).to.be.revertedWith("marginAmount: greater than balance");

    await expect(
      account
        .connect(orderKeeper)
        .addAcmmMargin(
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          [WBTC],
          [marginWBTC],
          { value: adapterFee }
        )
    ).to.be.revertedWith("marginAmount: greater than balance");

    await deposit(WETH, marginWETH);
    await expect(
      account
        .connect(orderKeeper)
        .addAcmmMargin(
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          [WETH, WBTC],
          [marginWETH, marginWBTC],
          { value: adapterFee }
        )
    ).to.be.revertedWith("marginAmount: greater than balance");

    await deposit(WBTC, marginWBTC);
    await account
      .connect(orderKeeper)
      .addAcmmMargin(
        gmxV1Adapter.target,
        collateral,
        index,
        isLong,
        [WETH, WBTC],
        [marginWETH, marginWBTC],
        { value: adapterFee }
      );
    await executeIncreasePosition(account.target);
    await checkPosition(gmxV1Adapter, account, collateral, index, isLong);
  });

  it("addMargin - mux", async () => {
    const {
      orderKeeper,
      account,
      muxAdapter,
      WETH,
      WBTC,
      checkPosition,
      deposit,
      setDummyPrice,
      increasePosition,
    } = await loadFixture(deploy);
    await setDummyPrice();

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;
    var acceptablePrice = ethers.parseUnits("2000", 18);

    await deposit(collateral, collateralAmount);
    await increasePosition(muxAdapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    await checkPosition(muxAdapter, account, collateral, index, isLong);

    const marginWETH = ethers.parseEther("0.1");
    const marginWBTC = ethers.parseEther("0.005");

    const adapterFee = await muxAdapter.getMinExecutionFee();
    await expect(
      account.addAcmmMargin(
        muxAdapter.target,
        collateral,
        index,
        isLong,
        [WETH],
        [marginWETH],
        { value: adapterFee }
      )
    ).to.be.revertedWith("msg.sender: not order keeper");

    await expect(
      account
        .connect(orderKeeper)
        .addAcmmMargin(
          muxAdapter.target,
          collateral,
          index,
          isLong,
          [WETH],
          [marginWETH],
          { value: adapterFee }
        )
    ).to.be.revertedWith("marginAmount: greater than balance");

    await expect(
      account
        .connect(orderKeeper)
        .addAcmmMargin(
          muxAdapter.target,
          collateral,
          index,
          isLong,
          [WBTC],
          [marginWBTC],
          { value: adapterFee }
        )
    ).to.be.revertedWith("marginAmount: greater than balance");

    await deposit(WETH, marginWETH);
    await expect(
      account
        .connect(orderKeeper)
        .addAcmmMargin(
          muxAdapter.target,
          collateral,
          index,
          isLong,
          [WETH, WBTC],
          [marginWETH, marginWBTC],
          { value: adapterFee }
        )
    ).to.be.revertedWith("marginAmount: greater than balance");

    await deposit(WBTC, marginWBTC);
    await account
      .connect(orderKeeper)
      .addAcmmMargin(
        muxAdapter.target,
        collateral,
        index,
        isLong,
        [WETH, WBTC],
        [marginWETH, marginWBTC],
        { value: adapterFee }
      );
    // await fillPositionOrder();

    await checkPosition(muxAdapter, account, collateral, index, isLong);
  });

  it("subMargin - gmxV1", async () => {
    const {
      orderKeeper,
      account,
      gmxV1Adapter,
      WETH,
      checkBalance,
      checkPosition,
      deposit,
      setPrice,
      setDummyPrice,
      increasePosition,
      executeDecreasePosition,
    } = await loadFixture(deploy);
    await setDummyPrice();

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;
    var acceptablePrice = ethers.parseUnits("2000", 18);

    await deposit(collateral, collateralAmount);
    await increasePosition(gmxV1Adapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    await checkPosition(gmxV1Adapter, account, collateral, index, isLong);

    var price = ethers.parseUnits("2200", 30);
    await setPrice(gmxV1Adapter, index, price, price, true);

    var marginAmount = ethers.parseEther("0.1");
    var adapterFee = await gmxV1Adapter.getMinExecutionFee();
    await account
      .connect(orderKeeper)
      .subAcmmMargin(
        gmxV1Adapter.target,
        collateral,
        index,
        isLong,
        marginAmount,
        { value: adapterFee }
      );
    await executeDecreasePosition(account.target);
    await checkBalance(account);
    await checkPosition(gmxV1Adapter, account, collateral, index, isLong);
  });

  it("subMargin - mux", async () => {
    const {
      orderKeeper,
      account,
      muxAdapter,
      WETH,
      checkBalance,
      checkPosition,
      deposit,
      setPrice,
      setDummyPrice,
      increasePosition,
      fillWithdrawalOrder,
    } = await loadFixture(deploy);
    await setDummyPrice();

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;
    var acceptablePrice = ethers.parseUnits("2000", 18);

    await deposit(collateral, collateralAmount);
    await increasePosition(muxAdapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    await checkPosition(muxAdapter, account, collateral, index, isLong);

    var price = ethers.parseUnits("2200", 8);
    await setPrice(muxAdapter, index, price, price, true);

    var marginAmount = ethers.parseEther("0.1");
    var adapterFee = await muxAdapter.getMinExecutionFee();
    await account
      .connect(orderKeeper)
      .subAcmmMargin(
        muxAdapter.target,
        collateral,
        index,
        isLong,
        marginAmount,
        { value: adapterFee }
      );
    await fillWithdrawalOrder();
    await checkBalance(account);
    await checkPosition(muxAdapter, account, collateral, index, isLong);
  });
});
