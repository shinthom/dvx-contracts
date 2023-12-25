const { ethers } = require("hardhat");

describe("MUX", () => {
  // mux contracts
  const OrderBook = "0xa19fD5aB6C8DCffa2A295F78a5Bb4aC543AAF5e3";
  const LiquidityPool = "0x3e0199792ce69dc29a0a36146bfa68bd7c8d6633";

  // token contracts
  const WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
  const USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
  const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

  // signers
  let user0;
  let impersonatedBroker;

  // contracts
  let mux;

  const fillPositionOrder = async () => {
    const orderId = (await orderBook.nextOrderId()) - 1n;
    await orderBook.connect(impersonatedBroker).fillPositionOrder(
      orderId,
      1, // collateralPrice
      1, // assetPrice
      1 // profitAssetPrice
    );
  };

  const fillWithdrawalOrder = async () => {
    const orderId = (await orderBook.nextOrderId()) - 1n;
    await orderBook.connect(impersonatedBroker).fillWithdrawalOrder(
      orderId,
      1, // collateralPrice
      1, // assetPrice
      1 // profitAssetPrice
    );
  };

  before(async () => {
    [user0] = await ethers.getSigners();
    impersonatedBroker = await ethers.getImpersonatedSigner(
      "0x988aa44e12c7bce07e449a4156b4a269d6642b3a" // mux broker
    );

    orderBook = await ethers.getContractAt("IOrderBook", OrderBook);
    weth = await ethers.getContractAt("IERC20", WETH);
    usdc = await ethers.getContractAt("IERC20", USDC);
  });

  beforeEach(async () => {
    mux = await ethers.deployContract("MUX", [OrderBook, LiquidityPool]);
  });

  describe("values", () => {
    const wethPrice = ethers.parseUnits("2000", 18);
    const wbtcPrice = ethers.parseUnits("40000", 18);
    const usdcPrice = ethers.parseUnits("1", 18);

    const collateralAmount = ethers.parseEther("1");
    const leverage = 10n;
    const size = collateralAmount * leverage;

    const longEntryFundingRate = 227341250000000000n;
    const shortEntryFundingRate = 284260836750000000000n;

    it("getPrice", async () => {
      console.log(await mux.getPrice(WETH, wethPrice, true));
      console.log(await mux.getPrice(WETH, wethPrice, false));
      console.log(await mux.getPrice(WBTC, wbtcPrice, true));
      console.log(await mux.getPrice(WBTC, wbtcPrice, false));
      console.log(await mux.getPrice(USDC, usdcPrice, true));
      console.log(await mux.getPrice(USDC, usdcPrice, false));
    });

    it("position fee", async () => {
      console.log(
        await mux.getPositionFee(ethers.ZeroAddress, WETH, wethPrice, size)
      );
    });

    it("funding fee", async () => {
      const long = true;
      const short = false;

      console.log(
        "long",
        await mux.getFundingFee(
          ethers.ZeroAddress,
          WETH,
          size,
          longEntryFundingRate,
          long,
          wethPrice
        )
      );
      console.log(
        "short",
        await mux.getFundingFee(
          ethers.ZeroAddress,
          WETH,
          size,
          shortEntryFundingRate,
          short,
          wethPrice
        )
      );
    });
  });

  describe("make order", () => {
    const leverage = 10n;

    it("eth -> eth", async () => {
      const collateralPrice = 2000n;
      const indexPrice = 2000n;

      const order = await mux.makePositionOrder(
        WETH,
        WETH,
        ethers.parseEther("1"),
        leverage,
        true,
        collateralPrice,
        indexPrice
      );
      console.log(order);
    });

    it("usdc -> eth", async () => {
      const collateralPrice = 1n;
      const indexPrice = 2000n;

      const order = await mux.makePositionOrder(
        USDC,
        WETH,
        ethers.parseUnits("100", 6),
        leverage,
        true,
        collateralPrice,
        indexPrice
      );
      console.log(order);
    });

    it("wbtc -> eth", async () => {
      const collateralPrice = 40000n;
      const indexPrice = 2000n;

      const order = await mux.makePositionOrder(
        WBTC,
        WETH,
        ethers.parseUnits("1", 8),
        leverage,
        true,
        collateralPrice,
        indexPrice
      );
      console.log(order);
    });

    it("eth -> wbtc", async () => {
      const collateralPrice = 2000n;
      const indexPrice = 40000n;

      const order = await mux.makePositionOrder(
        WETH,
        WBTC,
        ethers.parseEther("1"),
        leverage,
        true,
        collateralPrice,
        indexPrice
      );
      console.log(order);
    });

    it("usdc -> wbtc", async () => {
      const collateralPrice = 1n;
      const indexPrice = 40000n;

      const order = await mux.makePositionOrder(
        USDC,
        WBTC,
        ethers.parseUnits("100", 6),
        leverage,
        true,
        collateralPrice,
        indexPrice
      );
      console.log(order);
    });

    it("wbtc -> wbtc", async () => {
      const collateralPrice = 40000n;
      const indexPrice = 40000n;

      const order = await mux.makePositionOrder(
        WBTC,
        WBTC,
        ethers.parseUnits("1", 8),
        leverage,
        true,
        collateralPrice,
        indexPrice
      );
      console.log(order);
    });
  });

  describe("long", () => {
    const long = true;

    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");

    beforeEach(async () => {
      await weth.deposit({ value: collateralAmount });
      await weth.approve(mux.target, collateralAmount);
    });

    it("increases position", async () => {
      await mux.increasePosition(
        collateral,
        index,
        collateralAmount,
        size,
        long,
        {
          value: collateralAmount,
        }
      );
      await fillPositionOrder();

      const position = await mux.getPosition(
        mux.target,
        collateral,
        index,
        long
      );
      console.log(`position: ${position}`);
    });

    describe("after increase position", () => {
      beforeEach(async () => {
        await mux.increasePosition(
          collateral,
          index,
          collateralAmount,
          size,
          long,
          {
            value: collateralAmount,
          }
        );
        await fillPositionOrder();

        const position = await mux.getPosition(
          mux.target,
          collateral,
          index,
          long
        );
        console.log(`position: ${position}`);
      });

      it("decrease position (1/2)", async () => {
        await mux.decreasePosition(collateral, index, size / 2n, long);
        await fillPositionOrder();

        const position = await mux.getPosition(
          mux.target,
          collateral,
          index,
          long
        );
        console.log(`position: ${position}`);
      });

      it("decrease position (2/2)", async () => {
        await mux.decreasePosition(collateral, index, size, long);
        await fillPositionOrder();

        // NOTE: receive function is called, because ether is sent to the contract
        const position = await mux.getPosition(
          mux.target,
          collateral,
          index,
          long
        );
        console.log(`position: ${position}`);
      });

      it("increase collateral", async () => {
        await mux.increaseCollateral(
          collateral,
          index,
          collateralAmount,
          long,
          {
            value: collateralAmount,
          }
        );
        // note: when collateral is increased, the order doesn't need to be filled
        // await fillPositionOrder();

        const position = await mux.getPosition(
          mux.target,
          collateral,
          index,
          long
        );
        console.log(`position: ${position}`);
      });

      it("decrease collateral", async () => {
        await mux.decreaseCollateral(
          collateral,
          index,
          collateralAmount / 10n,
          long,
          {
            value: collateralAmount,
          }
        );
        await fillWithdrawalOrder();

        const position = await mux.getPosition(
          mux.target,
          collateral,
          index,
          long
        );
        console.log(`position: ${position}`);
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
      await fillPositionOrder();

      const position = await mux.getPosition(
        mux.target,
        collateral,
        index,
        short
      );
      console.log(`position: ${position}`);
    });

    describe("after increase position", () => {
      beforeEach(async () => {
        await mux.increasePosition(collateral, index, amount, size, short, {
          value: amount,
        });
        await fillPositionOrder();

        const position = await mux.getPosition(
          mux.target,
          collateral,
          index,
          short
        );
        console.log(`position: ${position}`);
      });

      it("decrease position (1/2)", async () => {
        await mux.decreasePosition(collateral, index, size / 2n, short);
        await fillPositionOrder();

        const position = await mux.getPosition(
          mux.target,
          collateral,
          index,
          short
        );
        console.log(`position: ${position}`);
      });

      it("decrease position (2/2)", async () => {
        await mux.decreasePosition(collateral, index, size, short);
        await fillPositionOrder();

        // NOTE: receive function is called, because ether is sent to the contract
        const position = await mux.getPosition(
          mux.target,
          collateral,
          index,
          short
        );
        console.log(`position: ${position}`);
      });

      it("increase collateral", async () => {
        await mux.increaseCollateral(collateral, index, amount, short, {
          value: amount,
        });
        // note: when collateral is increased, the order doesn't need to be filled
        // await fillPositionOrder();

        const position = await mux.getPosition(
          mux.target,
          collateral,
          index,
          short
        );
        console.log(`position: ${position}`);
      });

      it("decrease collateral", async () => {
        await mux.decreaseCollateral(collateral, index, amount / 10n, short, {
          value: amount,
        });
        await fillWithdrawalOrder();

        const position = await mux.getPosition(
          mux.target,
          collateral,
          index,
          short
        );
        console.log(`position: ${position}`);
      });
    });
  });
});
