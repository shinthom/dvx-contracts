const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture");

const orderType = {
  increasePosition: 0,
  decreasePosition: 1,
  increaseCollateral: 2,
  decreaseCollateral: 3,
};

describe("triggerOrder", () => {
  describe("gmxV1", () => {
    it("should execute a trigger order", async () => {
      const {
        user,
        account,
        exchange,
        gmxV1Adapter,
        WETH,
        deposit,
        fillPositionOrder,
      } = await loadFixture(deploy);

      const collateral = WETH;
      const index = WETH;
      const collateralAmount = ethers.parseEther("1");
      const size = ethers.parseEther("10");
      const isLong = true;

      const executionFee = await gmxV1Adapter.getMinExecutionFee();

      await exchange.setRegisteredAdapter(gmxV1Adapter.target, true);

      await deposit(collateral, collateralAmount);
      await exchange
        .connect(user)
        .executeMarketOrder(
          account.target,
          orderType.increasePosition,
          gmxV1Adapter.target,
          [collateral],
          index,
          collateralAmount,
          size,
          isLong,
          executionFee,
          { value: executionFee }
        );
      await fillPositionOrder();
      console.log(
        await gmxV1Adapter.getPosition(
          account.target,
          collateral,
          index,
          isLong
        )
      );

      const triggerOrderType = { takeProfit: 0, stopLoss: 1 };
      const triggerPrice = ethers.parseUnits("2000", 18);
      const acceptablePrice = ethers.parseUnits("2000", 18); // calculated by slippage tolerance

      await exchange
        .connect(user)
        .createTriggerOrder(
          account.target,
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          size,
          triggerOrderType.takeProfit,
          triggerPrice,
          acceptablePrice,
          executionFee,
          { value: executionFee }
        );
      await exchange
        .connect(user)
        .createTriggerOrder(
          account.target,
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          size,
          triggerOrderType.takeProfit,
          triggerPrice,
          acceptablePrice,
          executionFee,
          { value: executionFee }
        );
      const positionKey = await exchange.getPositionKey(
        account.target,
        gmxV1Adapter.target,
        collateral,
        index,
        isLong
      );
      console.log(await exchange.triggerOrders(positionKey, 0));
      console.log(await exchange.triggerOrders(positionKey, 1));
      await exchange.connect(user).cancelTriggerOrder(positionKey, 0);
      await exchange
        .connect(user)
        .executeTriggerOrder(account.target, positionKey, 1);
      await fillPositionOrder();
      console.log(
        await gmxV1Adapter.getPosition(
          account.target,
          collateral,
          index,
          isLong
        )
      );
    });

    describe("mux", () => {
      it("should execute a trigger order", async () => {
        const {
          user,
          account,
          exchange,
          muxAdapter,
          WETH,
          deposit,
          fillPositionOrder,
        } = await loadFixture(deploy);

        const collateral = WETH;
        const index = WETH;
        const collateralAmount = ethers.parseEther("1");
        const size = ethers.parseEther("10");
        const isLong = true;

        const executionFee = await muxAdapter.getMinExecutionFee();

        await exchange.setRegisteredAdapter(muxAdapter.target, true);

        await deposit(collateral, collateralAmount);
        await exchange
          .connect(user)
          .executeMarketOrder(
            account.target,
            orderType.increasePosition,
            muxAdapter.target,
            [collateral],
            index,
            collateralAmount,
            size,
            isLong,
            executionFee,
            { value: executionFee }
          );
        await fillPositionOrder();
        console.log(
          await muxAdapter.getPosition(
            account.target,
            collateral,
            index,
            isLong
          )
        );

        const triggerOrderType = { takeProfit: 0, stopLoss: 1 };
        const triggerPrice = ethers.parseUnits("2000", 18);
        const acceptablePrice = ethers.parseUnits("2000", 18); // calculated by slippage tolerance

        await exchange
          .connect(user)
          .createTriggerOrder(
            account.target,
            muxAdapter.target,
            collateral,
            index,
            isLong,
            size,
            triggerOrderType.takeProfit,
            triggerPrice,
            acceptablePrice,
            executionFee,
            { value: executionFee }
          );
        await exchange
          .connect(user)
          .createTriggerOrder(
            account.target,
            muxAdapter.target,
            collateral,
            index,
            isLong,
            size,
            triggerOrderType.takeProfit,
            triggerPrice,
            acceptablePrice,
            executionFee,
            { value: executionFee }
          );
        const positionKey = await exchange.getPositionKey(
          account.target,
          muxAdapter.target,
          collateral,
          index,
          isLong
        );
        console.log(await exchange.triggerOrders(positionKey, 0));
        console.log(await exchange.triggerOrders(positionKey, 1));
        await exchange.connect(user).cancelTriggerOrder(positionKey, 0);
        await exchange
          .connect(user)
          .executeTriggerOrder(account.target, positionKey, 1);
        await fillPositionOrder();
        console.log(
          await muxAdapter.getPosition(
            account.target,
            collateral,
            index,
            isLong
          )
        );
      });
    });
  });
});
