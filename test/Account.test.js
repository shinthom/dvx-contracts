const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const { deploy } = require("./fixture/setup");

// token contracts
const WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
const USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

const orderType = {
  increasePosition: 0,
  decreasePosition: 1,
  increaseCollateral: 2,
  decreaseCollateral: 3,
};

const openAndClosePosition = async (
  collateral,
  index,
  collateralAmount,
  leverage,
  isLong,
  approveAndDeposit
) => {
  let gmxV1Position;
  let muxPosition;

  const {
    gmxV1,
    mux,
    quoter,
    account,
    executeIncreasePosition,
    executeDecreasePosition,
    fillPositionOrder,
    swap,
  } = await loadFixture(deploy);

  if (collateral != WETH) {
    // swap eth to sufficient collateral
    await swap(WETH, collateral, ethers.parseEther("10"));
  }

  await approveAndDeposit(account, collateral);

  const gmxOrder = await quoter.quoteGMX(
    orderType.increasePosition,
    collateral,
    index,
    collateralAmount,
    leverage,
    isLong
  );
  const muxOrder = await quoter.quoteMUX(
    orderType.increasePosition,
    collateral,
    index,
    collateralAmount,
    leverage,
    isLong
  );

  console.log("\n`deposit`");
  console.log(
    `- balance(eth)    : ${await account.getBalance(ethers.ZeroAddress)}`
  );
  console.log(`- balance(usdc)   : ${await account.getBalance(USDC)}`);
  console.log(`- balance(wbtc)   : ${await account.getBalance(WBTC)}`);

  console.log("\n`increase position` - gmxV1, mux");
  await account.createOrders(
    [gmxV1.target, mux.target],
    [
      {
        orderType: gmxOrder.orderType,
        collateral: gmxOrder.collateral,
        index: gmxOrder.index,
        collateralAmount: gmxOrder.collateralAmount,
        size: gmxOrder.size,
        isLong: gmxOrder.isLong,
      },
      {
        orderType: muxOrder.orderType,
        collateral: muxOrder.collateral,
        index: muxOrder.index,
        collateralAmount: muxOrder.collateralAmount,
        size: muxOrder.size,
        isLong: muxOrder.isLong,
      },
    ],
    {
      value: BigInt("180000000000000"),
    }
  );
  await executeIncreasePosition();
  await fillPositionOrder();

  {
    const collateral = isLong ? index : USDC;
    gmxV1Position = await gmxV1.getPosition(
      account.target,
      collateral,
      index,
      isLong
    );
  }

  muxPosition = await mux.getPosition(
    account.target,
    collateral,
    index,
    isLong
  );
  console.log(
    `- balance(eth)    : ${await account.getBalance(ethers.ZeroAddress)}`
  );
  console.log(`- balance(usdc)   : ${await account.getBalance(USDC)}`);
  console.log(`- position(gmx-v1): ${gmxV1Position}`);
  console.log(`- position(mux)   : ${muxPosition}`);

  {
    console.log("\n`decrease position` - gmxV1");
    const collateral = isLong ? index : USDC;
    await account.createOrders(
      [gmxV1.target],
      [
        {
          orderType: orderType.decreasePosition,
          collateral: collateral,
          index: index,
          collateralAmount: 0,
          size: gmxV1Position.size,
          isLong: isLong,
        },
      ],
      {
        value: BigInt("180000000000000"),
      }
    );
    await executeDecreasePosition();

    {
      const collateral = isLong ? index : USDC;
      gmxV1Position = await gmxV1.getPosition(
        account.target,
        collateral,
        index,
        isLong
      );
    }
    console.log(
      `- balance(eth)    : ${await account.getBalance(ethers.ZeroAddress)}`
    );
    console.log(`- balance(usdc)   : ${await account.getBalance(USDC)}`);
    console.log(`- position(gmx-v1): ${gmxV1Position}`);
  }

  console.log("\n`decrease position` - mux");
  await account.createOrders(
    [mux.target],
    [
      {
        orderType: orderType.decreasePosition,
        collateral: collateral,
        index: index,
        collateralAmount: 0,
        size: muxPosition.size,
        isLong: isLong,
      },
    ]
  );
  await fillPositionOrder();
  muxPosition = await mux.getPosition(
    account.target,
    collateral,
    index,
    isLong
  );
  console.log(
    `- balance(eth)    : ${await account.getBalance(ethers.ZeroAddress)}`
  );
  console.log(`- balance(usdc)   : ${await account.getBalance(USDC)}`);
  console.log(`- balance(wbtc)   : ${await account.getBalance(WBTC)}`);
  console.log(`- position(mux)   : ${muxPosition}`);
};

