const { ethers } = require("hardhat");

describe("Account", () => {
  // gmx contracts
  const PositionRouter = "0xb87a436b93ffe9d75c5cfa7bacfff96430b09868";
  const Router = "0xabbc5f99639c9b6bcb58544ddf04efa6802f4064";
  const Vault = "0x489ee077994b6658eafa855c308275ead8097c4a";
  // uniswap
  const SwapRouter = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

  // mux contracts
  const OrderBook = "0xa19fD5aB6C8DCffa2A295F78a5Bb4aC543AAF5e3";
  const LiquidityPool = "0x3e0199792ce69dc29a0a36146bfa68bd7c8d6633";

  // token contracts
  const WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
  const USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";

  let user0;
  // gmx
  let impersonatedAdmin;
  let impersonatedPositionKeeper;
  // mux
  let impersonatedBroker;

  let positionRouter;
  let orderBook;

  let gmxV1;
  let mux;
  let account;

  before(async () => {
    [user0] = await ethers.getSigners();
    impersonatedAdmin = await ethers.getImpersonatedSigner(
      "0xb4d2603b2494103c90b2c607261dd85484b49ef0" // gmx admin
    );
    impersonatedPositionKeeper = await ethers.getImpersonatedSigner(
      "0xDd763ED8Ce604E9a61F1e1aed433c1362e05700d" // gmx position keeper
    );
    impersonatedBroker = await ethers.getImpersonatedSigner(
      "0x988aa44e12c7bce07e449a4156b4a269d6642b3a" // mux broker
    );

    positionRouter = await ethers.getContractAt(
      // gmx position router
      "IPositionRouter",
      PositionRouter
    );
    await positionRouter
      .connect(impersonatedAdmin)
      .setPositionKeeper(impersonatedPositionKeeper.address, true); // execution reverted: 403
    await positionRouter.connect(impersonatedAdmin).setDelayValues(0, 0, 100); // execution reverted: delay
    orderBook = await ethers.getContractAt("IOrderBook", OrderBook); // mux order book

    weth = await ethers.getContractAt("IERC20", WETH);
    usdc = await ethers.getContractAt("IERC20", USDC);
  });

  beforeEach(async () => {
    gmxV1 = await ethers.deployContract("GMXV1", [
      PositionRouter,
      Router,
      Vault,
      SwapRouter,
    ]);
    mux = await ethers.deployContract("MUX", [OrderBook, LiquidityPool]);
    account = await ethers.deployContract("Account");
  });

  describe("deposit", () => {
    it("test", async () => {
      // console.log("1");
    });
  });

  describe("withdraw", () => {
    it("test", async () => {
      // console.log("2");
    });
  });

  describe("after deposit", () => {
    const order = {
      increasePosition: 0,
      decreasePosition: 1,
      increaseCollateral: 2,
      decreaseCollateral: 3,
    };
    const wethAmount = ethers.parseEther("1");

    beforeEach(async () => {
      await weth.deposit({ value: wethAmount });
      await weth.approve(account.target, wethAmount);

      await account.deposit(WETH, wethAmount);
    });

    describe("long", async () => {
      const long = true;
      const collateral = WETH;
      const index = WETH;
      const collateralAmount = wethAmount;

      describe("gmx", () => {
        const size = ethers.parseUnits("6000", 30);
        const fee = BigInt("180000000000000");

        it("increase position", async () => {
          await account.createOrders(
            order.increasePosition,
            [gmxV1.target],
            collateral,
            index,
            [collateralAmount],
            [size],
            long,
            {
              value: fee,
            }
          );
          const increasePositionsIndex =
            await positionRouter.increasePositionsIndex(account.target);
          const requestKey = await positionRouter.getRequestKey(
            account.target,
            increasePositionsIndex
          );
          await positionRouter
            .connect(impersonatedPositionKeeper)
            .executeIncreasePosition(requestKey, user0.address);

          const position = await gmxV1.getPosition(
            account.target,
            WETH,
            WETH,
            long
          );
          console.log(`position: ${position}`);
        });
      });

      describe("mux", () => {
        const size = ethers.parseEther("10");

        it("increase position", async () => {
          await account.createOrders(
            order.increasePosition,
            [mux.target],
            collateral,
            index,
            [collateralAmount],
            [size],
            long,
            {
              value: collateralAmount,
            }
          );
          const orderId = (await orderBook.nextOrderId()) - 1n;
          await orderBook.connect(impersonatedBroker).fillPositionOrder(
            orderId,
            1, // collateralPrice
            1, // assetPrice
            1 // profitAssetPrice
          );

          const position = await mux.getPosition(
            account.target,
            collateral,
            index,
            long
          );
          console.log(`position: ${position}`);
        });
      });
    });
  });
});
