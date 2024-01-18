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
        gmxV1Adapter,
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

      await exchange.setRegisteredAdapter(gmxV1Adapter.target, true);

      await deposit(collateral, collateralAmount);

      const marketOrder = await gmxV1Adapter.makeMarketOrder(
        collateral,
        index,
        collateralAmount,
        size,
        isLong
      );
      const executionFee = await gmxV1Adapter.getMinExecutionFee();
      await exchange
        .connect(user)
        .executeMarketOrder(
          account.target,
          orderType.increasePosition,
          gmxV1Adapter.target,
          [marketOrder.path[0]],
          marketOrder.index,
          marketOrder.collateralAmount,
          marketOrder.size,
          marketOrder.isLong,
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

      const executionFee = await muxAdapter.getMinExecutionFee();

      await exchange.setRegisteredAdapter(muxAdapter.target, true);

      await deposit(collateral, collateralAmount);
      const marketOrder = await muxAdapter.makeMarketOrder(
        collateral,
        index,
        collateralAmount,
        size,
        isLong
      );
      await exchange
        .connect(user)
        .executeMarketOrder(
          account.target,
          orderType.increasePosition,
          muxAdapter.target,
          [marketOrder.path[0]],
          marketOrder.index,
          marketOrder.collateralAmount,
          marketOrder.size,
          marketOrder.isLong,
          executionFee,
          {
            value: executionFee,
          }
        );
      await fillPositionOrder();
      console.log(
        await muxAdapter.getPosition(account.target, collateral, index, isLong)
      );

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
