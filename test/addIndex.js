const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("./fixture");

describe("addIndex", () => {
  it("openPosition (GMX V1) / UNI, LINK", async () => {
    const {
      deployer,
      owner,
      account,
      exchange,
      DAI,
      UNI,
      LINK,
      gmxV1Adapter,
      deposit,
      executeIncreasePosition,
      executeDecreasePosition,
    } = await loadFixture(deploy);

    await exchange.connect(deployer).addCollateralTokens([DAI, UNI, LINK]);
    await exchange.connect(deployer).setStableToken(DAI, true);

    var collateral = UNI;
    var index = UNI;
    var collateralAmount = ethers.parseUnits("100", 18);
    var size = ethers.parseUnits("1000", 18);
    var isLong = true;
    await deposit(collateral, collateralAmount);
    await expect(
      account
        .connect(owner)
        .increasePosition(gmxV1Adapter.target, collateral, index, collateralAmount, size, isLong, 0, 0, 0, "0x", { value: await gmxV1Adapter.getMinExecutionFee() }) // prettier-ignore
    ).to.be.revertedWith("index: not supported");

    await exchange.connect(deployer).addIndexTokens([UNI, LINK]);

    await account
      .connect(owner)
      .increasePosition(gmxV1Adapter.target, collateral, index, collateralAmount, size, isLong, 0, 0, 0, "0x", { value: await gmxV1Adapter.getMinExecutionFee() }) // prettier-ignore
    await executeIncreasePosition(account.target);
    console.log(await gmxV1Adapter.getPosition(account.target, collateral, index, isLong)); // prettier-ignore
    console.log(await gmxV1Adapter.getWrapPosition(account.target, collateral, index, isLong)); // prettier-ignore
    await deposit(collateral, collateralAmount);
    await account
      .connect(owner)
      .increaseCollateral(gmxV1Adapter.target, collateral, index, isLong, collateral, collateralAmount, 0, 0, "0x", { value: await gmxV1Adapter.getMinExecutionFee() }); // prettier-ignore
    await executeIncreasePosition(account.target);
    console.log(await gmxV1Adapter.getPosition(account.target, collateral, index, isLong)); // prettier-ignore
    console.log(await gmxV1Adapter.getWrapPosition(account.target, collateral, index, isLong)); // prettier-ignore
    await account
      .connect(owner)
      .decreaseCollateral(gmxV1Adapter.target, collateral, index, isLong, collateralAmount, 0, 0, "0x", { value: await gmxV1Adapter.getMinExecutionFee() }); // prettier-ignore
    await executeDecreasePosition(account.target);
    console.log(await gmxV1Adapter.getPosition(account.target, collateral, index, isLong)); // prettier-ignore
    console.log(await gmxV1Adapter.getWrapPosition(account.target, collateral, index, isLong)); // prettier-ignore
    await account
      .connect(owner)
      .decreasePosition(gmxV1Adapter.target, collateral, index, isLong, size, 0, 0, 0, "0x", { value: await gmxV1Adapter.getMinExecutionFee() }); // prettier-ignore
    await executeDecreasePosition(account.target);
    console.log(await gmxV1Adapter.getPosition(account.target, collateral, index, isLong)); // prettier-ignore
    console.log(await gmxV1Adapter.getWrapPosition(account.target, collateral, index, isLong)); // prettier-ignore

    var collateral = LINK;
    var index = LINK;
    var collateralAmount = ethers.parseUnits("2", 18);
    var size = ethers.parseUnits("4", 18);
    var isLong = true;
    await deposit(collateral, collateralAmount);
    await account
      .connect(owner)
      .increasePosition(gmxV1Adapter.target, collateral, index, collateralAmount, size, isLong, 0, 0, 0, "0x", { value: await gmxV1Adapter.getMinExecutionFee() }) // prettier-ignore
    await executeIncreasePosition(account.target);
    console.log(await gmxV1Adapter.getPosition(account.target, collateral, index, isLong)); // prettier-ignore
    console.log(await gmxV1Adapter.getWrapPosition(account.target, collateral, index, isLong)); // prettier-ignore
    await deposit(collateral, collateralAmount);
    await account
      .connect(owner)
      .increaseCollateral(gmxV1Adapter.target, collateral, index, isLong, collateral, collateralAmount, 0, 0, "0x", { value: await gmxV1Adapter.getMinExecutionFee() }); // prettier-ignore
    await executeIncreasePosition(account.target);
    console.log(await gmxV1Adapter.getPosition(account.target, collateral, index, isLong)); // prettier-ignore
    console.log(await gmxV1Adapter.getWrapPosition(account.target, collateral, index, isLong)); // prettier-ignore
    await account
      .connect(owner)
      .decreaseCollateral(gmxV1Adapter.target, collateral, index, isLong, collateralAmount, 0, 0, "0x", { value: await gmxV1Adapter.getMinExecutionFee() }); // prettier-ignore
    await executeDecreasePosition(account.target);
    console.log(await gmxV1Adapter.getPosition(account.target, collateral, index, isLong)); // prettier-ignore
    console.log(await gmxV1Adapter.getWrapPosition(account.target, collateral, index, isLong)); // prettier-ignore
    await account
      .connect(owner)
      .decreasePosition(gmxV1Adapter.target, collateral, index, isLong, size, 0, 0, 0, "0x", { value: await gmxV1Adapter.getMinExecutionFee() }); // prettier-ignore
    await executeDecreasePosition(account.target);
    console.log(await gmxV1Adapter.getPosition(account.target, collateral, index, isLong)); // prettier-ignore
    console.log(await gmxV1Adapter.getWrapPosition(account.target, collateral, index, isLong)); // prettier-ignore
  });

  it("openPosition (MUX) / BNB, ARB", async () => {
    const {
      deployer,
      owner,
      account,
      exchange,
      DAI,
      UNI,
      LINK,
      BNB,
      ARB,
      muxAdapter,
      deposit,
      fillPositionOrder,
      fillWithdrawalOrder,
    } = await loadFixture(deploy);

    await exchange.connect(deployer).addCollateralTokens([DAI, UNI, LINK]);
    await exchange.connect(deployer).setStableToken(DAI, true);

    var collateral = DAI;
    var index = ARB;
    var collateralAmount = ethers.parseUnits("100", 18);
    var size = ethers.parseUnits("1000", 18);
    var isLong = true;
    await deposit(collateral, collateralAmount);
    await expect(
      account
        .connect(owner)
        .increasePosition(muxAdapter.target, collateral, index, collateralAmount, size, isLong, 0, 0, 0, "0x", { value: await muxAdapter.getMinExecutionFee() }) // prettier-ignore
    ).to.be.revertedWith("index: not supported");

    await exchange.connect(deployer).addIndexTokens([UNI, LINK, ARB]);

    await account
      .connect(owner)
      .increasePosition(muxAdapter.target, collateral, index, collateralAmount, size, isLong, 0, 0, 0, "0x", { value: await muxAdapter.getMinExecutionFee() }) // prettier-ignore
    await fillPositionOrder();
    console.log(await muxAdapter.getPosition(account.target, collateral, index, isLong)); // prettier-ignore
    console.log(await muxAdapter.getWrapPosition(account.target, collateral, index, isLong)); // prettier-ignore
    await deposit(collateral, collateralAmount);
    await account
      .connect(owner)
      .increaseCollateral(muxAdapter.target, collateral, index, isLong, collateral, collateralAmount, 0, 0, "0x", { value: await muxAdapter.getMinExecutionFee() }); // prettier-ignore
    console.log(await muxAdapter.getPosition(account.target, collateral, index, isLong)); // prettier-ignore
    console.log(await muxAdapter.getWrapPosition(account.target, collateral, index, isLong)); // prettier-ignore
    await account
      .connect(owner)
      .decreaseCollateral(muxAdapter.target, collateral, index, isLong, collateralAmount, 0, 0, "0x", { value: await muxAdapter.getMinExecutionFee() }); // prettier-ignore
    await fillWithdrawalOrder();
    console.log(await muxAdapter.getPosition(account.target, collateral, index, isLong)); // prettier-ignore
    console.log(await muxAdapter.getWrapPosition(account.target, collateral, index, isLong)); // prettier-ignore
    await account
      .connect(owner)
      .decreasePosition(muxAdapter.target, collateral, index, isLong, size, 0, 0, 0, "0x", { value: await muxAdapter.getMinExecutionFee() }); // prettier-ignore
    await fillPositionOrder();
    console.log(await muxAdapter.getPosition(account.target, collateral, index, isLong)); // prettier-ignore
    console.log(await muxAdapter.getWrapPosition(account.target, collateral, index, isLong)); // prettier-ignore
  });
});
