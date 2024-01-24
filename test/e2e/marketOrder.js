const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture");

const orderType = {
  increasePosition: 0,
  decreasePosition: 1,
  increaseCollateral: 2,
  decreaseCollateral: 3,
};

describe("marketOrder", () => {
  describe("gmxV1", () => {
    it("should execute a market order", async () => {
      const {
        user,
        account,
        gmxV1Adapter,
        WETH,
        checkBalance,
        deposit,
        executeIncreasePosition,
        executeDecreasePosition,
      } = await loadFixture(deploy);

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
          executionFee,
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
          executionFee,
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
          executionFee,
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
        checkBalance,
        deposit,
        fillPositionOrder,
        fillWithdrawalOrder,
      } = await loadFixture(deploy);

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
        await muxAdapter.getPosition(account.target, collateral, index, isLong)
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
          executionFee,
          {
            value: executionFee,
          }
        );
      console.log(
        await muxAdapter.getPosition(account.target, collateral, index, isLong)
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
          executionFee,
          {
            value: executionFee,
          }
        );
      await fillWithdrawalOrder(account.target);
      console.log(
        await muxAdapter.getPosition(account.target, collateral, index, isLong)
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
          executionFee,
          { value: executionFee }
        );
      await fillPositionOrder();
      console.log(
        await muxAdapter.getPosition(account.target, collateral, index, isLong)
      );
      await checkBalance(account);
    });
  });
});
