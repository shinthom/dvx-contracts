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
        .executeMarketOrder(
          account.target,
          orderType.increasePosition,
          answers[0].adapter,
          [...answers[0].marketOrder.path],
          answers[0].marketOrder.index,
          answers[0].marketOrder.collateralAmount,
          answers[0].marketOrder.size,
          answers[0].marketOrder.isLong,
          answers[0].executionFee,
          {
            value: answers[0].executionFee,
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

      const executionFee = await gmxV1Adapter.getMinExecutionFee();

      await deposit(collateral, collateralAmount);
      await exchange
        .connect(user)
        .executeMarketOrder(
          account.target,
          orderType.increaseCollateral,
          gmxV1Adapter.target,
          [collateral],
          index,
          collateralAmount,
          0,
          isLong,
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

      await exchange
        .connect(user)
        .executeMarketOrder(
          account.target,
          orderType.decreaseCollateral,
          gmxV1Adapter.target,
          [collateral],
          index,
          collateralAmount,
          0,
          isLong,
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

      await exchange
        .connect(user)
        .executeMarketOrder(
          account.target,
          orderType.decreasePosition,
          gmxV1Adapter.target,
          [collateral],
          index,
          0,
          size,
          isLong,
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
        .executeMarketOrder(
          account.target,
          orderType.increasePosition,
          answers[0].adapter,
          [...answers[0].marketOrder.path],
          answers[0].marketOrder.index,
          answers[0].marketOrder.collateralAmount,
          answers[0].marketOrder.size,
          answers[0].marketOrder.isLong,
          answers[0].executionFee,
          {
            value: answers[0].executionFee,
          }
        );
      await fillPositionOrder();
      console.log(
        await muxAdapter.getPosition(account.target, collateral, index, isLong)
      );

      const executionFee = await muxAdapter.getMinExecutionFee();

      await deposit(collateral, collateralAmount);
      await exchange
        .connect(user)
        .executeMarketOrder(
          account.target,
          orderType.increaseCollateral,
          muxAdapter.target,
          [collateral],
          index,
          collateralAmount,
          0,
          isLong,
          executionFee,
          {
            value: executionFee,
          }
        );
      console.log(
        await muxAdapter.getPosition(account.target, collateral, index, isLong)
      );

      await exchange
        .connect(user)
        .executeMarketOrder(
          account.target,
          orderType.decreaseCollateral,
          muxAdapter.target,
          [collateral],
          index,
          collateralAmount,
          0,
          isLong,
          executionFee,
          {
            value: executionFee,
          }
        );
      await fillWithdrawalOrder();
      console.log(
        await muxAdapter.getPosition(account.target, collateral, index, isLong)
      );

      await exchange
        .connect(user)
        .executeMarketOrder(
          account.target,
          orderType.decreasePosition,
          muxAdapter.target,
          [collateral],
          index,
          0,
          size,
          isLong,
          executionFee,
          {
            value: executionFee,
          }
        );
      await fillPositionOrder();
      console.log(
        await muxAdapter.getPosition(account.target, collateral, index, isLong)
      );
    });
  });
});
