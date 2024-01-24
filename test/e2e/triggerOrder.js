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
        warehouse,
        gmxV1Adapter,
        WETH,
        checkBalance,
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

      await deposit(WETH, collateralAmount);
      await checkBalance(account);

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

      var price = ethers.parseUnits("2000", 30);
      await setPrice(gmxV1Adapter, WETH, price, price, false);

      var triggerPrice = ethers.parseUnits("2000", 18);
      var acceptablePrice = ethers.parseUnits("2000", 18); // calculated by slippage tolerance

      await account
        .connect(user)
        .createTriggerOrder(
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          size,
          0,
          triggerPrice,
          acceptablePrice,
          0
        );

      const positionKey = await warehouse.getPositionKey(
        account.target,
        gmxV1Adapter.target,
        collateral,
        index,
        isLong
      );
      console.log(await warehouse.getTriggerOrders(positionKey));

      await account.connect(user).cancelTriggerOrder(positionKey, 0);
      console.log(await warehouse.getTriggerOrders(positionKey));

      await account
        .connect(user)
        .createTriggerOrder(
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          size,
          0,
          triggerPrice,
          acceptablePrice,
          0
        );

      await account.executeTriggerOrder(positionKey, 1, {
        value: executionFee,
      });
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
    it("should execute a trigger order", async () => {
      const {
        user,
        account,
        warehouse,
        muxAdapter,
        WETH,
        checkBalance,
        deposit,
        fillPositionOrder,
        setPrice,
      } = await loadFixture(deploy);

      const collateral = WETH;
      const index = WETH;
      const collateralAmount = ethers.parseEther("1");
      const size = ethers.parseEther("10");
      const isLong = true;

      await deposit(WETH, collateralAmount);
      await checkBalance(account);

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

      var price = ethers.parseUnits("2000", 8);
      await setPrice(muxAdapter, WETH, price, price, false);

      var triggerPrice = ethers.parseUnits("2000", 18);
      var acceptablePrice = ethers.parseUnits("2000", 18); // calculated by slippage tolerance

      await account
        .connect(user)
        .createTriggerOrder(
          muxAdapter.target,
          collateral,
          index,
          isLong,
          size,
          0,
          triggerPrice,
          acceptablePrice,
          0
        );

      const positionKey = await warehouse.getPositionKey(
        account.target,
        muxAdapter.target,
        collateral,
        index,
        isLong
      );
      console.log(await warehouse.getTriggerOrders(positionKey));

      await account.connect(user).cancelTriggerOrder(positionKey, 0);
      console.log(await warehouse.getTriggerOrders(positionKey));

      await account
        .connect(user)
        .createTriggerOrder(
          muxAdapter.target,
          collateral,
          index,
          isLong,
          size,
          0,
          triggerPrice,
          acceptablePrice,
          0
        );

      await account.executeTriggerOrder(positionKey, 1, {
        value: executionFee,
      });
      await fillPositionOrder();
      console.log(
        await muxAdapter.getPosition(account.target, collateral, index, isLong)
      );
      await checkBalance(account);
    });
  });
});
