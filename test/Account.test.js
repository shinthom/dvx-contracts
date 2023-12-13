const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const { deploy } = require("./fixture/setup");

// token contracts
const WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
const USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";

const orderType = {
  increasePosition: 0,
  decreasePosition: 1,
  increaseCollateral: 2,
  decreaseCollateral: 3,
};

describe("Account", () => {
  it("long: ETH -> ETH", async () => {
    const {
      gmxV1,
      mux,
      quoter,
      account,
      executeIncreasePosition,
      fillPositionOrder,
    } = await loadFixture(deploy);

    const collateralAmount = ethers.parseEther("1");
    const leverage = 10n;

    const gmxOrder = await quoter.quoteGMX(
      orderType.increasePosition,
      WETH,
      WETH,
      collateralAmount,
      leverage,
      true // long
    );
    const muxOrder = await quoter.quoteMUX(
      orderType.increasePosition,
      WETH,
      WETH,
      collateralAmount,
      leverage,
      true // long
    );

    await account.depositETH(collateralAmount * 2n, {
      value: collateralAmount * 2n,
    });
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
    console.log(
      `position(gmx-v1): ${await gmxV1.getPosition(
        account.target,
        WETH,
        WETH,
        true
      )}`
    );
    console.log(
      `position(mux)   : ${await mux.getPosition(
        account.target,
        WETH,
        WETH,
        true
      )}`
    );
  });

  it("long: USDC -> WETH", async () => {
    const {
      gmxV1,
      mux,
      quoter,
      account,
      executeIncreasePosition,
      fillPositionOrder,
      swap,
    } = await loadFixture(deploy);

    await swap(WETH, USDC, ethers.parseEther("10"));

    const collateralAmount = ethers.parseUnits("600", 6); // USDC
    const leverage = 10n;

    const gmxOrder = await quoter.quoteGMX(
      orderType.increasePosition,
      USDC,
      WETH,
      collateralAmount,
      leverage,
      true // long
    );
    const muxOrder = await quoter.quoteMUX(
      orderType.increasePosition,
      USDC,
      WETH,
      collateralAmount,
      leverage,
      true // long
    );

    await usdc.approve(account.target, collateralAmount * 2n);
    await account.deposit(USDC, collateralAmount * 2n);
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
    console.log(
      `position(gmx-v1): ${await gmxV1.getPosition(
        account.target,
        WETH,
        WETH,
        true
      )}`
    );
    console.log(
      `position(mux)   : ${await mux.getPosition(
        account.target,
        USDC,
        WETH,
        true
      )}`
    );
  });

  it("short: USDC -> ETH", async () => {
    const {
      gmxV1,
      mux,
      quoter,
      account,
      usdc,
      swap,
      executeIncreasePosition,
      fillPositionOrder,
    } = await loadFixture(deploy);

    await swap(WETH, USDC, ethers.parseEther("10"));

    const collateralAmount = ethers.parseUnits("600", 6); // USDC
    const leverage = 10n;

    const gmxOrder = await quoter.quoteGMX(
      orderType.increasePosition,
      USDC,
      WETH,
      collateralAmount,
      leverage,
      false // short
    );
    const muxOrder = await quoter.quoteMUX(
      orderType.increasePosition,
      USDC,
      WETH,
      collateralAmount,
      leverage,
      false // short
    );

    await usdc.approve(account.target, collateralAmount * 2n);
    await account.deposit(USDC, collateralAmount * 2n);
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
    console.log(
      `position(gmx-v1): ${await gmxV1.getPosition(
        account.target,
        USDC,
        WETH,
        false
      )}`
    );
    console.log(
      `position(mux)   : ${await mux.getPosition(
        account.target,
        USDC,
        WETH,
        false
      )}`
    );
  });

  it("short: ETH -> ETH", async () => {
    const {
      gmxV1,
      mux,
      quoter,
      account,
      executeIncreasePosition,
      fillPositionOrder,
    } = await loadFixture(deploy);

    const collateralAmount = ethers.parseEther("1");
    const leverage = 10n;

    const gmxOrder = await quoter.quoteGMX(
      orderType.increasePosition,
      WETH,
      WETH,
      collateralAmount,
      leverage,
      false // short
    );
    const muxOrder = await quoter.quoteMUX(
      orderType.increasePosition,
      WETH,
      WETH,
      collateralAmount,
      leverage,
      false // short
    );

    await account.depositETH(collateralAmount * 2n, {
      value: collateralAmount * 2n,
    });
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

    console.log(
      `position(gmx-v1): ${await gmxV1.getPosition(
        account.target,
        USDC,
        WETH,
        false
      )}`
    );
    console.log(
      `position(mux)   : ${await mux.getPosition(
        account.target,
        WETH,
        WETH,
        false
      )}`
    );
  });
});