describe("Account", () => {
  it("long: col(ETH) -> idx(ETH)", async () => {
    const collateral = WETH;
    const index = WETH;

    const collateralAmount = ethers.parseEther("1");
    const leverage = 10n;
    const long = true;

    const approveAndDeposit = async (account) => {
      await account.deposit(ethers.ZeroAddress, collateralAmount * 2n, {
        value: collateralAmount * 2n,
      });
    };

    await openAndClosePosition(
      collateral,
      index,
      collateralAmount,
      leverage,
      long,
      approveAndDeposit
    );
  });

  it("long: col(USDC) -> idx(ETH)", async () => {
    const collateral = USDC;
    const index = WETH;

    const collateralAmount = ethers.parseUnits("600", 6);
    const leverage = 10n;
    const long = true;

    const approveAndDeposit = async (account, collateral) => {
      const token = await ethers.getContractAt("IERC20", collateral);
      await token.approve(account.target, collateralAmount * 2n);
      await account.deposit(USDC, collateralAmount * 2n);
    };

    await openAndClosePosition(
      collateral,
      index,
      collateralAmount,
      leverage,
      long,
      approveAndDeposit
    );
  });

  it("long: col(BTC) -> idx(ETH)", async () => {
    const collateral = WBTC;
    const index = WETH;

    const collateralAmount = ethers.parseUnits("0.01", 8);
    const leverage = 10n;
    const long = true;

    const approveAndDeposit = async (account, collateral) => {
      const token = await ethers.getContractAt("IERC20", collateral);
      await token.approve(account.target, collateralAmount * 2n);
      await account.deposit(collateral, collateralAmount * 2n);
    };

    await openAndClosePosition(
      collateral,
      index,
      collateralAmount,
      leverage,
      long,
      approveAndDeposit
    );
  });

  it("long: col(ETH) -> idx(BTC)", async () => {
    const collateral = WETH;
    const index = WBTC;

    const collateralAmount = ethers.parseEther("1");
    const leverage = 10n;
    const long = true;

    const approveAndDeposit = async (account) => {
      await account.deposit(ethers.ZeroAddress, collateralAmount * 2n, {
        value: collateralAmount * 2n,
      });
    };

    await openAndClosePosition(
      collateral,
      index,
      collateralAmount,
      leverage,
      long,
      approveAndDeposit
    );
  });

  it("long: col(USDC) -> idx(BTC)", async () => {
    const collateral = USDC;
    const index = WBTC;

    const collateralAmount = ethers.parseUnits("600", 6);
    const leverage = 10n;
    const long = true;

    const approveAndDeposit = async (account, collateral) => {
      const token = await ethers.getContractAt("IERC20", collateral);
      await token.approve(account.target, collateralAmount * 2n);
      await account.deposit(USDC, collateralAmount * 2n);
    };

    await openAndClosePosition(
      collateral,
      index,
      collateralAmount,
      leverage,
      long,
      approveAndDeposit
    );
  });

  it("long: col(BTC) -> idx(BTC)", async () => {
    const collateral = WBTC;
    const index = WBTC;

    const collateralAmount = ethers.parseUnits("0.01", 8);
    const leverage = 10n;
    const long = true;

    const approveAndDeposit = async (account, collateral) => {
      const token = await ethers.getContractAt("IERC20", collateral);
      await token.approve(account.target, collateralAmount * 2n);
      await account.deposit(collateral, collateralAmount * 2n);
    };

    await openAndClosePosition(
      collateral,
      index,
      collateralAmount,
      leverage,
      long,
      approveAndDeposit
    );
  });

  it("short: col(USDC) -> idx(ETH)", async () => {
    const collateral = USDC;
    const index = WETH;

    const collateralAmount = ethers.parseUnits("600", 6);
    const leverage = 10n;
    const short = false;

    const approveAndDeposit = async (account, collateral) => {
      const token = await ethers.getContractAt("IERC20", collateral);
      await token.approve(account.target, collateralAmount * 2n);
      await account.deposit(USDC, collateralAmount * 2n);
    };

    await openAndClosePosition(
      collateral,
      index,
      collateralAmount,
      leverage,
      short,
      approveAndDeposit
    );
  });

  it("short: col(BTC) -> idx(ETH)", async () => {
    const collateral = WBTC;
    const index = WETH;

    const collateralAmount = ethers.parseUnits("0.01", 8);
    const leverage = 10n;
    const short = true;

    const approveAndDeposit = async (account, collateral) => {
      const token = await ethers.getContractAt("IERC20", collateral);
      await token.approve(account.target, collateralAmount * 2n);
      await account.deposit(collateral, collateralAmount * 2n);
    };

    await openAndClosePosition(
      collateral,
      index,
      collateralAmount,
      leverage,
      short,
      approveAndDeposit
    );
  });

  it("short: col(ETH) -> idx(BTC)", async () => {
    const collateral = WETH;
    const index = WBTC;

    const collateralAmount = ethers.parseEther("1");
    const leverage = 10n;
    const short = false;

    const approveAndDeposit = async (account) => {
      await account.deposit(ethers.ZeroAddress, collateralAmount * 2n, {
        value: collateralAmount * 2n,
      });
    };

    await openAndClosePosition(
      collateral,
      index,
      collateralAmount,
      leverage,
      short,
      approveAndDeposit
    );
  });

  it("short: col(USDC) -> idx(BTC)", async () => {
    const collateral = USDC;
    const index = WBTC;

    const collateralAmount = ethers.parseUnits("600", 6);
    const leverage = 10n;
    const short = false;

    const approveAndDeposit = async (account, collateral) => {
      const token = await ethers.getContractAt("IERC20", collateral);
      await token.approve(account.target, collateralAmount * 2n);
      await account.deposit(USDC, collateralAmount * 2n);
    };

    await openAndClosePosition(
      collateral,
      index,
      collateralAmount,
      leverage,
      short,
      approveAndDeposit
    );
  });

  it("short: col(BTC) -> idx(BTC)", async () => {
    const collateral = WBTC;
    const index = WBTC;

    const collateralAmount = ethers.parseUnits("0.01", 8);
    const leverage = 10n;
    const short = false;

    const approveAndDeposit = async (account, collateral) => {
      const token = await ethers.getContractAt("IERC20", collateral);
      await token.approve(account.target, collateralAmount * 2n);
      await account.deposit(collateral, collateralAmount * 2n);
    };

    await openAndClosePosition(
      collateral,
      index,
      collateralAmount,
      leverage,
      short,
      approveAndDeposit
    );
  });
});
