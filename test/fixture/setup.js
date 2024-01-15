const { ethers } = require("hardhat");

// gmx contracts
const PositionRouter = "0xb87a436b93ffe9d75c5cfa7bacfff96430b09868";
const Router = "0xabbc5f99639c9b6bcb58544ddf04efa6802f4064";
const Vault = "0x489ee077994b6658eafa855c308275ead8097c4a";
const VaultPriceFeed = "0x2d68011bcA022ed0E474264145F46CC4de96a002";
const FastPriceFeed = "0x11D62807dAE812a0F1571243460Bf94325F43BB7";

// mux contracts
const Admin = "0x065ecf2Aed4FDfa88Dd3Fb64208c9A4f275c50E9";
const OrderBook = "0xa19fD5aB6C8DCffa2A295F78a5Bb4aC543AAF5e3";
const LiquidityPool = "0x3e0199792ce69dc29a0a36146bfa68bd7c8d6633";

// token contracts
const ETH = ethers.ZeroAddress;
const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";
// stable tokens
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const USDT = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
const USDCe = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";

let deployer;
let user;
let other;
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
// gmx contracts
let vault;
let positionRouter;
let fastPriceFeed;
let vaultPriceFeed;
let secondaryPriceFeedMock;
// mux contracts
let orderBook;
let liquidityPool;
// dvx
let gmxV1;
let mux;
let exchange;
let warehouse;
let quoter;
let reader;
let account;

