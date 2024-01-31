const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture");

describe("marketOrder", () => {
  it("collect deposit fee", async () => {
    const {
      owner,
      account,
      gmxV1Adapter,
      logger,
      collateralList,
      WETH,
      deposit,
      executeIncreasePosition,
    } = await loadFixture(deploy);

    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = true;

    await deposit(WETH, collateralAmount);

    const adapterFee = await gmxV1Adapter.getMinExecutionFee();
    await expect(
      account.connect(owner).increasePosition(
        gmxV1Adapter.target,
        WETH,
        WETH,
        collateralAmount,
        size,
        isLong,
        0,
        { value: adapterFee } // by user
      )
    )
      .to.emit(logger, "PositionIncreased")
      .withArgs(
        1,
        account.target,
        gmxV1Adapter.target,
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        100,
        0
      );
    await executeIncreasePosition(account.target);

    // console.log("`executeIncreasePosition` done");

    // for (const collateral of collateralList) {
    //   await deposit(collateral.address, collateral.amount);
    //   await account
    //     .connect(owner)
    //     .increaseCollateral(
    //       gmxV1Adapter.target,
    //       WETH,
    //       WETH,
    //       isLong,
    //       collateral.address,
    //       collateral.amount,
    //       0,
    //       { value: adapterFee }
    //     );
    //   await executeIncreasePosition(account.target);
    // }
  });

  // it("fee delegated", async () => {
  //   const collateral = WETH;
  //   const index = WETH;
  //   const collateralAmount = ethers.parseEther("1");
  //   const size = ethers.parseEther("10");
  //   const isLong = true;

  //   await deposit(collateral, collateralAmount);
  //   const answers = await quoter.quote(
  //     account.target,
  //     [gmxV1Adapter.target, muxAdapter.target],
  //     {
  //       collateral: collateral,
  //       index: index,
  //       collateralAmount: collateralAmount,
  //       size: size,
  //       isLong: isLong,
  //     }
  //   );

  //   console.log(answers);

  //   const selectedAdapter = answers[0].adapter;
  //   const adapter = await ethers.getContractAt("IAdapter", selectedAdapter);
  //   const adapterFee = await adapter.getMinExecutionFee();
  //   await account.connect(owner).increasePosition(
  //     adapter,
  //     collateral,
  //     index,
  //     collateralAmount,
  //     size,
  //     isLong,
  //     0,
  //     { value: adapterFee } // by user
  //   );
  //   await fillPositionOrder();

  //   await expect(
  //     account.connect(owner).increasePosition(
  //       adapter,
  //       collateral,
  //       index,
  //       collateralAmount,
  //       size,
  //       isLong,
  //       0,
  //       { value: adapterFee } // by user
  //     )
  //   )
  //     .to.emit(logger, "Deposited")
  //     .withArgs(account.target, token, tokenAmount);
  // });
});
