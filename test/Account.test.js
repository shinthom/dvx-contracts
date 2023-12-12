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

  it("WETH -> WETH (long)", async () => {
    const {
      gmxV1,
      mux,
      quoter,
      account,
      tokens,
      weth,
      executeIncreasePosition,
      executeDecreasePosition,
      fillPositionOrder,
      fillWithdrawalOrder,
    } = await loadFixture(deploy);

    const WETH = tokens.WETH;
    const USDC = tokens.USDC;

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

    await weth.deposit({ value: collateralAmount });
    await weth.approve(account.target, collateralAmount);

    await account.deposit(WETH, collateralAmount);
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
    console.log(await gmxV1.getPosition(account.target, WETH, WETH, true));

    await weth.deposit({ value: collateralAmount });
    await weth.approve(account.target, collateralAmount);

    await account.deposit(WETH, collateralAmount);
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
      ],
      {
        value: collateralAmount,
      }
    );
    await fillPositionOrder();
    console.log(await mux.getPosition(account.target, WETH, WETH, true));

    await weth.deposit({ value: collateralAmount * 2n });
    await weth.approve(account.target, collateralAmount * 2n);

    await account.deposit(WETH, collateralAmount * 2n);
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
        value: BigInt("180000000000000") + collateralAmount,
      }
    );
    await executeIncreasePosition();
    console.log(await gmxV1.getPosition(account.target, WETH, WETH, true));
    await fillPositionOrder();
    console.log(await mux.getPosition(account.target, WETH, WETH, true));
  });

  it("USDC -> WETH (long)", async () => {});
  it("WETH -> WETH (short)", async () => {});
  it("USDC -> WETH (short)", async () => {});
});
