const { ethers } = require("hardhat");

// gmx contracts
const PositionRouter = "0xb87a436b93ffe9d75c5cfa7bacfff96430b09868";
const Router = "0xabbc5f99639c9b6bcb58544ddf04efa6802f4064";
const Vault = "0x489ee077994b6658eafa855c308275ead8097c4a";

// mux contracts
const OrderBook = "0xa19fD5aB6C8DCffa2A295F78a5Bb4aC543AAF5e3";
const LiquidityPool = "0x3e0199792ce69dc29a0a36146bfa68bd7c8d6633";

// token contracts
const ETH = ethers.ZeroAddress;
const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

let deployer;
let user;
let other;
// gmx
let impersonatedAdmin;
let impersonatedPositionKeeper;
// mux
let impersonatedBroker;

let weth;
let usdc;
let wbtc;

let vault;
let positionRouter;
let orderBook;

let gmxV1;
let mux;
let exchange;
let warehouse;
let quoter;
let reader;
let account;

const deploy = async (noAccount) => {
  [deployer, user, other] = await ethers.getSigners();
  impersonatedAdmin = await ethers.getImpersonatedSigner(
    "0xb4d2603b2494103c90b2c607261dd85484b49ef0" // gmx admin
  );
  impersonatedPositionKeeper = await ethers.getImpersonatedSigner(
    "0xDd763ED8Ce604E9a61F1e1aed433c1362e05700d" // gmx position keeper
  );
  impersonatedBroker = await ethers.getImpersonatedSigner(
    "0x988aa44e12c7bce07e449a4156b4a269d6642b3a" // mux broker
  );

  vault = await ethers.getContractAt("IVault", Vault);
  positionRouter = await ethers.getContractAt(
    "IPositionRouter",
    PositionRouter
  );
  await positionRouter
    .connect(impersonatedAdmin)
    .setPositionKeeper(impersonatedPositionKeeper.address, true); // execution reverted: 403
  await positionRouter.connect(impersonatedAdmin).setDelayValues(0, 0, 100); // execution reverted: delay
  orderBook = await ethers.getContractAt("IOrderBook", OrderBook); // mux order book
  quoter = await ethers.deployContract("Quoter");

  weth = await ethers.getContractAt("IERC20", WETH);
  usdc = await ethers.getContractAt("IERC20", USDC);
  wbtc = await ethers.getContractAt("IERC20", WBTC);

  const warehouseImpl = await ethers.deployContract("Warehouse");
  const warehouseProxy = await ethers.deployContract("ERC1967Proxy", [
    warehouseImpl.target,
    "0x",
  ]);
  warehouse = await ethers.getContractAt("Warehouse", warehouseProxy.target);
  await warehouse.initialize();

  const exchangeImpl = await ethers.deployContract("Exchange");
  const exchangeProxy = await ethers.deployContract("ERC1967Proxy", [
    exchangeImpl.target,
    "0x",
  ]);
  exchange = await ethers.getContractAt("Exchange", exchangeProxy.target);
  await exchange.initialize(warehouse.target);
  gmxV1 = await ethers.deployContract("GMXV1", [
    PositionRouter,
    Router,
    Vault,
    exchange.target,
  ]);
  mux = await ethers.deployContract("MUX", [OrderBook, LiquidityPool]);
  reader = await ethers.deployContract("Reader");

  const minExecutionFee = await positionRouter.minExecutionFee();
  const orderType = {
    increasePosition: 0,
    decreasePosition: 1,
    increaseCollateral: 2,
    decreaseCollateral: 3,
  };

  if (!noAccount) {
    await exchange.connect(user).createAccount();
    account = await ethers.getContractAt(
      "Account",
      await exchange.account(user.address)
    );
  }

  const checkBalance = async (account) => {
    console.log(`
-  ETH: ${await account.getBalance(ETH)}
- WETH: ${await account.getBalance(WETH)}
- WBTC: ${await account.getBalance(WBTC)}
- USDC: ${await account.getBalance(USDC)}`);
  };

  const faucet = async (token, tokenAmount) => {
    // swap from eth to some token (tokenIn is eth amount)
    await exchange.connect(user).swap(ETH, token, tokenAmount, {
      value: tokenAmount,
    });
  };

  const executeIncreasePosition = async (account) => {
    const increasePositionsIndex = await positionRouter.increasePositionsIndex(
      account
    );
    const requestKey = await positionRouter.getRequestKey(
      account,
      increasePositionsIndex
    );
    await positionRouter
      .connect(impersonatedPositionKeeper)
      .executeIncreasePosition(requestKey, user.address);
  };

  const executeDecreasePosition = async (account) => {
    const decreasePositionsIndex = await positionRouter.decreasePositionsIndex(
      account
    );
    const requestKey = await positionRouter.getRequestKey(
      account,
      decreasePositionsIndex
    );
    await positionRouter
      .connect(impersonatedPositionKeeper)
      .executeDecreasePosition(requestKey, user.address);
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

  const increaseTime = async (seconds) => {
    await hre.network.provider.request({
      method: "evm_increaseTime",
      params: [seconds],
    });
  };

  const updateCumulativeFundingRate = async (collateral) => {
    const seconds = 60 * 60 * 8; // 8 hours
    await increaseTime(seconds);

    // const beforeFundingRate = await vault.cumulativeFundingRates(collateral);
    await vault.updateCumulativeFundingRate(collateral);
    // const afterFundingRate = await vault.cumulativeFundingRates(collateral);
    // console.log(`\nfundingRate is updated: ${beforeFundingRate} -> ${afterFundingRate}\n`) // prettier-ignore
  };

  const updateFundingState = async () => {
    const seconds = 60 * 60; // 1 hour
    await increaseTime(seconds);

    // https://arbiscan.io/tx/0xb7247660ad4932af989002906e412b95db834336cd0e10c2aaa39e222ef2eab3
    await orderBook
      .connect(impersonatedBroker)
      .updateFundingState(
        6669,
        [3, 4, 5, 6, 7, 9, 10],
        [25598, 55672, 99861, 1399, 99893, 52691, 86066],
        [
          2241900000000000000000n,
          42781000000000000000000n,
          46096000000000000000n,
          272630000000000000000n,
          541450000000000000n,
          3272400000000000000n,
          1333900000000000000n,
        ]
      );
  };

  return {
    deployer,
    user,
    other,
    impersonatedAdmin,
    impersonatedPositionKeeper,
    impersonatedBroker,
    vault,
    positionRouter,
    minExecutionFee,
    orderType,
    orderBook,
    weth,
    usdc,
    wbtc,
    gmxV1,
    mux,
    exchange,
    warehouse,
    quoter,
    reader,
    account,
    ETH,
    WETH,
    USDC,
    WBTC,
    checkBalance,
    faucet,
    executeIncreasePosition,
    executeDecreasePosition,
    fillPositionOrder,
    fillWithdrawalOrder,
    updateCumulativeFundingRate,
    updateFundingState,
  };
};

const deployAndDeposit = async () => {
  const {
    deployer,
    user,
    other,
    impersonatedAdmin,
    impersonatedPositionKeeper,
    impersonatedBroker,
    vault,
    positionRouter,
    minExecutionFee,
    orderType,
    orderBook,
    weth,
    usdc,
    wbtc,
    gmxV1,
    mux,
    exchange,
    warehouse,
    quoter,
    reader,
    account,
    ETH,
    WETH,
    USDC,
    WBTC,
    checkBalance,
    faucet,
    executeIncreasePosition,
    executeDecreasePosition,
    fillPositionOrder,
    fillWithdrawalOrder,
    updateCumulativeFundingRate,
    updateFundingState,
  } = await deploy();

  const depositAmount = ethers.parseEther("1");
  await faucet(WBTC, depositAmount);
  await faucet(USDC, depositAmount);

  await account.connect(user).deposit(ethers.ZeroAddress, depositAmount, { value: depositAmount }); // prettier-ignore
  await wbtc.connect(user).approve(account.target, await wbtc.balanceOf(user.address)); // prettier-ignore
  await usdc.connect(user).approve(account.target, await usdc.balanceOf(user.address)); // prettier-ignore
  await account.connect(user).deposit(WBTC, await wbtc.balanceOf(user.address));
  await account.connect(user).deposit(USDC, await usdc.balanceOf(user.address));

  return {
    deployer,
    user,
    other,
    impersonatedAdmin,
    impersonatedPositionKeeper,
    impersonatedBroker,
    vault,
    positionRouter,
    minExecutionFee,
    orderType,
    orderBook,
    weth,
    usdc,
    wbtc,
    gmxV1,
    mux,
    exchange,
    warehouse,
    quoter,
    reader,
    account,
    ETH,
    WETH,
    USDC,
    WBTC,
    checkBalance,
    faucet,
    executeIncreasePosition,
    executeDecreasePosition,
    fillPositionOrder,
    fillWithdrawalOrder,
    updateCumulativeFundingRate,
    updateFundingState,
  };
};

const deployAndDepositETH = async () => {
  const {
    deployer,
    user,
    other,
    impersonatedAdmin,
    impersonatedPositionKeeper,
    impersonatedBroker,
    vault,
    positionRouter,
    minExecutionFee,
    orderType,
    orderBook,
    weth,
    usdc,
    wbtc,
    gmxV1,
    mux,
    exchange,
    warehouse,
    quoter,
    reader,
    account,
    ETH,
    WETH,
    USDC,
    WBTC,
    checkBalance,
    faucet,
    executeIncreasePosition,
    executeDecreasePosition,
    fillPositionOrder,
    fillWithdrawalOrder,
    updateCumulativeFundingRate,
    updateFundingState,
  } = await deploy();

  const depositAmount = ethers.parseEther("1");
  await account.connect(user).deposit(ethers.ZeroAddress, depositAmount, { value: depositAmount }); // prettier-ignore

  return {
    deployer,
    user,
    other,
    impersonatedAdmin,
    impersonatedPositionKeeper,
    impersonatedBroker,
    vault,
    positionRouter,
    minExecutionFee,
    orderType,
    orderBook,
    weth,
    usdc,
    wbtc,
    gmxV1,
    mux,
    exchange,
    warehouse,
    quoter,
    reader,
    account,
    ETH,
    WETH,
    USDC,
    WBTC,
    checkBalance,
    faucet,
    executeIncreasePosition,
    executeDecreasePosition,
    fillPositionOrder,
    fillWithdrawalOrder,
    updateCumulativeFundingRate,
    updateFundingState,
  };
};

const deployAndDepositWBTC = async () => {
  const {
    deployer,
    user,
    other,
    impersonatedAdmin,
    impersonatedPositionKeeper,
    impersonatedBroker,
    vault,
    positionRouter,
    minExecutionFee,
    orderType,
    orderBook,
    weth,
    usdc,
    wbtc,
    gmxV1,
    mux,
    exchange,
    warehouse,
    quoter,
    reader,
    account,
    ETH,
    WETH,
    USDC,
    WBTC,
    checkBalance,
    faucet,
    executeIncreasePosition,
    executeDecreasePosition,
    fillPositionOrder,
    fillWithdrawalOrder,
    updateCumulativeFundingRate,
    updateFundingState,
  } = await deploy();
  const depositAmount = ethers.parseEther("1");
  await faucet(WBTC, depositAmount);

  await wbtc.connect(user).approve(account.target, await wbtc.balanceOf(user.address)); // prettier-ignore
  await account.connect(user).deposit(WBTC, await wbtc.balanceOf(user.address));

  return {
    deployer,
    user,
    other,
    impersonatedAdmin,
    impersonatedPositionKeeper,
    impersonatedBroker,
    vault,
    positionRouter,
    minExecutionFee,
    orderType,
    orderBook,
    weth,
    usdc,
    wbtc,
    gmxV1,
    mux,
    exchange,
    warehouse,
    quoter,
    reader,
    account,
    ETH,
    WETH,
    USDC,
    WBTC,
    checkBalance,
    faucet,
    executeIncreasePosition,
    executeDecreasePosition,
    fillPositionOrder,
    fillWithdrawalOrder,
    updateCumulativeFundingRate,
    updateFundingState,
  };
};

const deployAndDepositUSDC = async () => {
  const {
    deployer,
    user,
    other,
    impersonatedAdmin,
    impersonatedPositionKeeper,
    impersonatedBroker,
    vault,
    positionRouter,
    minExecutionFee,
    orderType,
    orderBook,
    weth,
    usdc,
    wbtc,
    gmxV1,
    mux,
    exchange,
    warehouse,
    quoter,
    reader,
    account,
    ETH,
    WETH,
    USDC,
    WBTC,
    checkBalance,
    faucet,
    executeIncreasePosition,
    executeDecreasePosition,
    fillPositionOrder,
    fillWithdrawalOrder,
    updateCumulativeFundingRate,
    updateFundingState,
  } = await deploy();
  const depositAmount = ethers.parseEther("1");
  await faucet(USDC, depositAmount);

  await usdc.connect(user).approve(account.target, await usdc.balanceOf(user.address)); // prettier-ignore
  await account.connect(user).deposit(USDC, await usdc.balanceOf(user.address));

  return {
    deployer,
    user,
    other,
    impersonatedAdmin,
    impersonatedPositionKeeper,
    impersonatedBroker,
    vault,
    positionRouter,
    minExecutionFee,
    orderType,
    orderBook,
    weth,
    usdc,
    wbtc,
    gmxV1,
    mux,
    exchange,
    warehouse,
    quoter,
    reader,
    account,
    ETH,
    WETH,
    USDC,
    WBTC,
    checkBalance,
    faucet,
    executeIncreasePosition,
    executeDecreasePosition,
    fillPositionOrder,
    fillWithdrawalOrder,
    updateCumulativeFundingRate,
    updateFundingState,
  };
};

module.exports = {
  deploy,
  deployAndDeposit,
  deployAndDepositETH,
  deployAndDepositUSDC,
  deployAndDepositWBTC,
};
