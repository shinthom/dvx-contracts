const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const { deploy } = require("./fixture/setup");

describe("Account", () => {
  const orderType = {
    increasePosition: 0,
    decreasePosition: 1,
    increaseCollateral: 2,
    decreaseCollateral: 3,
  };

  it("ETH -> ETH (long)", async () => {
    const {
      gmxV1,
      mux,
      quoter,
      account,
      tokens,
      executeIncreasePosition,
      fillPositionOrder,
    } = await loadFixture(deploy);

    const WETH = tokens.WETH;

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

    await account.depositETH(collateralAmount, { value: collateralAmount });
    await account.createOrders(
      [gmxV1.target],
      [
        {
          orderType: gmxOrder.orderType,
          collateral: gmxOrder.collateral,
          index: gmxOrder.index,
          collateralAmount: gmxOrder.collateralAmount,
          size: gmxOrder.size,
          isLong: gmxOrder.isLong,
        },
      ],
      {
        value: BigInt("180000000000000"), // NOTE: gmx fee
      }
    );
    await executeIncreasePosition();

    await account.depositETH(collateralAmount, { value: collateralAmount });
    await account.createOrders(
      [mux.target],
      [
        {
          orderType: muxOrder.orderType,
          collateral: muxOrder.collateral,
          index: muxOrder.index,
          collateralAmount: muxOrder.collateralAmount,
          size: muxOrder.size,
          isLong: muxOrder.isLong,
        },
      ]
    );
    await fillPositionOrder();

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
  });

  it("USDC -> ETH (short)", async () => {
    const {
      gmxV1,
      mux,
      quoter,
      account,
      tokens,
      usdc,
      swap,
      executeIncreasePosition,
      fillPositionOrder,
    } = await loadFixture(deploy);

    const USDC = tokens.USDC;
    const WETH = tokens.WETH;
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

    await usdc.approve(account.target, collateralAmount);
    await account.deposit(USDC, collateralAmount);

    await account.createOrders(
      [gmxV1.target],
      [
        {
          orderType: gmxOrder.orderType,
          collateral: gmxOrder.collateral,
          index: gmxOrder.index,
          collateralAmount: gmxOrder.collateralAmount,
          size: gmxOrder.size,
          isLong: gmxOrder.isLong,
        },
      ],
      {
        value: BigInt("180000000000000"),
      }
    );
    await executeIncreasePosition();

    await usdc.approve(account.target, collateralAmount);
    await account.deposit(USDC, collateralAmount);

    await account.createOrders(
      [mux.target],
      [
        {
          orderType: muxOrder.orderType,
          collateral: muxOrder.collateral,
          index: muxOrder.index,
          collateralAmount: muxOrder.collateralAmount,
          size: muxOrder.size,
          isLong: muxOrder.isLong,
        },
      ]
    );
    await fillPositionOrder();

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
  });

  it("USDC -> WETH (long)", async () => {});

  it("USDC -> WETH (short)", async () => {});
});
