const { ethers } = require("hardhat");

describe("MUX", () => {
  // mux contracts
  const OrderBook = "0xa19fD5aB6C8DCffa2A295F78a5Bb4aC543AAF5e3";
  const LiquidityPool = "0x3e0199792ce69dc29a0a36146bfa68bd7c8d6633";

  // token contracts
  const WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
  const USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";

  // signers
  let user0;
  let impersonatedBroker;

  // contracts
  let mux;

  before(async () => {
    [user0] = await ethers.getSigners();
    impersonatedBroker = await ethers.getImpersonatedSigner(
      "0x988aa44e12c7bce07e449a4156b4a269d6642b3a"
    );

    orderBook = await ethers.getContractAt("IOrderBook", OrderBook);
    weth = await ethers.getContractAt("IERC20", WETH);
    usdc = await ethers.getContractAt("IERC20", USDC);
  });

  beforeEach(async () => {
    mux = await ethers.deployContract("MUX", [OrderBook, LiquidityPool]);
  });

  describe("long", () => {
    const long = true;

    const collateral = WETH;
    const index = WETH;
    const amount = ethers.parseEther("0.1");
    const size = ethers.parseEther("2"); // different from GMX

    beforeEach(async () => {
      await weth.deposit({ value: amount });
      await weth.approve(mux.target, amount);
    });

    it("increases position", async () => {
      await mux.increasePosition(collateral, index, amount, size, long, {
        value: amount,
      });

      const orderId = (await orderBook.nextOrderId()) - 1n;
      await orderBook.connect(impersonatedBroker).fillPositionOrder(
        orderId,
        1, // collateralPrice
        1, // assetPrice
        1 // profitAssetPrice
      );
      const position = await mux.getPosition(collateral, index, long);
    });

    describe("after increase position", () => {
      beforeEach(async () => {
        await mux.increasePosition(collateral, index, amount, size, long, {
          value: amount,
        });

        const orderId = (await orderBook.nextOrderId()) - 1n;

        await orderBook.connect(impersonatedBroker).fillPositionOrder(
          orderId,
          1, // collateralPrice
          1, // assetPrice
          1 // profitAssetPrice
        );
        const position = await mux.getPosition(collateral, index, long);
      });

      it("decrease position (1/2)", async () => {
        await mux.decreasePosition(collateral, index, size / 2n, long);

        const orderId = (await orderBook.nextOrderId()) - 1n;
        await orderBook.connect(impersonatedBroker).fillPositionOrder(
          orderId,
          1, // collateralPrice
          1, // assetPrice
          1 // profitAssetPrice
        );

        const position = await mux.getPosition(collateral, index, long);
      });

      it("decrease position (2/2)", async () => {
        await mux.decreasePosition(collateral, index, size, long);

        const orderId = (await orderBook.nextOrderId()) - 1n;
        await orderBook.connect(impersonatedBroker).fillPositionOrder(
          orderId,
          1, // collateralPrice
          1, // assetPrice
          1 // profitAssetPrice
        );

        // NOTE: receive function is called, because ether is sent to the contract
        const position = await mux.getPosition(collateral, index, long);
      });

      it("increase collateral", async () => {
        await mux.increaseCollateral(collateral, index, amount, long, {
          value: amount,
        });

        const position = await mux.getPosition(collateral, index, long);
      });

      it("decrease collateral", async () => {
        await mux.decreaseCollateral(collateral, index, amount / 10n, long, {
          value: amount,
        });

        const orderId = (await orderBook.nextOrderId()) - 1n;

        await orderBook.connect(impersonatedBroker).fillWithdrawalOrder(
          orderId,
          1, // collateralPrice
          1, // assetPrice
          1 // profitAssetPrice
        );

        const position = await mux.getPosition(collateral, index, long);
      });
    });
  });

  describe("short", () => {
    const short = false;

    const collateral = WETH;
    const index = WETH;
    const amount = ethers.parseEther("0.1");
    const size = ethers.parseEther("2"); // different from GMX

    beforeEach(async () => {
      await weth.deposit({ value: amount });
      await weth.approve(mux.target, amount);
    });

    it("increases position", async () => {
      await mux.increasePosition(collateral, index, amount, size, short, {
        value: amount,
      });

      const orderId = (await orderBook.nextOrderId()) - 1n;
      await orderBook.connect(impersonatedBroker).fillPositionOrder(
        orderId,
        1, // collateralPrice
        1, // assetPrice
        1 // profitAssetPrice
      );
      const position = await mux.getPosition(collateral, index, short);
    });

    describe("after increase position", () => {
      beforeEach(async () => {
        await mux.increasePosition(collateral, index, amount, size, short, {
          value: amount,
        });

        const orderId = (await orderBook.nextOrderId()) - 1n;

        await orderBook.connect(impersonatedBroker).fillPositionOrder(
          orderId,
          1, // collateralPrice
          1, // assetPrice
          1 // profitAssetPrice
        );
        const position = await mux.getPosition(collateral, index, short);
      });

      it("decrease position (1/2)", async () => {
        await mux.decreasePosition(collateral, index, size / 2n, short);

        const orderId = (await orderBook.nextOrderId()) - 1n;
        await orderBook.connect(impersonatedBroker).fillPositionOrder(
          orderId,
          1, // collateralPrice
          1, // assetPrice
          1 // profitAssetPrice
        );

        const position = await mux.getPosition(collateral, index, short);
      });

      it("decrease position (2/2)", async () => {
        await mux.decreasePosition(collateral, index, size, short);

        const orderId = (await orderBook.nextOrderId()) - 1n;
        await orderBook.connect(impersonatedBroker).fillPositionOrder(
          orderId,
          1, // collateralPrice
          1, // assetPrice
          1 // profitAssetPrice
        );

        // NOTE: receive function is called, because ether is sent to the contract
        const position = await mux.getPosition(collateral, index, short);
      });

      it("increase collateral", async () => {
        await mux.increaseCollateral(collateral, index, amount, short, {
          value: amount,
        });

        const position = await mux.getPosition(collateral, index, short);
      });

      it("decrease collateral", async () => {
        await mux.decreaseCollateral(collateral, index, amount / 10n, short, {
          value: amount,
        });

        const orderId = (await orderBook.nextOrderId()) - 1n;

        await orderBook.connect(impersonatedBroker).fillWithdrawalOrder(
          orderId,
          1, // collateralPrice
          1, // assetPrice
          1 // profitAssetPrice
        );

        const position = await mux.getPosition(collateral, index, short);
      });
    });
  });
});