const deploy = async (noAccount) => {
  [deployer, user, other] = await ethers.getSigners();
  // gmx
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
  // mux
  impersonatedBroker = await ethers.getImpersonatedSigner(
    "0x988aa44e12c7bce07e449a4156b4a269d6642b3a"
  );
  impersonatedOwner = await ethers.getImpersonatedSigner(
    "0x988aa44e12c7bce07e449a4156b4a269d6642b3a"
  );

  vault = await ethers.getContractAt("IVault", Vault);
  positionRouter = await ethers.getContractAt(
    "IPositionRouter",
    PositionRouter
  );
  fastPriceFeed = await ethers.getContractAt("IFastPriceFeed", FastPriceFeed);
  vaultPriceFeed = await ethers.getContractAt(
    "IVaultPriceFeed",
    VaultPriceFeed
  );

  await positionRouter
    .connect(impersonatedAdmin)
    .setPositionKeeper(impersonatedPositionKeeper.address, true); // execution reverted: 403
  await positionRouter.connect(impersonatedAdmin).setDelayValues(0, 0, 100); // execution reverted: delay
  secondaryPriceFeedMock = await ethers.deployContract("SecondPriceFeedMock"); // prettier-ignore
  orderBook = await ethers.getContractAt("IOrderBook", OrderBook); // mux order book
  liquidityPool = await ethers.getContractAt("ILiquidityPool", LiquidityPool); // mux liquidity pool

  weth = await ethers.getContractAt("IERC20", WETH);
  wbtc = await ethers.getContractAt("IERC20", WBTC);
  usdc = await ethers.getContractAt("IERC20", USDC);
  usdce = await ethers.getContractAt("IERC20", USDCe);
  usdt = await ethers.getContractAt("IERC20", USDT);

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
  await exchange.initialize(warehouse.target, [USDC, USDT, USDCe]);
  gmxV1 = await ethers.deployContract("GMXV1", [
    PositionRouter,
    Router,
    Vault,
    exchange.target,
  ]);
  mux = await ethers.deployContract("MUX", [OrderBook, LiquidityPool]);

  reader = await ethers.deployContract("Reader", [warehouse.target]);
  quoter = await ethers.deployContract("Quoter");

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
non-stable:
-  ETH  : ${await account.getBalance(ETH)}
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

  const printPosition = async (adapter, collateral, index, isLong) => {
    const position = await account.getPosition(
      adapter,
      collateral,
      index,
      isLong
    );
    console.log(`position:
- collateralAmount : ${position.collateralAmount}
- size             : ${position.size}
- lastIncreasedTime: ${position.lastIncreasedTime}
- price            : ${position.price}
- fundingRate      : ${position.fundingRate}
- isLong           : ${position.isLong}

`);
  };

  const printWrapPosition = async (adapter, collateral, index, isLong) => {
    const position = await account.getWrapPosition(
      adapter,
      collateral,
      index,
      isLong
    );
    console.log(`position:
- collateralAmount : ${position.collateralAmount}
- size             : ${position.size}
- lastIncreasedTime: ${position.lastIncreasedTime}
- price            : ${position.price}
- fundingRate      : ${position.fundingRate}
- isLong           : ${position.isLong}

`);
  };

  const faucet = async (token, tokenAmount) => {
    const abiCoder = new ethers.AbiCoder();

    if (token == USDC) {
      const storageSlot = 9n;
      const encoded = abiCoder.encode(
        ["address", "uint256"],
        [user.address, storageSlot]
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
        [user.address, storageSlot]
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
    if (token == ETH || token == WETH) {
      await account.connect(user).deposit(ETH, tokenAmount, {
        value: tokenAmount,
      });
    } else {
      await faucet(token, tokenAmount);
      const erc20 = await ethers.getContractAt("IERC20", token);
      await erc20.connect(user).approve(account.target, tokenAmount);
      await account.connect(user).deposit(token, tokenAmount);
    }
  };

  const increasePosition = async (
    adapter,
    collateral,
    index,
    collateralAmount,
    size,
    isLong,
    executionFee
  ) => {
    const positionOrder = await adapter.makePositionOrder(
      collateral,
      index,
      collateralAmount,
      size,
      isLong
    );
    await account.connect(user).createMarketOrders(
      [adapter.target],
      [
        {
          orderType: positionOrder.orderType,
          path: [...positionOrder.path],
          index: positionOrder.index,
          collateralAmount: positionOrder.collateralAmount,
          size: positionOrder.size,
          isLong: positionOrder.isLong,
        },
      ],
      { value: executionFee }
    );

    if (adapter.target == gmxV1.target) {
      await executeIncreasePosition(account.target);
    } else if (adapter.target == mux.target) {
      await fillPositionOrder();
    }
  };

  const increaseCollateral = async (
    adapter,
    collateral,
    index,
    collateralAmount,
    isLong,
    executionFee
  ) => {
    await account.connect(user).createMarketOrders(
      [adapter.target],
      [
        {
          orderType: orderType.increaseCollateral,
          path: [collateral],
          index: index,
          collateralAmount: collateralAmount,
          size: 0,
          isLong: isLong,
        },
      ],
      { value: executionFee }
    );
    if (adapter.target == gmxV1.target) {
      await executeIncreasePosition(account.target);
    }
  };

  const decreaseCollateral = async (
    adapter,
    collateral,
    index,
    collateralAmount,
    isLong,
    executionFee
  ) => {
    await account.connect(user).createMarketOrders(
      [adapter.target],
      [
        {
          orderType: orderType.decreaseCollateral,
          path: [collateral],
          index: index,
          collateralAmount: collateralAmount,
          size: 0,
          isLong: isLong,
        },
      ],
      { value: executionFee }
    );
    if (adapter.target == gmxV1.target) {
      await executeDecreasePosition(account.target);
    } else if (adapter.target == mux.target) {
      await fillWithdrawalOrder();
    }
  };

  const decreasePosition = async (
    adapter,
    collateral,
    index,
    size,
    isLong,
    executionFee
  ) => {
    console.log(size, executionFee);
    await account.connect(user).createMarketOrders(
      [adapter.target],
      [
        {
          orderType: orderType.decreasePosition,
          path: [collateral],
          index: index,
          collateralAmount: 0n,
          size: size,
          isLong: isLong,
        },
      ],
      { value: executionFee }
    );
    if (adapter.target == gmxV1.target) {
      await executeDecreasePosition(account.target);
    } else if (adapter.target == mux.target) {
      await fillPositionOrder();
    }
  };

  const replaceFastPriceFeedAndSetPrice = async (
    tokenAddress,
    tokenMinPrice,
    tokenMaxPrice
  ) => {
    const oldGov = "0x" + (await ethers.provider.getStorage(vaultPriceFeed.target, "0x0")).slice(26); // prettier-ignore
    await ethers.provider.send("hardhat_setStorageAt", [
      vaultPriceFeed.target,
      "0x0",
      "0x" + "00".repeat(12) + impersonatedGov.address.slice(2),
    ]);
    const newGov = "0x" + (await ethers.provider.getStorage(vaultPriceFeed.target, "0x0")).slice(26); // prettier-ignore
    // console.log(`owner: ${oldGov} -> ${newGov}`);

    await vaultPriceFeed.connect(impersonatedGov).setSecondaryPriceFeed(secondaryPriceFeedMock.target); // prettier-ignore
    await secondaryPriceFeedMock.setMinPrice(tokenAddress, tokenMinPrice);
    await secondaryPriceFeedMock.setMaxPrice(tokenAddress, tokenMaxPrice);
  };

  const replaceOracleReferenceAndSetPrice = async (
    tokenAddress,
    tokenPrice
  ) => {
    const oldOwner = "0x" + (await ethers.provider.getStorage(liquidityPool.target, "0x33")).slice(26); // prettier-ignore
    await ethers.provider.send("hardhat_setStorageAt", [
      liquidityPool.target,
      "0x33",
      "0x" + "00".repeat(12) + impersonatedOwner.address.slice(2),
    ]);
    const newOwner = "0x" + (await ethers.provider.getStorage(liquidityPool.target, "0x33")).slice(26); // prettier-ignore
    // console.log(`owner: ${oldOwner} -> ${newOwner}`);

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
    if (adapter.target == gmxV1.target) {
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
    } else if (adapter.target == mux.target) {
      const price = tokenMaxPrice;
      await replaceOracleReferenceAndSetPrice(tokenAddress, price);
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

  const getAssetFromTokenAddress = async (tokenAddress) => {
    const allAssets = await liquidityPool.getAllAssetInfo();
    const asset = allAssets.find(
      (asset) => asset.tokenAddress === tokenAddress
    );
    return asset;
  };

  const getIdFromTokenAddress = async (tokenAddress) => {
    const allAssets = await liquidityPool.getAllAssetInfo();
    const asset = allAssets.find(
      (asset) => asset.tokenAddress === tokenAddress
    );
    return asset.id;
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
    impersonatedUpdater,
    impersonatedOwner,
    vault,
    positionRouter,
    fastPriceFeed,
    vaultPriceFeed,
    minExecutionFee,
    orderType,
    orderBook,
    liquidityPool,
    weth,
    wbtc,
    usdc,
    usdce,
    usdt,
    gmxV1,
    mux,
    exchange,
    warehouse,
    quoter,
    reader,
    account,
    ETH,
    WETH,
    WBTC,
    USDC,
    USDCe,
    USDT,
    getAssetFromTokenAddress,
    getIdFromTokenAddress,
    checkBalance,
    printPosition,
    printWrapPosition,
    faucet,
    deposit,
    increasePosition,
    increaseCollateral,
    decreaseCollateral,
    decreasePosition,
    executeIncreasePosition,
    executeDecreasePosition,
    fillPositionOrder,
    fillWithdrawalOrder,
    updateCumulativeFundingRate,
    updateFundingState,
    replaceOracleReferenceAndSetPrice,
    replaceFastPriceFeedAndSetPrice,
    setPrice,
  };
};

module.exports = {
  deploy,
};
