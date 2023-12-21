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
    reader,
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

  const [gmxOrder, muxOrder] = await quoter.quote(
    collateral,
    index,
    collateralAmount,
    leverage,
    isLong,
    ethers.parseEther("2000")
  );
  console.log(gmxOrder);
  console.log(muxOrder);

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
        orderType: gmxOrder.order.orderType,
        collateral: gmxOrder.order.collateral,
        index: gmxOrder.order.index,
        collateralAmount: gmxOrder.order.collateralAmount,
        size: gmxOrder.order.size,
        isLong: gmxOrder.order.isLong,
      },
      {
        orderType: muxOrder.order.orderType,
        collateral: muxOrder.order.collateral,
        index: muxOrder.order.index,
        collateralAmount: muxOrder.order.collateralAmount,
        size: muxOrder.order.size,
        isLong: muxOrder.order.isLong,
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
    gmxV1Position = await account.getPosition(
      gmxV1.target,
      collateral,
      index,
      isLong
    );
  }
  muxPosition = await account.getPosition(
    mux.target,
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
      gmxV1Position = await account.getPosition(
        gmxV1.target,
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
  muxPosition = await account.getPosition(
    mux.target,
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
  describe("swap", () => {
    it("eth -> wbtc", async () => {
      const { user0, account, wbtc } = await loadFixture(deploy);

      await account.deposit(ethers.ZeroAddress, ethers.parseEther("1"), {
        value: ethers.parseEther("1"),
      });
      const beforeBalance = await account.getBalance(wbtc.target);

      await account
        .connect(user0)
        .swap(ethers.ZeroAddress, WBTC, ethers.parseEther("1"));
      const afterBalance = await account.getBalance(wbtc.target);

      console.log(beforeBalance);
      console.log(afterBalance);
    });

    it("eth -> usdc", async () => {
      const { user0, account, usdc } = await loadFixture(deploy);

      await account.deposit(ethers.ZeroAddress, ethers.parseEther("1"), {
        value: ethers.parseEther("1"),
      });
      const beforeBalance = await account.getBalance(usdc.target);

      await account
        .connect(user0)
        .swap(ethers.ZeroAddress, USDC, ethers.parseEther("1"));
      const afterBalance = await account.getBalance(usdc.target);

      console.log(beforeBalance);
      console.log(afterBalance);
    });

    it("wbtc -> eth", async () => {
      const { user0, account, wbtc, swap } = await loadFixture(deploy);
      await swap(WETH, WBTC, ethers.parseEther("1"));
      const wbtcBalance = await wbtc.balanceOf(user0.address);

      await wbtc.approve(account.target, wbtcBalance);
      await account.deposit(WBTC, wbtcBalance);

      const beforeBalance = await account.getBalance(ethers.ZeroAddress);
      await account.swap(WBTC, WETH, wbtcBalance);
      const afterBalance = await account.getBalance(ethers.ZeroAddress);
      console.log(beforeBalance);
      console.log(afterBalance);
    });

    it("usdc -> eth", async () => {
      const { user0, account, usdc, swap } = await loadFixture(deploy);
      await swap(WETH, USDC, ethers.parseEther("1"));
      const usdcBalance = await usdc.balanceOf(user0.address);

      await usdc.approve(account.target, usdcBalance);
      await account.deposit(USDC, usdcBalance);

      const beforeBalance = await account.getBalance(ethers.ZeroAddress);
      await account.swap(USDC, WETH, usdcBalance);
      const afterBalance = await account.getBalance(ethers.ZeroAddress);
      console.log(beforeBalance);
      console.log(afterBalance);
    });
  });

  // it("long: col(ETH) -> idx(ETH)", async () => {
  //   const collateral = WETH;
  //   const index = WETH;

  //   const collateralAmount = ethers.parseEther("1");
  //   const leverage = 10n;
  //   const long = true;

  //   const approveAndDeposit = async (account) => {
  //     await account.deposit(ethers.ZeroAddress, collateralAmount * 2n, {
  //       value: collateralAmount * 2n,
  //     });
  //   };

  //   await openAndClosePosition(
  //     collateral,
  //     index,
  //     collateralAmount,
  //     leverage,
  //     long,
  //     approveAndDeposit
  //   );
  // });

  // it("long: col(USDC) -> idx(ETH)", async () => {
  //   const collateral = USDC;
  //   const index = WETH;

  //   const collateralAmount = ethers.parseUnits("600", 6);
  //   const leverage = 10n;
  //   const long = true;

  //   const approveAndDeposit = async (account, collateral) => {
  //     const token = await ethers.getContractAt("IERC20", collateral);
  //     await token.approve(account.target, collateralAmount * 2n);
  //     await account.deposit(USDC, collateralAmount * 2n);
  //   };

  //   await openAndClosePosition(
  //     collateral,
  //     index,
  //     collateralAmount,
  //     leverage,
  //     long,
  //     approveAndDeposit
  //   );
  // });

  // it("long: col(BTC) -> idx(ETH)", async () => {
  //   const collateral = WBTC;
  //   const index = WETH;

  //   const collateralAmount = ethers.parseUnits("0.01", 8);
  //   const leverage = 10n;
  //   const long = true;

  //   const approveAndDeposit = async (account, collateral) => {
  //     const token = await ethers.getContractAt("IERC20", collateral);
  //     await token.approve(account.target, collateralAmount * 2n);
  //     await account.deposit(collateral, collateralAmount * 2n);
  //   };

  //   await openAndClosePosition(
  //     collateral,
  //     index,
  //     collateralAmount,
  //     leverage,
  //     long,
  //     approveAndDeposit
  //   );
  // });

  // it("long: col(ETH) -> idx(BTC)", async () => {
  //   const collateral = WETH;
  //   const index = WBTC;

  //   const collateralAmount = ethers.parseEther("1");
  //   const leverage = 10n;
  //   const long = true;

  //   const approveAndDeposit = async (account) => {
  //     await account.deposit(ethers.ZeroAddress, collateralAmount * 2n, {
  //       value: collateralAmount * 2n,
  //     });
  //   };

  //   await openAndClosePosition(
  //     collateral,
  //     index,
  //     collateralAmount,
  //     leverage,
  //     long,
  //     approveAndDeposit
  //   );
  // });

  // it("long: col(USDC) -> idx(BTC)", async () => {
  //   const collateral = USDC;
  //   const index = WBTC;

  //   const collateralAmount = ethers.parseUnits("600", 6);
  //   const leverage = 10n;
  //   const long = true;

  //   const approveAndDeposit = async (account, collateral) => {
  //     const token = await ethers.getContractAt("IERC20", collateral);
  //     await token.approve(account.target, collateralAmount * 2n);
  //     await account.deposit(USDC, collateralAmount * 2n);
  //   };

  //   await openAndClosePosition(
  //     collateral,
  //     index,
  //     collateralAmount,
  //     leverage,
  //     long,
  //     approveAndDeposit
  //   );
  // });

  // it("long: col(BTC) -> idx(BTC)", async () => {
  //   const collateral = WBTC;
  //   const index = WBTC;

  //   const collateralAmount = ethers.parseUnits("0.01", 8);
  //   const leverage = 10n;
  //   const long = true;

  //   const approveAndDeposit = async (account, collateral) => {
  //     const token = await ethers.getContractAt("IERC20", collateral);
  //     await token.approve(account.target, collateralAmount * 2n);
  //     await account.deposit(collateral, collateralAmount * 2n);
  //   };

  //   await openAndClosePosition(
  //     collateral,
  //     index,
  //     collateralAmount,
  //     leverage,
  //     long,
  //     approveAndDeposit
  //   );
  // });

  // it("short: col(USDC) -> idx(ETH)", async () => {
  //   const collateral = USDC;
  //   const index = WETH;

  //   const collateralAmount = ethers.parseUnits("600", 6);
  //   const leverage = 10n;
  //   const short = false;

  //   const approveAndDeposit = async (account, collateral) => {
  //     const token = await ethers.getContractAt("IERC20", collateral);
  //     await token.approve(account.target, collateralAmount * 2n);
  //     await account.deposit(USDC, collateralAmount * 2n);
  //   };

  //   await openAndClosePosition(
  //     collateral,
  //     index,
  //     collateralAmount,
  //     leverage,
  //     short,
  //     approveAndDeposit
  //   );
  // });

  // it("short: col(BTC) -> idx(ETH)", async () => {
  //   const collateral = WBTC;
  //   const index = WETH;

  //   const collateralAmount = ethers.parseUnits("0.01", 8);
  //   const leverage = 10n;
  //   const short = true;

  //   const approveAndDeposit = async (account, collateral) => {
  //     const token = await ethers.getContractAt("IERC20", collateral);
  //     await token.approve(account.target, collateralAmount * 2n);
  //     await account.deposit(collateral, collateralAmount * 2n);
  //   };

  //   await openAndClosePosition(
  //     collateral,
  //     index,
  //     collateralAmount,
  //     leverage,
  //     short,
  //     approveAndDeposit
  //   );
  // });

  // it("short: col(ETH) -> idx(BTC)", async () => {
  //   const collateral = WETH;
  //   const index = WBTC;

  //   const collateralAmount = ethers.parseEther("1");
  //   const leverage = 10n;
  //   const short = false;

  //   const approveAndDeposit = async (account) => {
  //     await account.deposit(ethers.ZeroAddress, collateralAmount * 2n, {
  //       value: collateralAmount * 2n,
  //     });
  //   };

  //   await openAndClosePosition(
  //     collateral,
  //     index,
  //     collateralAmount,
  //     leverage,
  //     short,
  //     approveAndDeposit
  //   );
  // });

  // it("short: col(USDC) -> idx(BTC)", async () => {
  //   const collateral = USDC;
  //   const index = WBTC;

  //   const collateralAmount = ethers.parseUnits("600", 6);
  //   const leverage = 10n;
  //   const short = false;

  //   const approveAndDeposit = async (account, collateral) => {
  //     const token = await ethers.getContractAt("IERC20", collateral);
  //     await token.approve(account.target, collateralAmount * 2n);
  //     await account.deposit(USDC, collateralAmount * 2n);
  //   };

  //   await openAndClosePosition(
  //     collateral,
  //     index,
  //     collateralAmount,
  //     leverage,
  //     short,
  //     approveAndDeposit
  //   );
  // });

  // it("short: col(BTC) -> idx(BTC)", async () => {
  //   const collateral = WBTC;
  //   const index = WBTC;

  //   const collateralAmount = ethers.parseUnits("0.01", 8);
  //   const leverage = 10n;
  //   const short = false;

  //   const approveAndDeposit = async (account, collateral) => {
  //     const token = await ethers.getContractAt("IERC20", collateral);
  //     await token.approve(account.target, collateralAmount * 2n);
  //     await account.deposit(collateral, collateralAmount * 2n);
  //   };

  //   await openAndClosePosition(
  //     collateral,
  //     index,
  //     collateralAmount,
  //     leverage,
  //     short,
  //     approveAndDeposit
  //   );
  // });
});
