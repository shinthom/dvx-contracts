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
        orderKeeper,
        account,
        exchange,
        warehouse,
        gmxV1Adapter,
        WETH,
        deposit,
        executeIncreasePosition,
        executeDecreasePosition,
        setPrice,
      } = await loadFixture(deploy);

      const collateral = WETH;
      const index = WETH;
      const collateralAmount = ethers.parseEther("1");
      const size = ethers.parseEther("10");
      const isLong = true;

      const adapterExecutionFee = await gmxV1Adapter.getMinExecutionFee();

      await deposit(collateral, collateralAmount);
      const marketOrder = await gmxV1Adapter.makeMarketOrder(
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
          gmxV1Adapter.target,
          marketOrder.collateral,
          marketOrder.index,
          marketOrder.collateralAmount,
          marketOrder.size,
          marketOrder.isLong,
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

      const triggerOrderType = { takeProfit: 0, stopLoss: 1 };
      var triggerPrice = ethers.parseUnits("2000", 18);
      var acceptablePrice = ethers.parseUnits("2000", 18); // calculated by slippage tolerance
      var price = ethers.parseUnits("2000", 30);
      await setPrice(gmxV1Adapter, WETH, price, price, false);

      const executionFee = await exchange.minExecutionFee();

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
          adapterExecutionFee,
          { value: executionFee + adapterExecutionFee }
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
          adapterExecutionFee,
          { value: executionFee + adapterExecutionFee }
        );

      const positionKey = await warehouse.getPositionKey(
        account.target,
        gmxV1Adapter.target,
        collateral,
        index,
        isLong
      );
      await exchange
        .connect(user)
        .cancelTriggerOrder(account.target, positionKey, 0);

      await warehouse.setOrderKeeper(orderKeeper.address, true);
      await warehouse.connect(orderKeeper).executeTriggerOrder(positionKey, 1);
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

    describe("mux", () => {
      it("should execute a trigger order", async () => {
        const {
          user,
          account,
          exchange,
          warehouse,
          muxAdapter,
          WETH,
          deposit,
          fillPositionOrder,
          setPrice,
        } = await loadFixture(deploy);

        const collateral = WETH;
        const index = WETH;
        const collateralAmount = ethers.parseEther("1");
        const size = ethers.parseEther("10");
        const isLong = true;

        const adapterExecutionFee = await muxAdapter.getMinExecutionFee();
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
            marketOrder.collateral,
            marketOrder.index,
            marketOrder.collateralAmount,
            marketOrder.size,
            marketOrder.isLong,
            adapterExecutionFee,
            {
              value: adapterExecutionFee,
            }
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
        var triggerPrice = ethers.parseUnits("2000", 18);
        var acceptablePrice = ethers.parseUnits("2000", 18); // calculated by slippage tolerance
        var price = ethers.parseUnits("2000", 8);
        await setPrice(muxAdapter, WETH, price, price, false);

        const executionFee = await exchange.minExecutionFee();

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
            adapterExecutionFee,
            { value: executionFee + adapterExecutionFee }
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
            adapterExecutionFee,
            { value: executionFee + adapterExecutionFee }
          );

        const positionKey = await warehouse.getPositionKey(
          account.target,
          muxAdapter.target,
          collateral,
          index,
          isLong
        );
        await exchange
          .connect(user)
          .cancelTriggerOrder(account.target, positionKey, 0);

        await warehouse.setOrderKeeper(orderKeeper.address, true);
        await warehouse
          .connect(orderKeeper)
          .executeTriggerOrder(positionKey, 1);
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
