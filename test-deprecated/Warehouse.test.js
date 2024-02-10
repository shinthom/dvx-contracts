const { ethers, network } = require("hardhat");
const { expect } = require("chai");

let snapshotId;

describe("Warehouse", () => {
  const ETH = ethers.ZeroAddress;
  const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
  const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";
  const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

  let user;
  let other;
  let exchange;
  let orderKeeper;

  let wbtc;
  let usdc;

  let warehouse;
  let adapter;

  beforeEach(async () => {
    [user, other, owner, exchange, orderKeeper] = await ethers.getSigners();

    wbtc = await ethers.getContractAt("IERC20", WBTC);
    usdc = await ethers.getContractAt("IERC20", USDC);

    const warehouseImpl = await ethers.deployContract("Warehouse", []);
    const warehouseProxy = await ethers.deployContract("ERC1967Proxy", [
      warehouseImpl.target,
      "0x",
    ]);
    warehouse = await ethers.getContractAt("Warehouse", warehouseProxy.target);
    await warehouse.initialize();
    await warehouse.transferOwnership(owner.address);

    adapter = await ethers.deployContract("AdapterMock");

    snapshotId = await network.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await network.provider.send("evm_revert", [snapshotId]);
  });

  describe("setExchange", () => {
    const newExchange = "0x" + "11".repeat(20);

    it("reverts when not owner", async () => {
      await expect(
        warehouse.connect(other).setExchange(newExchange)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("sets exchange", async () => {
      await expect(warehouse.connect(owner).setExchange(newExchange))
        .to.emit(warehouse, "ExchangeSet")
        .withArgs(newExchange);
      expect(await warehouse.exchange()).to.be.equal(newExchange);
    });
  });

  describe("setOrderKeeper", () => {
    const newOrderKeeper = "0x" + "11".repeat(20);

    it("reverts when not owner", async () => {
      await expect(
        warehouse.connect(other).setOrderKeeper(newOrderKeeper, true)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("sets orderKeeper", async () => {
      await expect(
        warehouse.connect(owner).setOrderKeeper(newOrderKeeper, true)
      )
        .to.emit(warehouse, "OrderKeeperSet")
        .withArgs(newOrderKeeper, true);
      expect(await warehouse.isOrderKeeper(newOrderKeeper)).to.be.equal(true);
    });
  });

  describe("sets priceMinDeviation", () => {
    const priceMinDeviation = 100;

    it("reverts when not owner", async () => {
      await expect(
        warehouse.connect(other).setPriceMinDeviation(priceMinDeviation)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("sets priceMinDeviation", async () => {
      await expect(
        warehouse.connect(owner).setPriceMinDeviation(priceMinDeviation)
      )
        .to.emit(warehouse, "PriceMinDeviationSet")
        .withArgs(priceMinDeviation);
      expect(await warehouse.priceMinDeviation()).to.be.equal(
        priceMinDeviation
      );
    });
  });

  describe("limitOrder", () => {
    const triggerPrice = ethers.parseUnits("2000", 18);
    const acceptablePrice = ethers.parseUnits("2020", 18);

    const fee = 10;

    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = true;

    const limitOrderState = {
      pending: 0n,
      executed: 1n,
      canceled: 2n,
    };

    let account;

    beforeEach(async () => {
      await warehouse.connect(owner).setExchange(exchange.address);

      account = await ethers.deployContract("AccountMock", [
        user.address,
        exchange.address,
      ]);
    });

    describe("create", () => {
      it("reverts when msg.sender is not exchange", async () => {
        await expect(
          warehouse
            .connect(user)
            .createLimitOrder(
              account.target,
              collateral,
              index,
              collateralAmount,
              size,
              isLong,
              triggerPrice,
              acceptablePrice,
              fee
            )
        ).to.be.revertedWith("msg.sender: not exchange");
      });

      it("reverts when adapterExecutionFee does not match", async () => {
        var triggerPrice = ethers.parseUnits("2000", 18);
        var acceptablePrice = ethers.parseUnits("2001", 18);
        var isLong = true;
        await expect(
          warehouse
            .connect(exchange)
            .createLimitOrder(
              account.target,
              collateral,
              index,
              collateralAmount,
              size,
              isLong,
              triggerPrice,
              acceptablePrice,
              10
            )
        ).to.be.revertedWith("adapterExecutionFee: not match");
      });

      it("reverts when triggerPrice is invalid", async () => {
        var triggerPrice = ethers.parseUnits("2000", 18);
        var acceptablePrice = ethers.parseUnits("1999", 18);
        var isLong = true;
        await expect(
          warehouse
            .connect(exchange)
            .createLimitOrder(
              account.target,
              collateral,
              index,
              collateralAmount,
              size,
              isLong,
              triggerPrice,
              acceptablePrice,
              fee,
              {
                value: fee,
              }
            )
        ).to.be.revertedWith("triggerPrice: invalid");

        var triggerPrice = ethers.parseUnits("2000", 18);
        var acceptablePrice = ethers.parseUnits("2001", 18);
        var isLong = false;
        await expect(
          warehouse
            .connect(exchange)
            .createLimitOrder(
              account.target,
              collateral,
              index,
              collateralAmount,
              size,
              isLong,
              triggerPrice,
              acceptablePrice,
              fee,
              {
                value: fee,
              }
            )
        ).to.be.revertedWith("triggerPrice: invalid");
      });

      it("reverts when triggerPrice is invalid", async () => {
        await warehouse.connect(owner).setPriceMinDeviation(100);

        var triggerPrice = ethers.parseUnits("2000", 18);
        var acceptablePrice = ethers.parseUnits("2101", 18);
        var isLong = true;
        await expect(
          warehouse
            .connect(exchange)
            .createLimitOrder(
              account.target,
              collateral,
              index,
              collateralAmount,
              size,
              isLong,
              triggerPrice,
              acceptablePrice,
              fee,
              {
                value: fee,
              }
            )
        ).to.be.revertedWith("acceptablePrice: out of deviation");

        var triggerPrice = ethers.parseUnits("2000", 18);
        var acceptablePrice = ethers.parseUnits("1899", 18);
        var isLong = false;
        await expect(
          warehouse
            .connect(exchange)
            .createLimitOrder(
              account.target,
              collateral,
              index,
              collateralAmount,
              size,
              isLong,
              triggerPrice,
              acceptablePrice,
              fee,
              {
                value: fee,
              }
            )
        ).to.be.revertedWith("acceptablePrice: out of deviation");
      });

      it("reverts when fee is not match", async () => {
        await expect(
          warehouse
            .connect(exchange)
            .createLimitOrder(
              account.target,
              collateral,
              index,
              collateralAmount,
              size,
              isLong,
              triggerPrice,
              acceptablePrice,
              fee - 1,
              {
                value: fee,
              }
            )
        ).to.be.revertedWith("adapterExecutionFee: not match");
      });

      it("reverts when collateralAmount is over the balance", async () => {
        await expect(
          warehouse
            .connect(exchange)
            .createLimitOrder(
              account.target,
              collateral,
              index,
              collateralAmount,
              size,
              isLong,
              triggerPrice,
              acceptablePrice,
              fee,
              {
                value: fee,
              }
            )
        ).to.be.revertedWith("collateralAmount: over balance");

        await account.setBalance(collateralAmount);
        await warehouse
          .connect(exchange)
          .createLimitOrder(
            account.target,
            collateral,
            index,
            collateralAmount,
            size,
            isLong,
            triggerPrice,
            acceptablePrice,
            fee,
            {
              value: fee,
            }
          );

        await expect(
          warehouse
            .connect(exchange)
            .createLimitOrder(
              account.target,
              collateral,
              index,
              collateralAmount,
              size,
              isLong,
              triggerPrice,
              acceptablePrice,
              fee,
              {
                value: fee,
              }
            )
        ).to.be.revertedWith("collateralAmount: over balance");
      });

      it("creates limit order", async () => {
        await account.setBalance(collateralAmount);
        await warehouse
          .connect(exchange)
          .createLimitOrder(
            account.target,
            collateral,
            index,
            collateralAmount,
            size,
            isLong,
            triggerPrice,
            acceptablePrice,
            fee,
            {
              value: fee,
            }
          );

        const limitOrders = await warehouse.getLimitOrders(account.target);
        expect(limitOrders.length).to.be.equal(1);
        expect(
          await warehouse.lockedBalances(account.target, collateral)
        ).to.be.equal(collateralAmount);
      });
    });

    describe("cancel", () => {
      beforeEach(async () => {
        await account.setBalance(collateralAmount);
        await warehouse
          .connect(exchange)
          .createLimitOrder(
            account.target,
            collateral,
            index,
            collateralAmount,
            size,
            isLong,
            triggerPrice,
            acceptablePrice,
            fee,
            {
              value: fee,
            }
          );
      });

      it("reverts when msg.sender is not exchange", async () => {
        await expect(
          warehouse.connect(user).cancelLimitOrder(account.target, 0)
        ).to.be.revertedWith("msg.sender: not exchange");
      });

      it("reverts when id is out of range", async () => {
        await expect(
          warehouse.connect(exchange).cancelLimitOrder(user.address, 0)
        ).to.be.revertedWith("id: out of range");
        await expect(
          warehouse.connect(exchange).cancelLimitOrder(account.target, 1)
        ).to.be.revertedWith("id: out of range");
      });

      it("reverts when limitOrder state is not pending", async () => {
        await warehouse.connect(exchange).cancelLimitOrder(account.target, 0);
        await expect(
          warehouse.connect(exchange).cancelLimitOrder(account.target, 0)
        ).to.be.revertedWith("state: not pending");
      });

      it("cancels limit order", async () => {
        await warehouse.connect(exchange).cancelLimitOrder(account.target, 0);
        const limitOrder = await warehouse.getLimitOrder(account.target, 0);
        expect(limitOrder.state).to.be.equal(limitOrderState.canceled);
        expect(
          await warehouse.lockedBalances(account.target, collateral)
        ).to.be.equal(0);
      });
    });

    describe("execute", () => {
      const executionFee = 10;

      beforeEach(async () => {
        await account.setBalance(collateralAmount);
        await warehouse
          .connect(exchange)
          .createLimitOrder(
            account.target,
            collateral,
            index,
            collateralAmount,
            size,
            isLong,
            triggerPrice,
            acceptablePrice,
            fee,
            {
              value: fee,
            }
          );
        await warehouse
          .connect(owner)
          .setOrderKeeper(orderKeeper.address, true);
      });

      it("reverts when msg.sender is not orderKeeper", async () => {
        await expect(
          warehouse
            .connect(user)
            .executeLimitOrder(account.target, adapter.target, 0)
        ).to.be.revertedWith("msg.sender: not orderKeeper");
      });

      it("reverts when limitOrder state is not pending", async () => {
        await warehouse.connect(exchange).cancelLimitOrder(account.target, 0);
        await expect(
          warehouse
            .connect(orderKeeper)
            .executeLimitOrder(account.target, adapter.target, 0)
        ).to.be.revertedWith("state: not pending");
      });

      it("reverts when price is not acceptable", async () => {
        await adapter.setWrapPrice(acceptablePrice + 1n);
        await expect(
          warehouse
            .connect(orderKeeper)
            .executeLimitOrder(account.target, adapter.target, 0)
        ).to.be.revertedWith("price: not acceptable");
      });

      it("executes limit order", async () => {
        const exchangeMock = await ethers.deployContract("ExchangeMock");
        await warehouse.connect(owner).setExchange(exchangeMock.target);

        await warehouse
          .connect(orderKeeper)
          .executeLimitOrder(account.target, adapter.target, 0);

        const limitOrder = await warehouse.getLimitOrder(account.target, 0);
        expect(limitOrder.state).to.be.equal(limitOrderState.executed);
        expect(
          await warehouse.lockedBalances(account.target, collateral)
        ).to.be.equal(0);
      });
    });
  });

  describe("triggerOrder", () => {
    const triggerPrice = ethers.parseUnits("2000", 18);
    const acceptablePrice = ethers.parseUnits("1980", 18);
    const executionFee = 10;

    const size = ethers.parseEther("10");

    const triggerOrderType = {
      takeProfit: 0,
      stopLoss: 1,
    };

    const triggerOrderState = {
      pending: 0,
      executed: 1,
      canceled: 2,
    };

    beforeEach(async () => {
      await warehouse.connect(owner).setExchange(exchange.address);
    });

    describe("create", () => {
      it("reverts when msg.sender is not exchange", async () => {
        await expect(
          warehouse
            .connect(user)
            .createTriggerOrder(
              ethers.ZeroAddress,
              ethers.ZeroAddress,
              ETH,
              ETH,
              true,
              size,
              triggerOrderType.takeProfit,
              triggerPrice,
              acceptablePrice,
              0
            )
        ).to.be.revertedWith("msg.sender: not exchange");
      });

      it("reverts when adapterExecutionFee does not match", async () => {
        var triggerPrice = ethers.parseUnits("2000", 18);
        var acceptablePrice = ethers.parseUnits("2001", 18);
        var isLong = true;
        await expect(
          warehouse
            .connect(exchange)
            .createTriggerOrder(
              ethers.ZeroAddress,
              ethers.ZeroAddress,
              ETH,
              ETH,
              isLong,
              ethers.parseEther("10"),
              triggerOrderType.takeProfit,
              triggerPrice,
              acceptablePrice,
              10
            )
        ).to.be.revertedWith("adapterExecutionFee: not match");
      });

      it("reverts when triggerPrice is invalid", async () => {
        var triggerPrice = ethers.parseUnits("2000", 18);
        var acceptablePrice = ethers.parseUnits("2001", 18);
        var isLong = true;
        await expect(
          warehouse
            .connect(exchange)
            .createTriggerOrder(
              ethers.ZeroAddress,
              ethers.ZeroAddress,
              ETH,
              ETH,
              isLong,
              ethers.parseEther("10"),
              triggerOrderType.takeProfit,
              triggerPrice,
              acceptablePrice,
              0
            )
        ).to.be.revertedWith("triggerPrice: invalid");

        var triggerPrice = ethers.parseUnits("2000", 18);
        var acceptablePrice = ethers.parseUnits("1999", 18);
        var isLong = false;
        await expect(
          warehouse
            .connect(exchange)
            .createTriggerOrder(
              ethers.ZeroAddress,
              ethers.ZeroAddress,
              ETH,
              ETH,
              isLong,
              ethers.parseEther("10"),
              triggerOrderType.takeProfit,
              triggerPrice,
              acceptablePrice,
              0
            )
        ).to.be.revertedWith("triggerPrice: invalid");
      });

      it("reverts when triggerPrice is invalid", async () => {
        await warehouse.connect(owner).setPriceMinDeviation(100);

        var triggerPrice = ethers.parseUnits("2000", 18);
        var acceptablePrice = ethers.parseUnits("1899", 18);
        var isLong = true;
        await expect(
          warehouse
            .connect(exchange)
            .createTriggerOrder(
              ethers.ZeroAddress,
              ethers.ZeroAddress,
              ETH,
              ETH,
              isLong,
              ethers.parseEther("10"),
              triggerOrderType.takeProfit,
              triggerPrice,
              acceptablePrice,
              0
            )
        ).to.be.revertedWith("acceptablePrice: out of deviation");

        var triggerPrice = ethers.parseUnits("2000", 18);
        var acceptablePrice = ethers.parseUnits("2021", 18);
        var isLong = false;
        await expect(
          warehouse
            .connect(exchange)
            .createTriggerOrder(
              ethers.ZeroAddress,
              ethers.ZeroAddress,
              ETH,
              ETH,
              isLong,
              ethers.parseEther("10"),
              triggerOrderType.takeProfit,
              triggerPrice,
              acceptablePrice,
              0
            )
        ).to.be.revertedWith("acceptablePrice: out of deviation");
      });

      it("reverts when there is no position", async () => {
        await adapter.setSize(0);
        await expect(
          warehouse
            .connect(exchange)
            .createTriggerOrder(
              ethers.ZeroAddress,
              adapter.target,
              ETH,
              ETH,
              true,
              ethers.parseEther("10"),
              triggerOrderType.takeProfit,
              triggerPrice,
              acceptablePrice,
              executionFee,
              {
                value: executionFee,
              }
            )
        ).to.be.revertedWith("position: not exist");
      });

      it("creates trigger order", async () => {
        await warehouse
          .connect(exchange)
          .createTriggerOrder(
            ethers.ZeroAddress,
            adapter.target,
            ETH,
            ETH,
            true,
            size,
            triggerOrderType.takeProfit,
            triggerPrice,
            acceptablePrice,
            executionFee,
            {
              value: executionFee,
            }
          );

        const positionKey = await warehouse.getPositionKey(
          ethers.ZeroAddress,
          adapter.target,
          ETH,
          ETH,
          true
        );
        expect(
          (await warehouse.getTriggerOrders(positionKey)).length
        ).to.be.equal(1n);
      });
    });

    describe("cancel", () => {
      let positionKey;

      const account = ethers.Wallet.createRandom().address;

      beforeEach(async () => {
        await warehouse
          .connect(exchange)
          .createTriggerOrder(
            account,
            adapter.target,
            ETH,
            ETH,
            true,
            size,
            triggerOrderType.takeProfit,
            triggerPrice,
            acceptablePrice,
            executionFee,
            {
              value: executionFee,
            }
          );

        positionKey = await warehouse.getPositionKey(
          account,
          adapter.target,
          ETH,
          ETH,
          true
        );
      });

      it("reverts when msg.sender is not exchange", async () => {
        await expect(
          warehouse.connect(user).cancelTriggerOrder(account, positionKey, 0)
        ).to.be.revertedWith("msg.sender: not exchange");
      });

      it("reverts when position does not exist", async () => {
        await expect(
          warehouse
            .connect(exchange)
            .cancelTriggerOrder(account, ethers.ZeroHash, 0)
        ).to.be.revertedWith("id: out of range");
      });

      it("reverts when triggerOrder state is not pending", async () => {
        await warehouse
          .connect(exchange)
          .cancelTriggerOrder(account, positionKey, 0);
        await expect(
          warehouse
            .connect(exchange)
            .cancelTriggerOrder(account, positionKey, 0)
        ).to.be.revertedWith("triggerOrder: not pending");
      });

      it("cancel trigger order", async () => {
        await warehouse
          .connect(exchange)
          .cancelTriggerOrder(account, positionKey, 0);
        const triggerOrder = await warehouse.getTriggerOrder(positionKey, 0);
        expect(triggerOrder.state).to.be.equal(triggerOrderState.canceled);
      });
    });

    describe("execute", () => {
      let positionKey;

      beforeEach(async () => {
        await warehouse
          .connect(owner)
          .setOrderKeeper(orderKeeper.address, true);
        await warehouse
          .connect(exchange)
          .createTriggerOrder(
            ethers.ZeroAddress,
            adapter.target,
            ETH,
            ETH,
            true,
            size,
            triggerOrderType.takeProfit,
            triggerPrice,
            acceptablePrice,
            executionFee,
            {
              value: executionFee,
            }
          );
        positionKey = await warehouse.getPositionKey(
          ethers.ZeroAddress,
          adapter.target,
          ETH,
          ETH,
          true
        );
      });

      it("reverts when msg.sender is not orderKeeper", async () => {
        await expect(
          warehouse.connect(user).executeTriggerOrder(positionKey, 0)
        ).to.be.revertedWith("msg.sender: not orderKeeper");
      });

      it("reverts when id is out of range", async () => {
        await expect(
          warehouse.connect(orderKeeper).executeTriggerOrder(positionKey, 1)
        ).to.be.revertedWith("id: out of range");
      });

      it("reverts when price is not acceptable", async () => {
        await adapter.setWrapPrice(acceptablePrice - 1n);
        await expect(
          warehouse.connect(orderKeeper).executeTriggerOrder(positionKey, 0)
        ).to.be.revertedWith("price: not acceptable");
      });

      it("executes trigger order", async () => {
        await adapter.setWrapPrice(acceptablePrice);
        const exchangeMock = await ethers.deployContract("ExchangeMock");
        await warehouse.connect(owner).setExchange(exchangeMock.target);

        await warehouse
          .connect(orderKeeper)
          .executeTriggerOrder(positionKey, 0);

        const triggerOrder = await warehouse.getTriggerOrder(positionKey, 0);
        expect(triggerOrder.state).to.be.equal(triggerOrderState.executed);
      });
    });
  });
});
