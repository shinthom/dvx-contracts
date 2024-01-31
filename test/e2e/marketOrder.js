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

  describe("gmxV1 - long", () => {
    it("should execute a market order", async () => {
      const collateral = WETH;
      const index = WETH;
      const collateralAmount = ethers.parseEther("1");
      const size = ethers.parseEther("10");
      const isLong = true;

      await deposit(WETH, collateralAmount);
      await checkBalance(account);

      // const request = { collateral, index, collateralAmount, size, isLong };
      // const answers = await quoter.quote(
      //   account.target,
      //   [gmxV1Adapter.target],
      //   request
      // );

      const executionFee = await gmxV1Adapter.getMinExecutionFee();
      await account
        .connect(user)
        .increasePosition(
          gmxV1Adapter.target,
          collateral,
          index,
          collateralAmount,
          size,
          isLong,
          0,
          { value: executionFee }
        );
      await executeIncreasePosition(account.target);
      console.log(
        await gmxV1Adapter.getPosition(
          account.target,
          collateral,
          index,
          isLong
        )
      );
      await checkBalance(account);

      await deposit(collateral, collateralAmount);
      await account
        .connect(user)
        .increaseCollateral(
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          collateral,
          collateralAmount,
          0,
          {
            value: executionFee,
          }
        );
      await executeIncreasePosition(account.target);
      console.log(
        await gmxV1Adapter.getPosition(
          account.target,
          collateral,
          index,
          isLong
        )
      );
      await checkBalance(account);

      await account
        .connect(user)
        .decreaseCollateral(
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          collateralAmount,
          0,
          {
            value: executionFee,
          }
        );
      await executeDecreasePosition(account.target);
      console.log(
        await gmxV1Adapter.getPosition(
          account.target,
          collateral,
          index,
          isLong
        )
      );
      await checkBalance(account);

      await account
        .connect(user)
        .decreasePosition(
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          size,
          0,
          {
            value: executionFee,
          }
        );
      await executeDecreasePosition(account.target);
      console.log(
        await gmxV1Adapter.getPosition(
          account.target,
          collateral,
          index,
          isLong
        )
      );
      await checkBalance(account);
    });
  });

  describe("mux", () => {
    it("should execute a market order", async () => {
      const {
        user,
        account,
        muxAdapter,
        WETH,
        WBTC,
        checkBalance,
        deposit,
        fillPositionOrder,
        fillWithdrawalOrder,
      } = await loadFixture(deploy);

      const collateral = WETH;
      const index = WBTC;
      const collateralAmount = ethers.parseEther("1");
      const size = ethers.parseUnits("1", 8);
      const isLong = true;

      await deposit(WETH, collateralAmount);
      await checkBalance(account);

      // const request = { collateral, index, collateralAmount, size, isLong };
      // const answers = await quoter.quote(
      //   account.target,
      //   [gmxV1Adapter.target],
      //   request
      // );

      const executionFee = await muxAdapter.getMinExecutionFee();
      await account
        .connect(user)
        .increasePosition(
          muxAdapter.target,
          collateral,
          index,
          collateralAmount,
          size,
          isLong,
          0,
          { value: executionFee }
        );
      await fillPositionOrder();
      console.log(
        await muxAdapter.getWrapPosition(
          account.target,
          collateral,
          index,
          isLong
        )
      );
      await checkBalance(account);

      await deposit(collateral, collateralAmount);
      await account
        .connect(user)
        .increaseCollateral(
          muxAdapter.target,
          collateral,
          index,
          isLong,
          collateral,
          collateralAmount,
          0,
          {
            value: executionFee,
          }
        );
      console.log(
        await muxAdapter.getWrapPosition(
          account.target,
          collateral,
          index,
          isLong
        )
      );
      await checkBalance(account);

      await account
        .connect(user)
        .decreaseCollateral(
          muxAdapter.target,
          collateral,
          index,
          isLong,
          collateralAmount,
          0,
          {
            value: executionFee,
          }
        );
      await fillWithdrawalOrder(account.target);
      console.log(
        await muxAdapter.getWrapPosition(
          account.target,
          collateral,
          index,
          isLong
        )
      );
      await checkBalance(account);

      await account
        .connect(user)
        .decreasePosition(
          muxAdapter.target,
          collateral,
          index,
          isLong,
          size,
          0,
          { value: executionFee }
        );
      await fillPositionOrder();
      console.log(
        await muxAdapter.getWrapPosition(
          account.target,
          collateral,
          index,
          isLong
        )
      );
      await checkBalance(account);
    });
  });

  describe("gmx & mux", () => {
    it("should execute a market order", async () => {
      const {
        user,
        account,
        gmxV1Adapter,
        muxAdapter,
        WETH,
        WBTC,
        checkBalance,
        deposit,
        executeIncreasePosition,
        executeDecreasePosition,
        fillPositionOrder,
      } = await loadFixture(deploy);

      const collateral = WETH;
      const index = WBTC;
      const collateralAmount = ethers.parseEther("1");
      const size = ethers.parseUnits("1", 8);
      const isLong = true;

      await deposit(WETH, collateralAmount);
      await deposit(WETH, collateralAmount);
      await checkBalance(account);

      var adapterFee =
        (await gmxV1Adapter.getMinExecutionFee()) +
        (await muxAdapter.getMinExecutionFee());
      await account
        .connect(user)
        .increasePositionMulti(
          [gmxV1Adapter.target, muxAdapter.target],
          collateral,
          index,
          [collateralAmount, collateralAmount],
          [size, size],
          isLong,
          0,
          { value: adapterFee }
        );
      await executeIncreasePosition(account.target);
      await fillPositionOrder();
      console.log(
        await gmxV1Adapter.getWrapPosition(
          account.target,
          collateral,
          index,
          isLong
        )
      );
      console.log(
        await muxAdapter.getWrapPosition(
          account.target,
          collateral,
          index,
          isLong
        )
      );
      await checkBalance(account);

      var adapterFee = await gmxV1Adapter.getMinExecutionFee();
      await account
        .connect(user)
        .decreasePosition(gmxV1Adapter.target, index, index, isLong, size, 0, {
          value: adapterFee,
        });
      var adapterFee = await muxAdapter.getMinExecutionFee();
      await account
        .connect(user)
        .decreasePosition(
          muxAdapter.target,
          collateral,
          index,
          isLong,
          size,
          0,
          { value: adapterFee }
        );
      await executeDecreasePosition(account.target);
      await fillPositionOrder();
      console.log(
        await gmxV1Adapter.getWrapPosition(
          account.target,
          collateral,
          index,
          isLong
        )
      );
      console.log(
        await muxAdapter.getWrapPosition(
          account.target,
          collateral,
          index,
          isLong
        )
      );
      await checkBalance(account);
    });
  });
});
