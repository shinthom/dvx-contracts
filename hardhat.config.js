require("@nomicfoundation/hardhat-toolbox");

task("mine", "Mine a block").setAction(async (_args, hre) => {
  await hre.network.provider.request({
    method: "evm_mine",
  });
});

task("unset-automine", "Unset automine").setAction(async (_args, hre) => {
  await hre.network.provider.request({
    method: "evm_setAutomine",
    params: [false],
  });
});

// hardhat execute-order:increase --account 0x6053cA02DCd3D71B0987b4DC2a39b3dDA04647C7 --network local
task("execute-order:increase", "Execute GMX V1 increase order")
  .addParam("account", "Account address")
  .setAction(async ({ account }, { ethers }) => {
    const [user0] = await ethers.getSigners();
    const PositionRouter = "0xb87a436b93ffe9d75c5cfa7bacfff96430b09868";
    const positionRouter = await ethers.getContractAt(
      "IPositionRouter",
      PositionRouter
    );

    const increasePositionsIndex = await positionRouter.increasePositionsIndex(
      account
    );
    const requestKey = await positionRouter.getRequestKey(
      account,
      increasePositionsIndex
    );

    const impersonatedPositionKeeper = await ethers.getImpersonatedSigner(
      "0xDd763ED8Ce604E9a61F1e1aed433c1362e05700d"
    );
    await positionRouter
      .connect(impersonatedPositionKeeper)
      .executeIncreasePosition(requestKey, user0.address);
  });

// hardhat execute-order:decrease --account 0x988aa44e12c7bce07e449a4156b4a269d6642b3a --network local
task("execute-order:decrease", "Execute GMX V1 decrease order")
  .addParam("account", "Account address")
  .setAction(async ({ account }, { ethers }) => {
    const [user0] = await ethers.getSigners();
    const PositionRouter = "0xb87a436b93ffe9d75c5cfa7bacfff96430b09868";
    const positionRouter = await ethers.getContractAt(
      "IPositionRouter",
      PositionRouter
    );

    const decreasePositionsIndex = await positionRouter.decreasePositionsIndex(
      account
    );
    const requestKey = await positionRouter.getRequestKey(
      account,
      decreasePositionsIndex
    );

    const impersonatedPositionKeeper = await ethers.getImpersonatedSigner(
      "0xDd763ED8Ce604E9a61F1e1aed433c1362e05700d"
    );
    await positionRouter
      .connect(impersonatedPositionKeeper)
      .executeDecreasePosition(requestKey, user0.address);
  });

// hardhat fill-order:increase --network local
task("fill-order:increase", "Execute MUX order").setAction(
  async (_, { ethers }) => {
    const OrderBook = "0xa19fD5aB6C8DCffa2A295F78a5Bb4aC543AAF5e3";
    const orderBook = await ethers.getContractAt("IOrderBook", OrderBook);
    const orderId = (await orderBook.nextOrderId()) - 1n;

    const impersonatedBroker = await ethers.getImpersonatedSigner(
      "0x988aa44e12c7bce07e449a4156b4a269d6642b3a" // mux broker
    );
    await orderBook.connect(impersonatedBroker).fillPositionOrder(
      orderId,
      1, // collateralPrice
      1, // assetPrice
      1 // profitAssetPrice
    );
  }
);

// hardhat fill-order:decrease --network local
task("fill-order:decrease", "Execute MUX order").setAction(
  async (_, { ethers }) => {
    const OrderBook = "0xa19fD5aB6C8DCffa2A295F78a5Bb4aC543AAF5e3";
    const orderBook = await ethers.getContractAt("IOrderBook", OrderBook);
    const orderId = (await orderBook.nextOrderId()) - 1n;

    const impersonatedBroker = await ethers.getImpersonatedSigner(
      "0x988aa44e12c7bce07e449a4156b4a269d6642b3a" // mux broker
    );
    await orderBook.connect(impersonatedBroker).fillWithdrawalOrder(
      orderId,
      1, // collateralPrice
      1, // assetPrice
      1 // profitAssetPrice
    );
  }
);

// hardhat position-index:increase --account 0x6053cA02DCd3D71B0987b4DC2a39b3dDA04647C7 --network local
task("position-index:increase", "Get increase position index")
  .addParam("account", "Account address")
  .setAction(async ({ account }, { ethers }) => {
    const PositionRouter = "0xb87a436b93ffe9d75c5cfa7bacfff96430b09868";
    const positionRouter = await ethers.getContractAt(
      "IPositionRouter",
      PositionRouter
    );

    console.log(await positionRouter.increasePositionsIndex(account));
  });

// hardhat position-index:decrease --account 0x988aa44e12c7bce07e449a4156b4a269d6642b3a --network local
task("position-index:decrease", "Get decrease position index")
  .addParam("account", "Account address")
  .setAction(async ({ account }, { ethers }) => {
    const PositionRouter = "0xb87a436b93ffe9d75c5cfa7bacfff96430b09868";
    const positionRouter = await ethers.getContractAt(
      "IPositionRouter",
      PositionRouter
    );

    console.log(await positionRouter.decreasePositionsIndex(account));
  });

// hardhat order-id --network local
task("order-id", "Get next order id").setAction(async (_, { ethers }) => {
  const OrderBook = "0xa19fD5aB6C8DCffa2A295F78a5Bb4aC543AAF5e3";
  const orderBook = await ethers.getContractAt("IOrderBook", OrderBook);
  console.log((await orderBook.nextOrderId()) - 1n);
});

module.exports = {
  solidity: {
    version: "0.8.2",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    local: {
      url: "http://127.0.0.1:8545/",
      loggingEnabled: true,
      timeout: 100_000,
    },
  },
};
