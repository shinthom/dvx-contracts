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
        exchange,
        quoter,
        gmxV1Adapter,
        muxAdapter,
        WETH,
        deposit,
        executeIncreasePosition,
        executeDecreasePosition,
      } = await loadFixture(deploy);

      const collateral = WETH;
      const index = WETH;
      const collateralAmount = ethers.parseEther("1");
      const size = ethers.parseEther("10");
      const isLong = true;

      await deposit(collateral, collateralAmount);

      const request = { collateral, index, collateralAmount, size, isLong };
      const answers = await quoter.quote(
        account.target,
        [gmxV1Adapter.target],
        request
      );

      await exchange
        .connect(user)
        .increasePosition(
          account.target,
          answers[0].adapter,
          answers[0].marketOrder.collateral,
          answers[0].marketOrder.index,
          answers[0].marketOrder.collateralAmount,
          answers[0].marketOrder.size,
          answers[0].marketOrder.isLong,
          answers[0].adapterExecutionFee,
          {
            value: answers[0].adapterExecutionFee,
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

      const adapterExecutionFee = await gmxV1Adapter.getMinExecutionFee();

      await deposit(collateral, collateralAmount);
      await exchange
        .connect(user)
        .increaseCollateral(
          account.target,
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          collateral,
          collateralAmount,
          adapterExecutionFee,
          {
            value: adapterExecutionFee,
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

      await exchange
        .connect(user)
        .decreaseCollateral(
          account.target,
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          collateralAmount,
          adapterExecutionFee,
          {
            value: adapterExecutionFee,
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

      await exchange
        .connect(user)
        .decreasePosition(
          account.target,
          gmxV1Adapter.target,
          collateral,
          index,
          size,
          isLong,
          adapterExecutionFee,
          {
            value: adapterExecutionFee,
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
    });
  });

  describe("mux", () => {
    it("should execute a market order", async () => {
      const {
        user,
        account,
        exchange,
        quoter,
        muxAdapter,
        WETH,
        deposit,
        fillPositionOrder,
        fillWithdrawalOrder,
      } = await loadFixture(deploy);

      const collateral = WETH;
      const index = WETH;
      const collateralAmount = ethers.parseEther("1");
      const size = ethers.parseEther("10");
      const isLong = true;

      await deposit(collateral, collateralAmount);

      const request = { collateral, index, collateralAmount, size, isLong };
      const answers = await quoter.quote(
        account.target,
        [muxAdapter.target],
        request
      );

      await exchange
        .connect(user)
        .increasePosition(
          account.target,
          answers[0].adapter,
          answers[0].marketOrder.collateral,
          answers[0].marketOrder.index,
          answers[0].marketOrder.collateralAmount,
          answers[0].marketOrder.size,
          answers[0].marketOrder.isLong,
          answers[0].adapterExecutionFee,
          {
            value: answers[0].adapterExecutionFee,
          }
        );
      await fillPositionOrder();
      console.log(
        await muxAdapter.getPosition(account.target, collateral, index, isLong)
      );

      const adapterExecutionFee = await muxAdapter.getMinExecutionFee();

      await deposit(collateral, collateralAmount);
      await exchange
        .connect(user)
        .increaseCollateral(
          account.target,
          muxAdapter.target,
          collateral,
          index,
          isLong,
          collateral,
          collateralAmount,
          adapterExecutionFee,
          {
            value: adapterExecutionFee,
          }
        );
      console.log(
        await muxAdapter.getPosition(account.target, collateral, index, isLong)
      );

      await exchange
        .connect(user)
        .decreaseCollateral(
          account.target,
          muxAdapter.target,
          collateral,
          index,
          isLong,
          collateralAmount,
          adapterExecutionFee,
          {
            value: adapterExecutionFee,
          }
        );
      await fillWithdrawalOrder();
      console.log(
        await muxAdapter.getPosition(account.target, collateral, index, isLong)
      );

      await exchange
        .connect(user)
        .decreasePosition(
          account.target,
          muxAdapter.target,
          collateral,
          index,
          size,
          isLong,
          adapterExecutionFee,
          {
            value: adapterExecutionFee,
          }
        );
      await fillPositionOrder();
      console.log(
        await muxAdapter.getPosition(account.target, collateral, index, isLong)
      );
    });
  });
});
