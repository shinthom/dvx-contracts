const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { deploy } = require("../fixture/setup");

describe("triggerOrder", () => {
  it("long", async () => {
    const {
      gmxV1,
      mux,
      deployer: orderKeeper,
      user,
      account,
      warehouse,
      minExecutionFee,
      ETH,
      WETH,
      executeIncreasePosition,
      executeDecreasePosition,
      fillPositionOrder,
      replaceFastPriceFeedAndSetPrice,
    } = await loadFixture(deploy);

    const adapter = gmxV1;
    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = true;

    const positionOrder = await adapter.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
    const sizeDelta = positionOrder.size;
    const triggerOrderType = { takeProfit: 0, stopLoss: 1 };
    const triggerPrice = ethers.parseUnits("2000", 30);
    const acceptablePrice = ethers.parseUnits("1800", 30); // calculated by slippage tolerance
    {
      const zeroSize = 0;
      await expect(
        account
          .connect(user)
          .createTriggerOrder(
            adapter.target,
            collateral,
            index,
            isLong,
            zeroSize,
            triggerOrderType.takeProfit,
            triggerPrice,
            acceptablePrice,
            0
          )
      ).to.be.revertedWith("Account: ZERO_SIZE");
      await expect(
        account
          .connect(user)
          .createTriggerOrder(
            adapter.target,
            collateral,
            index,
            isLong,
            sizeDelta,
            triggerOrderType.takeProfit,
            triggerPrice,
            acceptablePrice,
            minExecutionFee
          )
      ).to.be.revertedWith("Account: FEE_MISMATCH");
      if (adapter.target == gmxV1.target)
        await expect(
          account
            .connect(user)
            .createTriggerOrder(
              adapter.target,
              collateral,
              index,
              isLong,
              sizeDelta,
              triggerOrderType.takeProfit,
              triggerPrice,
              acceptablePrice,
              minExecutionFee - 1n,
              { value: minExecutionFee - 1n }
            )
        ).to.be.revertedWith("Account: INSUFFICIENT_FEE");
    }
    {
      const notAcceptablePrice = ethers.parseUnits("2200", 30); // calculated by slippage tolerance
      await expect(
        account
          .connect(user)
          .createTriggerOrder(
            adapter.target,
            collateral,
            index,
            isLong,
            sizeDelta,
            triggerOrderType.takeProfit,
            triggerPrice,
            notAcceptablePrice,
            minExecutionFee,
            { value: minExecutionFee }
          )
      ).to.be.revertedWith("Warehouse: invalid acceptable price");
    }
    {
      await expect(warehouse.setPriceMinDeviation(10001)).to.be.revertedWith(
        "Warehouse: invalid price min deviation"
      );
    }
    await warehouse.setPriceMinDeviation(100); // 1%
    {
      const notAcceptablePrice = ethers.parseUnits("1981", 30); // calculated by slippage tolerance
      await expect(
        account
          .connect(user)
          .createTriggerOrder(
            adapter.target,
            collateral,
            index,
            isLong,
            sizeDelta,
            triggerOrderType.takeProfit,
            triggerPrice,
            notAcceptablePrice,
            minExecutionFee,
            { value: minExecutionFee }
          )
      ).to.be.revertedWith(
        "Warehouse: acceptable price less than min deviation"
      );
    }
    {
      await expect(
        account
          .connect(user)
          .createTriggerOrder(
            adapter.target,
            collateral,
            index,
            isLong,
            sizeDelta,
            triggerOrderType.takeProfit,
            triggerPrice,
            acceptablePrice,
            minExecutionFee,
            { value: minExecutionFee }
          )
      ).to.be.revertedWith("Warehouse: no position exist");
    }
    await account.deposit(ETH, collateralAmount, { value: collateralAmount });
    await account.connect(user).createMarketOrders([adapter.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }], { value: minExecutionFee }); // prettier-ignore
    if (adapter.target == gmxV1.target) {
      await executeIncreasePosition(account.target);
    } else if (adapter.target == mux.target) {
      await fillPositionOrder();
    }
    await account
      .connect(user)
      .createTriggerOrder(
        adapter.target,
        collateral,
        index,
        isLong,
        sizeDelta / 2n,
        triggerOrderType.takeProfit,
        triggerPrice,
        acceptablePrice,
        minExecutionFee,
        { value: minExecutionFee }
      );
    {
      await expect(
        account
          .connect(user)
          .createTriggerOrder(
            adapter.target,
            collateral,
            index,
            isLong,
            sizeDelta / 2n + 1n,
            triggerOrderType.takeProfit,
            triggerPrice,
            acceptablePrice,
            minExecutionFee,
            { value: minExecutionFee }
          )
      ).to.be.revertedWith(
        "Warehouse: triggerOrderSize is greater than position size"
      );
    }
    await account
      .connect(user)
      .createTriggerOrder(
        adapter.target,
        collateral,
        index,
        isLong,
        sizeDelta / 2n,
        triggerOrderType.takeProfit,
        triggerPrice,
        acceptablePrice,
        minExecutionFee,
        { value: minExecutionFee }
      );

    const positionKey = await warehouse.getPositionKey(
      account.target,
      adapter.target,
      collateral,
      index,
      isLong
    );
    {
      await expect(
        warehouse.connect(user).cancelTriggerOrder(positionKey, 0)
      ).to.be.revertedWith("Warehouse: not trigger order owner");
    }
    await account.connect(user).cancelTriggerOrder(positionKey, 0);
    {
      await expect(
        account.connect(user).cancelTriggerOrder(positionKey, 0)
      ).to.be.revertedWith("Warehouse: not pending state");
    }

    {
      await expect(
        warehouse.cancelTriggerOrder(positionKey, 1)
      ).to.be.revertedWith("Warehouse: not trigger order owner");
    }
    await warehouse.setOrderKeeper(orderKeeper.address, true);
    {
      await expect(
        warehouse
          .connect(orderKeeper)
          .executeTriggerOrder(user.address, positionKey, 1)
      ).to.be.revertedWith("Warehouse: not trigger order owner");
      await expect(
        warehouse
          .connect(orderKeeper)
          .executeTriggerOrder(user.address, positionKey, 0)
      ).to.be.revertedWith("Warehouse: not pending state");
    }
    {
      const balance = await ethers.provider.getBalance(warehouse.target);
      await warehouse.withdraw(user.address, balance);
      await expect(
        warehouse
          .connect(orderKeeper)
          .executeTriggerOrder(account.target, positionKey, 1)
      ).to.be.revertedWith("Warehouse: insufficient fee");
    }
    {
      await replaceFastPriceFeedAndSetPrice(
        WETH,
        acceptablePrice - 1n,
        acceptablePrice - 1n
      );
      await expect(
        warehouse
          .connect(orderKeeper)
          .executeTriggerOrder(account.target, positionKey, 1, {
            value: minExecutionFee,
          })
      ).to.be.revertedWith("Warehouse: current price is not acceptable");
    }
    await replaceFastPriceFeedAndSetPrice(
      WETH,
      acceptablePrice,
      acceptablePrice
    );
    await warehouse
      .connect(orderKeeper)
      .executeTriggerOrder(account.target, positionKey, 1, {
        value: minExecutionFee,
      });
    await executeDecreasePosition(account.target);
  });
});
