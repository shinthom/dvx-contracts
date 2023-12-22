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

describe("PositionRouter", () => {
  const fee = BigInt("180000000000000");

  it("increase position", async () => {
    const { account, positionRouter, gmxV1, executeIncreasePosition } =
      await loadFixture(deploy);

    const collateralAmount = ethers.parseEther("1");
    await account.deposit(ethers.ZeroAddress, collateralAmount, {
      value: collateralAmount,
    });

    await positionRouter.increasePosition(
      gmxV1.target,
      WETH,
      WETH,
      collateralAmount,
      ethers.parseUnits("6000", 30),
      true,
      {
        value: fee,
      }
    );
    await executeIncreasePosition();
    console.log(await account.getPosition(gmxV1.target, WETH, WETH, true));
  });

  it("increase collateral", async () => {
    const { account, positionRouter, gmxV1, executeIncreasePosition } =
      await loadFixture(deploy);

    const collateralAmount = ethers.parseEther("1");
    await account.deposit(ethers.ZeroAddress, collateralAmount, {
      value: collateralAmount,
    });

    await positionRouter.increasePosition(
      gmxV1.target,
      WETH,
      WETH,
      collateralAmount,
      ethers.parseUnits("6000", 30),
      true,
      {
        value: fee,
      }
    );
    await executeIncreasePosition();
    console.log(await account.getPosition(gmxV1.target, WETH, WETH, true));

    await account.deposit(ethers.ZeroAddress, collateralAmount, {
      value: collateralAmount,
    });

    await positionRouter.increaseCollateral(
      gmxV1.target,
      WETH,
      WETH,
      WETH,
      collateralAmount,
      true,
      {
        value: fee,
      }
    );
    await executeIncreasePosition();
    console.log(await account.getPosition(gmxV1.target, WETH, WETH, true));
  });
});
