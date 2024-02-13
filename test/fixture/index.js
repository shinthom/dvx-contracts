const { ethers } = require("hardhat");

const PositionRouter = "0xb87a436b93ffe9d75c5cfa7bacfff96430b09868";
const Router = "0xabbc5f99639c9b6bcb58544ddf04efa6802f4064";
const Vault = "0x489ee077994b6658eafa855c308275ead8097c4a";
const Timelock = "0xe7E740Fa40CA16b15B621B49de8E9F0D69CF4858";
const VaultPriceFeed = "0x2d68011bcA022ed0E474264145F46CC4de96a002";
const FastPriceFeed = "0x11D62807dAE812a0F1571243460Bf94325F43BB7";

const OrderBook = "0xa19fD5aB6C8DCffa2A295F78a5Bb4aC543AAF5e3";
const LiquidityPool = "0x3e0199792ce69dc29a0a36146bfa68bd7c8d6633";

const ETH = ethers.ZeroAddress;
const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const USDT = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
const USDCe = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";

const collateralList = [
  {
    name: "WETH",
    address: WETH,
    amount: ethers.parseEther("1"),
  },
  {
    name: "WBTC",
    address: WBTC,
    amount: ethers.parseUnits("0.1", 8),
  },
  {
    name: "USDC",
    address: USDC,
    amount: ethers.parseUnits("1000", 6),
  },
  {
    name: "USDCe",
    address: USDCe,
    amount: ethers.parseUnits("1000", 6),
  },
  {
    name: "USDT",
    address: USDT,
    amount: ethers.parseUnits("1000", 6),
  },
];

const indexList = [
  {
    name: "WETH",
    address: WETH,
    size: ethers.parseEther("10"),
    gmxLongPrice: ethers.parseUnits("2200", 30),
    gmxShortPrice: ethers.parseUnits("1800", 30),
    muxLongPrice: ethers.parseUnits("2200", 8),
    muxShortPrice: ethers.parseUnits("1800", 8),
  },
  {
    name: "WBTC",
    address: WBTC,
    size: ethers.parseUnits("1", 8),
    gmxLongPrice: ethers.parseUnits("44000", 30),
    gmxShortPrice: ethers.parseUnits("36000", 30),
    muxLongPrice: ethers.parseUnits("44000", 8),
    muxShortPrice: ethers.parseUnits("36000", 8),
  },
];

let deployer;
let owner;
let other;
let orderKeeper;
let relayer;
let feeCollector;
let ownerPk;
// va
let vaPk;
let va;
// gmx accounts
let impersonatedAdmin;
let impersonatedGov;
let impersonatedPositionKeeper;
let impersonatedUpdater;
// mux accounts
let impersonatedBroker;
let impersonatedOwner;
// tokens
let weth;
let wbtc;
let usdc;
let usdce;
let usdt;
// mux contracts
let orderBook;
let liquidityPool;
// gmx contracts
let vault;
let positionRouter;
let fastPriceFeed;
let vaultPriceFeed;
let secondaryPriceFeedMock;
// dvx contracts
let accountFactory;
let exchange;
let warehouse;
let gmxV1Adapter;
let muxAdapter;
let quoter;
let reader;
let logger;
let swapper;
let marginManager;
let attendanceBook;

let account;

