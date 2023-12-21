const { ethers } = require("hardhat");

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
const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

let user0;
// gmx
let impersonatedAdmin;
let impersonatedPositionKeeper;
// mux
let impersonatedBroker;

let weth;
let usdc;
let wbtc;

let positionRouter;
let orderBook;

let gmxV1;
let mux;
let exchange;
let quoter;
let reader;
let account;

const deploy = async () => {
  // accounts
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
  wbtc = await ethers.getContractAt("IERC20", WBTC);

  // deploy
  gmxV1 = await ethers.deployContract("GMXV1", [
    PositionRouter,
    Router,
    Vault,
    SwapRouter,
  ]);
  mux = await ethers.deployContract("MUX", [OrderBook, LiquidityPool]);
  exchange = await ethers.deployContract("Exchange", [SwapRouter]);
  quoter = await ethers.deployContract("Quoter");
  reader = await ethers.deployContract("Reader");
  account = await ethers.deployContract("Account", [
    user0.address,
    exchange.target,
  ]);

  const swap = async (from, to, fromAmount) => {
    await weth.deposit({ value: fromAmount });
    await weth.transfer(gmxV1.target, fromAmount);

    await gmxV1.swap(from, to, fromAmount);
  };

  const executeIncreasePosition = async () => {
    const increasePositionsIndex = await positionRouter.increasePositionsIndex(
      account.target
    );
    const requestKey = await positionRouter.getRequestKey(
      account.target,
      increasePositionsIndex
    );
    await positionRouter
      .connect(impersonatedPositionKeeper)
      .executeIncreasePosition(requestKey, user0.address);
  };

  const executeDecreasePosition = async () => {
    const decreasePositionsIndex = await positionRouter.decreasePositionsIndex(
      account.target
    );
    const requestKey = await positionRouter.getRequestKey(
      account.target,
      decreasePositionsIndex
    );
    await positionRouter
      .connect(impersonatedPositionKeeper)
      .executeDecreasePosition(requestKey, user0.address);
  };

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

  return {
    user0,
    impersonatedAdmin,
    impersonatedPositionKeeper,
    impersonatedBroker,
    positionRouter,
    orderBook,
    weth,
    usdc,
    wbtc,
    gmxV1,
    mux,
    exchange,
    quoter,
    reader,
    account,
    tokens: {
      WETH,
      USDC,
      WBTC,
    },
    swap,
    executeIncreasePosition,
    executeDecreasePosition,
    fillPositionOrder,
    fillWithdrawalOrder,
  };
};

module.exports = {
  deploy,
};
