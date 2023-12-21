const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const { deploy } = require("./fixture/setup");

// token contracts
const WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
const USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

describe("PositionRouter", () => {
  it("increase collateral", async () => {
    const {
      user0,
      account,
      positionRouter,
      quoter,
      gmxV1,
      executeIncreasePosition,
    } = await loadFixture(deploy);

    await account.deposit(ethers.ZeroAddress, ethers.parseEther("1"), {
      value: ethers.parseEther("1"),
    });
    const [gmxOrder] = await quoter.quote(
      WETH,
      WETH,
      ethers.parseEther("1"),
      10n,
      true
    );
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
      ]
    );
    await executeIncreasePosition();
    console.log(await account.getPosition(gmxV1.target, WETH, WETH, true));

    await positionRouter.increaseCollateral(
      gmxV1.target,
      WETH, // collateral
      WETH, // index
      WETH, // tokenIn
      ethers.parseEther("0.1"), // amountIn
      true
    );
  });
});
