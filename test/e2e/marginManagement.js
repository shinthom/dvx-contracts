const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture");

describe("marginManagement", async () => {
  it("addMargin - gmxV1", async () => {
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

  // it("getWrapPositionPnlUsd - gmxV1", async () => {
  //   const {
  //     account,
  //     gmxV1Adapter,
  //     WETH,
  //     WBTC,
  //     USDC,
  //     checkBalance,
  //     checkPosition,
  //     deposit,
  //     setDummyPrice,
  //     setPrice,
  //     increasePosition,
  //   } = await loadFixture(deploy);
  //   await setDummyPrice();

  //   var collateral = WETH;
  //   var index = WETH;
  //   var collateralAmount = ethers.parseEther("1");
  //   var size = ethers.parseEther("10");
  //   var isLong = true;
  //   var acceptablePrice = ethers.parseUnits("2000", 18);

  //   await deposit(collateral, collateralAmount);
  //   await checkBalance(account);
  //   await checkPosition(gmxV1Adapter, account, collateral, index, isLong);

  //   await increasePosition(gmxV1Adapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
  //   await checkBalance(account);
  //   await checkPosition(gmxV1Adapter, account, collateral, index, isLong);

  //   // [market: WETH, position: long, status: profit]
  //   var price = ethers.parseUnits("2200", 30);
  //   await setPrice(gmxV1Adapter, index, price, price, true);
  //   var positionPnlUsd = await gmxV1Adapter.getWrapPositionPnlUsd(
  //     account.target,
  //     collateral,
  //     index,
  //     isLong
  //   );
  //   console.log("positionPnlUsd", positionPnlUsd);

  //   // [market: WETH, position: long, status: loss]
  //   var price = ethers.parseUnits("1800", 30);
  //   await setPrice(gmxV1Adapter, index, price, price, true);
  //   var positionPnlUsd = await gmxV1Adapter.getWrapPositionPnlUsd(
  //     account.target,
  //     collateral,
  //     index,
  //     isLong
  //   );
  //   console.log("positionPnlUsd", positionPnlUsd);

  //   var collateral = WBTC;
  //   var index = WBTC;
  //   var collateralAmount = ethers.parseUnits("0.1", 8);
  //   var size = ethers.parseUnits("1", 8);
  //   var isLong = true;

  //   await deposit(collateral, collateralAmount);
  //   await checkBalance(account);
  //   await checkPosition(gmxV1Adapter, account, collateral, index, isLong);

  //   await increasePosition(gmxV1Adapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
  //   await checkBalance(account);
  //   await checkPosition(gmxV1Adapter, account, collateral, index, isLong);

  //   // [market: WBTC, position: long, status: profit]
  //   var price = ethers.parseUnits("44000", 30);
  //   await setPrice(gmxV1Adapter, index, price, price, true);
  //   var positionPnlUsd = await gmxV1Adapter.getWrapPositionPnlUsd(
  //     account.target,
  //     collateral,
  //     index,
  //     isLong
  //   );
  //   console.log("positionPnlUsd", positionPnlUsd);

  //   // [market: WBTC, position: long, status: loss]
  //   var price = ethers.parseUnits("36000", 30);
  //   await setPrice(gmxV1Adapter, index, price, price, true);
  //   var positionPnlUsd = await gmxV1Adapter.getWrapPositionPnlUsd(
  //     account.target,
  //     collateral,
  //     index,
  //     isLong
  //   );
  //   console.log("positionPnlUsd", positionPnlUsd);

  //   var collateral = USDC;
  //   var index = WETH;
  //   var collateralAmount = ethers.parseUnits("100", 6);
  //   var size = ethers.parseEther("1");
  //   var isLong = false;

  //   await deposit(collateral, collateralAmount);
  //   await checkBalance(account);
  //   await checkPosition(gmxV1Adapter, account, collateral, index, isLong);

  //   await increasePosition(gmxV1Adapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
  //   await checkBalance(account);
  //   await checkPosition(gmxV1Adapter, account, collateral, index, isLong);

  //   // [market: WETH, position: short, status: profit]
  //   var price = ethers.parseUnits("1800", 30);
  //   await setPrice(gmxV1Adapter, index, price, price, true);
  //   var positionPnlUsd = await gmxV1Adapter.getWrapPositionPnlUsd(
  //     account.target,
  //     collateral,
  //     index,
  //     isLong
  //   );
  //   console.log("positionPnlUsd", positionPnlUsd);

  //   // [market: WETH, position: short, status: loss]
  //   var price = ethers.parseUnits("2200", 30);
  //   await setPrice(gmxV1Adapter, index, price, price, true);
  //   var positionPnlUsd = await gmxV1Adapter.getWrapPositionPnlUsd(
  //     account.target,
  //     collateral,
  //     index,
  //     isLong
  //   );
  //   console.log("positionPnlUsd", positionPnlUsd);

  //   var collateral = USDC;
  //   var index = WBTC;
  //   var collateralAmount = ethers.parseUnits("100", 6);
  //   var size = ethers.parseUnits("0.1", 8);
  //   var isLong = false;

  //   await deposit(collateral, collateralAmount);
  //   await checkBalance(account);
  //   await checkPosition(gmxV1Adapter, account, collateral, index, isLong);

  //   await increasePosition(gmxV1Adapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
  //   await checkBalance(account);
  //   await checkPosition(gmxV1Adapter, account, collateral, index, isLong);

  //   // [market: WBTC, position: short, status: profit]
  //   var price = ethers.parseUnits("36000", 30);
  //   await setPrice(gmxV1Adapter, index, price, price, true);
  //   var positionPnlUsd = await gmxV1Adapter.getWrapPositionPnlUsd(
  //     account.target,
  //     collateral,
  //     index,
  //     isLong
  //   );
  //   console.log("positionPnlUsd", positionPnlUsd);

  //   // [market: WBTC, position: short, status: loss]
  //   var price = ethers.parseUnits("44000", 30);
  //   await setPrice(gmxV1Adapter, index, price, price, true);
  //   var positionPnlUsd = await gmxV1Adapter.getWrapPositionPnlUsd(
  //     account.target,
  //     collateral,
  //     index,
  //     isLong
  //   );
  //   console.log("positionPnlUsd", positionPnlUsd);
  // });

  // it("getWrapPositionPnlUsd - mux", async () => {
  //   const {
  //     account,
  //     muxAdapter,
  //     WETH,
  //     WBTC,
  //     USDC,
  //     checkBalance,
  //     checkPosition,
  //     deposit,
  //     setDummyPrice,
  //     setPrice,
  //     increasePosition,
  //   } = await loadFixture(deploy);
  //   await setDummyPrice();

  //   var collateral = WETH;
  //   var index = WETH;
  //   var collateralAmount = ethers.parseEther("1");
  //   var size = ethers.parseEther("10");
  //   var isLong = true;

  //   await deposit(collateral, collateralAmount);
  //   await checkBalance(account);
  //   await checkPosition(muxAdapter, account, collateral, index, isLong);

  //   await increasePosition(muxAdapter, collateral, index, collateralAmount, size, isLong); // prettier-ignore
  //   await checkBalance(account);
  //   await checkPosition(muxAdapter, account, collateral, index, isLong);

  //   // [market: WETH, position: long, status: profit]
  //   var price = ethers.parseUnits("2200", 8);
  //   await setPrice(muxAdapter, index, price, price, true);
  //   var positionPnlUsd = await muxAdapter.getWrapPositionPnlUsd(
  //     account.target,
  //     collateral,
  //     index,
  //     isLong
  //   );
  //   console.log("positionPnlUsd", positionPnlUsd);

  //   // [market: WETH, position: long, status: loss]
  //   var price = ethers.parseUnits("1800", 8);
  //   await setPrice(muxAdapter, index, price, price, true);
  //   var positionPnlUsd = await muxAdapter.getWrapPositionPnlUsd(
  //     account.target,
  //     collateral,
  //     index,
  //     isLong
  //   );
  //   console.log("positionPnlUsd", positionPnlUsd);

  //   var collateral = WBTC;
  //   var index = WBTC;
  //   var collateralAmount = ethers.parseUnits("0.1", 8);
  //   var size = ethers.parseUnits("1", 8);
  //   var isLong = true;

  //   await deposit(collateral, collateralAmount);
  //   await checkBalance(account);
  //   await checkPosition(muxAdapter, account, collateral, index, isLong);

  //   await increasePosition(muxAdapter, collateral, index, collateralAmount, size, isLong); // prettier-ignore
  //   await checkBalance(account);
  //   await checkPosition(muxAdapter, account, collateral, index, isLong);

  //   // [market: WBTC, position: long, status: profit]
  //   var price = ethers.parseUnits("44000", 8);
  //   await setPrice(muxAdapter, index, price, price, true);
  //   var positionPnlUsd = await muxAdapter.getWrapPositionPnlUsd(
  //     account.target,
  //     collateral,
  //     index,
  //     isLong
  //   );
  //   console.log("positionPnlUsd", positionPnlUsd);

  //   // [market: WBTC, position: long, status: loss]
  //   var price = ethers.parseUnits("36000", 8);
  //   await setPrice(muxAdapter, index, price, price, true);
  //   var positionPnlUsd = await muxAdapter.getWrapPositionPnlUsd(
  //     account.target,
  //     collateral,
  //     index,
  //     isLong
  //   );
  //   console.log("positionPnlUsd", positionPnlUsd);

  //   var collateral = USDC;
  //   var index = WETH;
  //   var collateralAmount = ethers.parseUnits("100", 6);
  //   var size = ethers.parseEther("1");
  //   var isLong = false;

  //   await deposit(collateral, collateralAmount);
  //   await checkBalance(account);
  //   await checkPosition(muxAdapter, account, collateral, index, isLong);

  //   await increasePosition(muxAdapter, collateral, index, collateralAmount, size, isLong); // prettier-ignore
  //   await checkBalance(account);
  //   await checkPosition(muxAdapter, account, collateral, index, isLong);

  //   // [market: WETH, position: short, status: profit]
  //   var price = ethers.parseUnits("1800", 8);
  //   await setPrice(muxAdapter, index, price, price, true);
  //   var positionPnlUsd = await muxAdapter.getWrapPositionPnlUsd(
  //     account.target,
  //     collateral,
  //     index,
  //     isLong
  //   );
  //   console.log("positionPnlUsd", positionPnlUsd);

  //   // [market: WETH, position: short, status: loss]
  //   var price = ethers.parseUnits("2200", 8);
  //   await setPrice(muxAdapter, index, price, price, true);
  //   var positionPnlUsd = await muxAdapter.getWrapPositionPnlUsd(
  //     account.target,
  //     collateral,
  //     index,
  //     isLong
  //   );
  //   console.log("positionPnlUsd", positionPnlUsd);

  //   var collateral = USDC;
  //   var index = WBTC;
  //   var collateralAmount = ethers.parseUnits("100", 6);
  //   var size = ethers.parseUnits("0.1", 8);
  //   var isLong = false;

  //   await deposit(collateral, collateralAmount);
  //   await checkBalance(account);
  //   await checkPosition(muxAdapter, account, collateral, index, isLong);

  //   await increasePosition(muxAdapter, collateral, index, collateralAmount, size, isLong); // prettier-ignore
  //   await checkBalance(account);
  //   await checkPosition(muxAdapter, account, collateral, index, isLong);

  //   // [market: WBTC, position: short, status: profit]
  //   var price = ethers.parseUnits("36000", 8);
  //   await setPrice(muxAdapter, index, price, price, true);
  //   var positionPnlUsd = await muxAdapter.getWrapPositionPnlUsd(
  //     account.target,
  //     collateral,
  //     index,
  //     isLong
  //   );
  //   console.log("positionPnlUsd", positionPnlUsd);

  //   // [market: WBTC, position: short, status: loss]
  //   var price = ethers.parseUnits("44000", 8);
  //   await setPrice(muxAdapter, index, price, price, true);
  //   var positionPnlUsd = await muxAdapter.getWrapPositionPnlUsd(
  //     account.target,
  //     collateral,
  //     index,
  //     isLong
  //   );
  //   console.log("positionPnlUsd", positionPnlUsd);
  // });
});