const deploy = async (noAccount) => {
  vaPk = ethers.Wallet.createRandom().privateKey;
  va = new ethers.Wallet(vaPk);

  [deployer, owner, other, orderKeeper, relayer, feeCollector] =
    await ethers.getSigners();
  ownerPk =
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"; // todo: fix

  // gmx accounts
  impersonatedAdmin = await ethers.getImpersonatedSigner(
    "0xb4d2603b2494103c90b2c607261dd85484b49ef0"
  );
  impersonatedGov = await ethers.getImpersonatedSigner(
    "0xb4d2603b2494103c90b2c607261dd85484b49ef0"
  );
  impersonatedPositionKeeper = await ethers.getImpersonatedSigner(
    "0xDd763ED8Ce604E9a61F1e1aed433c1362e05700d"
  );
  impersonatedUpdater = await ethers.getImpersonatedSigner(
    "0x8cf560ecc641248dcec1d7a60403b7dd8ad37d07"
  );
  // mux accounts
  impersonatedBroker = await ethers.getImpersonatedSigner(
    "0x988aa44e12c7bce07e449a4156b4a269d6642b3a"
  );
  impersonatedOwner = await ethers.getImpersonatedSigner(
    "0x988aa44e12c7bce07e449a4156b4a269d6642b3a"
  );
  // tokens
  weth = await ethers.getContractAt("IERC20", WETH);
  wbtc = await ethers.getContractAt("IERC20", WBTC);
  usdc = await ethers.getContractAt("IERC20", USDC);
  usdce = await ethers.getContractAt("IERC20", USDCe);
  usdt = await ethers.getContractAt("IERC20", USDT);
  // gmx
  vault = await ethers.getContractAt("IVault", Vault);
  positionRouter = await ethers.getContractAt(
    "IPositionRouter",
    PositionRouter
  );
  await positionRouter
    .connect(impersonatedAdmin)
    .setPositionKeeper(impersonatedPositionKeeper.address, true); // execution reverted: 403
  fastPriceFeed = await ethers.getContractAt("IFastPriceFeed", FastPriceFeed);
  vaultPriceFeed = await ethers.getContractAt(
    "IVaultPriceFeed",
    VaultPriceFeed
  );
  secondaryPriceFeedMock = await ethers.deployContract("SecondPriceFeedMock");

  orderBook = await ethers.getContractAt("IOrderBook", OrderBook);
  liquidityPool = await ethers.getContractAt("ILiquidityPool", LiquidityPool);

  // deploy
  const exchangeImpl = await ethers.deployContract("Exchange", []);
  const exchangeProxy = await ethers.deployContract("ERC1967Proxy", [
    exchangeImpl.target,
    "0x",
  ]);
  exchange = await ethers.getContractAt("Exchange", exchangeProxy.target);
  await exchange.initialize();

  const warehouseImpl = await ethers.deployContract("Warehouse", []);
  const warehouseProxy = await ethers.deployContract("ERC1967Proxy", [
    warehouseImpl.target,
    "0x",
  ]);
  warehouse = await ethers.getContractAt("Warehouse", warehouseProxy.target);
  await warehouse.initialize(exchange.target);

  const accountTargetContract = await ethers.deployContract("Account", []);

  const accountFactoryImpl = await ethers.deployContract("AccountFactory", []);
  const accountFactoryProxy = await ethers.deployContract("ERC1967Proxy", [
    accountFactoryImpl.target,
    "0x",
  ]);
  accountFactory = await ethers.getContractAt(
    "AccountFactory",
    accountFactoryProxy.target
  );
  await accountFactory.initialize(exchange.target);

  logger = await ethers.deployContract("Logger", []);

  gmxV1Adapter = await ethers.deployContract("GmxV1Adapter", [
    PositionRouter,
    Router,
    Vault,
    Timelock,
    exchange.target,
  ]);
  muxAdapter = await ethers.deployContract("MuxAdapter", [
    OrderBook,
    LiquidityPool,
    exchange.target,
  ]);
  quoter = await ethers.deployContract("Quoter");
  reader = await ethers.deployContract("Reader");
  swapper = await ethers.deployContract("Swapper");
  marginManager = await ethers.deployContract("MarginManager");

  await exchange.addAccountImplementation(1, accountTargetContract.target);
  await exchange.setAccountFactory(accountFactory.target);
  await exchange.setWarehouse(warehouse.target);
  await exchange.setLogger(logger.target);
  await exchange.setSwapper(swapper.target);
  await exchange.setFeeCollector(feeCollector.address);
  await exchange.setMarginManager(marginManager.target);
  await exchange.registerAdapter(gmxV1Adapter.target);
  await exchange.registerAdapter(muxAdapter.target);
  await exchange.setStableToken(USDC, true);
  await exchange.setStableToken(USDT, true);
  await exchange.setStableToken(USDCe, true);
  await exchange.setDefaultStableToken(USDCe);
  await exchange.addCollateralTokens([WETH, WBTC, USDC, USDCe, USDT]);
  await exchange.addIndexTokens([WETH, WBTC]);

  await exchange.setOrderKeeper(orderKeeper.address, true);
  await exchange.setRelayer(relayer.address, true);

  // attendanceBook
  const startTime = Math.ceil(Date.now() / 1000) + 86400 * 3;
  attendanceBook = await ethers.deployContract("AttendanceBook", [
    startTime,
    relayer,
  ]);
  await exchange.setRelayer(attendanceBook.target, true);

  if (!noAccount) {
    await exchange.connect(owner).createAccount(va.address, ethers.MaxUint256);
    account = await ethers.getContractAt(
      "Account",
      await exchange.getAccount(owner.address)
    );
  }

  const checkBalance = async (account) => {
    console.log(`
non-stable:
- ETH   : ${await ethers.provider.getBalance(account.target)}
- WETH  : ${await account.getBalance(WETH)}
- WBTC  : ${await account.getBalance(WBTC)}

stable:
- USDC.e: ${await account.getBalance(USDCe)}
- USDT  : ${await account.getBalance(USDT)}
- DAI   : ${await account.getBalance(
      "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
    )}
- USDC  : ${await account.getBalance(USDC)}
`);
  };

  const checkPosition = async (adapter, account, collateral, index, isLong) => {
    if (adapter.target == gmxV1Adapter.target && isLong) {
      collateral = index;
    }

    const position = await adapter.getPosition(
      account.target,
      collateral,
      index,
      isLong
    );
    console.log(position);
  };

  const checkWrapPosition = async (
    adapter,
    account,
    collateral,
    index,
    isLong
  ) => {
    const wrapPosition = await adapter.getWrapPosition(
      account.target,
      collateral,
      index,
      isLong
    );
    console.log(wrapPosition);
  };

  const faucet = async (token, tokenAmount) => {
    const abiCoder = new ethers.AbiCoder();
    if (token == WETH) {
      const weth = await ethers.getContractAt("IERC20", WETH);
      await weth.connect(owner).deposit({ value: tokenAmount });
    } else if (token == USDC) {
      const storageSlot = 9n;
      const encoded = abiCoder.encode(
        ["address", "uint256"],
        [owner.address, storageSlot]
      );
      const balanceStorageSlot = ethers.keccak256(encoded);
      await ethers.provider.send("hardhat_setStorageAt", [
        token,
        balanceStorageSlot,
        abiCoder.encode(["uint256"], [tokenAmount]),
      ]);
    } else if (token == WBTC || token == USDCe || token == USDT) {
      const storageSlot = 51n;
      const encoded = abiCoder.encode(
        ["address", "uint256"],
        [owner.address, storageSlot]
      );
      const balanceStorageSlot = ethers.keccak256(encoded);
      await ethers.provider.send("hardhat_setStorageAt", [
        token,
        balanceStorageSlot,
        abiCoder.encode(["uint256"], [tokenAmount]),
      ]);
    }
  };

  const deposit = async (token, tokenAmount) => {
    await faucet(token, tokenAmount);
    const erc20 = await ethers.getContractAt("IERC20", token);
    await erc20.connect(owner).approve(account.target, tokenAmount);
    await account.connect(owner).deposit(token, tokenAmount, 0, 0, "0x");
  };

  const increasePosition = async (
    adapter,
    collateral,
    index,
    collateralAmount,
    size,
    acceptablePrice,
    isLong
  ) => {
    const adapterFee = await adapter.getMinExecutionFee();
    if (!acceptablePrice) {
      acceptablePrice = await adapter.getWrapPrice(index, isLong);
    }
    await account
      .connect(owner)
      .increasePosition(
        adapter.target,
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        acceptablePrice,
        0,
        0,
        "0x",
        { value: adapterFee }
      );

    if (adapter.target == gmxV1Adapter.target) {
      await executeIncreasePosition(account.target);
    } else if (adapter.target == muxAdapter.target) {
      await fillPositionOrder();
    }
  };

  const decreasePosition = async (
    adapter,
    collateral,
    index,
    isLong,
    size,
    networkFee
  ) => {
    const adapterFee = await adapter.getMinExecutionFee();
    await account.connect(owner).decreasePosition(
      adapter.target,
      collateral,
      index,
      isLong,
      size,
      0, // acceptablePrice
      networkFee,
      0, // deadline
      "0x",
      { value: adapterFee }
    );

    if (adapter.target == gmxV1Adapter.target) {
      await executeDecreasePosition(account.target);
    } else if (adapter.target == muxAdapter.target) {
      await fillPositionOrder();
    }
  };

  const subAcmmMargin = async (
    adapter,
    collateral,
    index,
    isLong,
    marginAmount,
    networkFee
  ) => {
    const adapterFee = await adapter.getMinExecutionFee();
    await account
      .connect(orderKeeper)
      .subAcmmMargin(adapter.target, collateral, index, isLong, marginAmount, {
        value: adapterFee,
      });

    if (adapter.target == gmxV1Adapter.target) {
      await executeDecreasePosition(account.target);
    } else if (adapter.target == muxAdapter.target) {
      await fillPositionOrder();
    }
  };

  const decreaseCollateral = async (
    adapter,
    collateral,
    index,
    isLong,
    collateralAmount,
    networkFee
  ) => {
    const adapterFee = await adapter.getMinExecutionFee();
    await account
      .connect(owner)
      .decreaseCollateral(
        adapter.target,
        collateral,
        index,
        isLong,
        collateralAmount,
        networkFee,
        { value: adapterFee }
      );

    if (adapter.target == gmxV1Adapter.target) {
      await executeDecreasePosition(account.target);
    } else if (adapter.target == muxAdapter.target) {
      await fillWithdrawalOrder();
    }
  };

  const createLimitOrder = async (
    collateral,
    index,
    collateralAmount,
    size,
    isLong,
    triggerPrice,
    acceptablePrice,
    networkFee
  ) => {
    await account
      .connect(owner)
      .createLimitOrder(
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        triggerPrice,
        acceptablePrice,
        0,
        0,
        0,
        "0x"
      );
  };

  const executeLimitOrder = async (orderId, adapter, networkFee) => {
    const adapterExecutionFee = await adapter.getMinExecutionFee();

    await account
      .connect(orderKeeper)
      .executeLimitOrder(orderId, adapter.target, networkFee, {
        value: adapterExecutionFee,
      });

    if (adapter.target == gmxV1Adapter.target) {
      await executeIncreasePosition(account.target);
    } else if (adapter.target == muxAdapter.target) {
      await fillPositionOrder();
    }
  };

  const createTriggerOrder = async (
    adapter,
    collateral,
    index,
    isLong,
    size,
    triggerOrderType,
    triggerPrice,
    acceptablePrice
  ) => {
    await account
      .connect(owner)
      .createTriggerOrder(
        adapter.target,
        collateral,
        index,
        isLong,
        size,
        triggerOrderType,
        triggerPrice,
        acceptablePrice,
        0
      );
  };

  const executeTriggerOrder = async (positionKey, orderId) => {
    const triggerOrder = await warehouse.getTriggerOrder(positionKey, orderId);

    const adapter = await ethers.getContractAt(
      "IAdapter",
      triggerOrder.adapter
    );
    const adapterExecutionFee = await adapter.getMinExecutionFee();

    await account
      .connect(orderKeeper)
      .executeTriggerOrder(positionKey, orderId, {
        value: adapterExecutionFee,
      });

    if (adapter.target == gmxV1Adapter.target) {
      await executeDecreasePosition(account.target);
    } else if (adapter.target == muxAdapter.target) {
      await fillPositionOrder();
    }
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
      .executeIncreasePosition(requestKey, owner.address);
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
      .executeDecreasePosition(requestKey, owner.address);
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

  const getIdFromTokenAddress = async (tokenAddress) => {
    const allAssets = await liquidityPool.getAllAssetInfo();
    const asset = allAssets.find(
      (asset) => asset.tokenAddress === tokenAddress
    );
    return asset.id;
  };

  const replaceFastPriceFeedAndSetPrice = async (
    tokenAddress,
    tokenMinPrice,
    tokenMaxPrice
  ) => {
    await ethers.provider.send("hardhat_setStorageAt", [
      vaultPriceFeed.target,
      "0x0",
      "0x" + "00".repeat(12) + impersonatedGov.address.slice(2),
    ]);
    await vaultPriceFeed.connect(impersonatedGov).setSecondaryPriceFeed(secondaryPriceFeedMock.target); // prettier-ignore

    await secondaryPriceFeedMock.setMinPrice(tokenAddress, tokenMinPrice);
    await secondaryPriceFeedMock.setMaxPrice(tokenAddress, tokenMaxPrice);
  };

  const replaceOracleReferenceAndSetPrice = async (
    tokenAddress,
    tokenPrice
  ) => {
    await ethers.provider.send("hardhat_setStorageAt", [
      liquidityPool.target,
      "0x33",
      "0x" + "00".repeat(12) + impersonatedOwner.address.slice(2),
    ]);

    const referenceOracleType = {
      None: 0,
      Chainlink: 1,
    };
    const tokenId = await getIdFromTokenAddress(tokenAddress);
    const referenceOracle = await ethers.deployContract("ReferenceOracleMock", [tokenPrice]); // prettier-ignore
    const referenceDeviation = 0;

    await liquidityPool
      .connect(impersonatedOwner)
      .setReferenceOracle(
        tokenId,
        referenceOracleType.Chainlink,
        referenceOracle.target,
        referenceDeviation
      );
  };

  const setPrice = async (
    adapter,
    tokenAddress,
    tokenMinPrice,
    tokenMaxPrice,
    initialized
  ) => {
    if (adapter.target == gmxV1Adapter.target) {
      if (!initialized) {
        await replaceFastPriceFeedAndSetPrice(
          tokenAddress,
          tokenMinPrice,
          tokenMaxPrice
        );
      } else {
        await secondaryPriceFeedMock.setMinPrice(tokenAddress, tokenMinPrice);
        await secondaryPriceFeedMock.setMaxPrice(tokenAddress, tokenMaxPrice);
      }
    } else if (adapter.target == muxAdapter.target) {
      const price = tokenMaxPrice;
      await replaceOracleReferenceAndSetPrice(tokenAddress, price);
    }
  };

  const setDummyPrice = async () => {
    var ethPrice = ethers.parseUnits("2000", 30);
    var btcPrice = ethers.parseUnits("40000", 30);
    var usd = ethers.parseUnits("1", 30);
    await setPrice(gmxV1Adapter, WETH, ethPrice, ethPrice, false);
    await setPrice(gmxV1Adapter, WBTC, btcPrice, btcPrice, true);
    await setPrice(gmxV1Adapter, USDT, usd, usd, true);
    await setPrice(gmxV1Adapter, USDC, usd, usd, true);
    await setPrice(gmxV1Adapter, USDCe, usd, usd, true);

    var ethPrice = ethers.parseUnits("2000", 8);
    var btcPrice = ethers.parseUnits("40000", 8);
    var usd = ethers.parseUnits("1", 8);
    await setPrice(muxAdapter, WETH, ethPrice, ethPrice, false);
    await setPrice(muxAdapter, WBTC, btcPrice, btcPrice, true);
    await setPrice(muxAdapter, USDT, usd, usd, true);
    await setPrice(muxAdapter, USDC, usd, usd, true);
    await setPrice(muxAdapter, USDCe, usd, usd, true);
  };

  const increaseTime = async (seconds) => {
    await hre.network.provider.request({
      method: "evm_increaseTime",
      params: [seconds],
    });
  };

  // gmx
  const updateCumulativeFundingRate = async (collateral) => {
    const seconds = 60 * 60 * 8; // 8 hours
    await increaseTime(seconds);

    // const beforeFundingRate = await vault.cumulativeFundingRates(collateral);
    await vault.updateCumulativeFundingRate(collateral);
    // const afterFundingRate = await vault.cumulativeFundingRates(collateral);
    // console.log(`\nfundingRate is updated: ${beforeFundingRate} -> ${afterFundingRate}\n`) // prettier-ignore
  };

  // mux
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
    owner,
    other,
    relayer,
    orderKeeper,
    ownerPk,
    vaPk,
    va,
    impersonatedBroker,
    impersonatedOwner,
    weth,
    wbtc,
    usdc,
    usdce,
    usdt,
    orderBook,
    liquidityPool,
    exchange,
    warehouse,
    gmxV1Adapter,
    muxAdapter,
    quoter,
    reader,
    feeCollector,
    logger,
    accountFactory,
    attendanceBook,
    account,
    ETH,
    WETH,
    WBTC,
    USDC,
    USDCe,
    USDT,
    collateralList,
    indexList,
    vault,
    checkBalance,
    checkPosition,
    checkWrapPosition,
    faucet,
    deposit,
    executeIncreasePosition,
    executeDecreasePosition,
    fillPositionOrder,
    fillWithdrawalOrder,
    setPrice,
    setDummyPrice,
    increasePosition,
    decreasePosition,
    decreaseCollateral,
    createLimitOrder,
    executeLimitOrder,
    createTriggerOrder,
    executeTriggerOrder,
    subAcmmMargin,
    updateCumulativeFundingRate,
    updateFundingState,
  };
};

module.exports = {
  deploy,
};
