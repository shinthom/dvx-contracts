const { ethers, network } = require("hardhat");
const { expect } = require("chai");
const { faucet } = require("./helper");

let snapshotId;

describe("Warehouse", () => {
  const ETH = ethers.ZeroAddress;
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
    [user, other, gov, exchange, orderKeeper] = await ethers.getSigners();

    wbtc = await ethers.getContractAt("IERC20", WBTC);
    usdc = await ethers.getContractAt("IERC20", USDC);

    warehouse = await ethers.deployContract("Warehouse");
    await warehouse.setGov(gov.address);

    adapter = await ethers.deployContract("AdapterMock");

    snapshotId = await network.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await network.provider.send("evm_revert", [snapshotId]);
  });

  describe("setExchange", () => {
    const newExchange = "0x" + "11".repeat(20);

    it("reverts when not gov", async () => {
      await expect(
        warehouse.connect(other).setExchange(newExchange)
      ).to.be.revertedWith("msg.sender: not gov");
    });

    it("sets exchange", async () => {
      await expect(warehouse.connect(gov).setExchange(newExchange))
        .to.emit(warehouse, "ExchangeSet")
        .withArgs(newExchange);
      expect(await warehouse.exchange()).to.be.equal(newExchange);
    });
  });

  describe("setOrderKeeper", () => {
    const newOrderKeeper = "0x" + "11".repeat(20);

    it("reverts when not gov", async () => {
      await expect(
        warehouse.connect(other).setOrderKeeper(newOrderKeeper, true)
      ).to.be.revertedWith("msg.sender: not gov");
    });

    it("sets order keeper", async () => {
      await expect(warehouse.connect(gov).setOrderKeeper(newOrderKeeper, true))
        .to.emit(warehouse, "OrderKeeperSet")
        .withArgs(newOrderKeeper, true);
      expect(await warehouse.isOrderKeeper(newOrderKeeper)).to.be.equal(true);
    });
  });

  describe("triggerOrder", () => {
    const triggerPrice = ethers.parseUnits("2000", 18);
    const acceptablePrice = ethers.parseUnits("1900", 18);
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
      await warehouse.connect(gov).setExchange(exchange);
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
        var acceptablePrice = ethers.parseUnits("2101", 18);
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

      it("reverts when executionFee is not match", async () => {
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
              { value: executionFee - 1 }
            )
        ).to.be.revertedWith("executionFee: not match");
      });

      it("reverts when executionFee is not enough", async () => {
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
              executionFee - 1,
              {
                value: executionFee - 1,
              }
            )
        ).to.be.revertedWith("executionFee: not enough");
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

      beforeEach(async () => {
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

      it("reverts when msg.sender is not exchange", async () => {
        await expect(
          warehouse.connect(user).cancelTriggerOrder(positionKey, 0)
        ).to.be.revertedWith("msg.sender: not exchange");
      });

      it("reverts when position does not exist", async () => {
        await expect(
          warehouse.connect(exchange).cancelTriggerOrder(ethers.ZeroHash, 0)
        ).to.be.revertedWith("id: out of range");
      });

      it("reverts when triggerOrder state is not pending", async () => {
        await warehouse.connect(exchange).cancelTriggerOrder(positionKey, 0);
        await expect(
          warehouse.connect(exchange).cancelTriggerOrder(positionKey, 0)
        ).to.be.revertedWith("triggerOrder: not pending");
      });

      it("cancel trigger order", async () => {
        await warehouse.connect(exchange).cancelTriggerOrder(positionKey, 0);
        const triggerOrder = await warehouse.getTriggerOrder(positionKey, 0);
        expect(triggerOrder.state).to.be.equal(triggerOrderState.canceled);
      });
    });

    describe("execute", () => {
      let positionKey;

      beforeEach(async () => {
        await warehouse.connect(gov).setOrderKeeper(orderKeeper.address, true);
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

      it("reverts when fee is insufficient", async () => {
        await adapter.setWrapPrice(acceptablePrice);

        await adapter.setMinExecutionFee(executionFee + 1);
        await expect(
          warehouse.connect(orderKeeper).executeTriggerOrder(positionKey, 0)
        ).to.be.revertedWith("fee: insufficient");
      });

      it("executes trigger order", async () => {
        await adapter.setWrapPrice(acceptablePrice);
        const exchangeMock = await ethers.deployContract("ExchangeMock");
        await warehouse.connect(gov).setExchange(exchangeMock.target);

        await warehouse
          .connect(orderKeeper)
          .executeTriggerOrder(positionKey, 0);

        const triggerOrder = await warehouse.getTriggerOrder(positionKey, 0);
        expect(triggerOrder.state).to.be.equal(triggerOrderState.executed);
      });
    });
  });
});
