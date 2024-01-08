const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { deploy } = require("../fixture/setup");

describe("increasePosition", () => {
  it("gmx v1", async () => {
    const {
      gmxV1,
      user,
      account,
      usdc,
      wbtc,
      ETH,
      WETH,
      WBTC,
      USDC,
      minExecutionFee,
      faucet,
      executeIncreasePosition,
      replaceFastPriceFeedAndSetPrice,
    } = await loadFixture(deploy);

    const price = ethers.parseUnits("2000", 30);
    await replaceFastPriceFeedAndSetPrice(WETH, price, price);
    {
      const collateral = WETH;
      const index = WETH;
      const collateralAmount = ethers.parseEther("1");
      const size = ethers.parseEther("10");
      const isLong = true;

      await account.deposit(ETH, collateralAmount, { value: collateralAmount });

      const positionOrder = await gmxV1.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeIncreasePosition(account.target);
      console.log(await account.getPosition(gmxV1.target, index, index, isLong)); // prettier-ignore
    }
    {
      const collateral = WBTC;
      const index = WETH;
      const collateralAmount = ethers.parseUnits("0.1", 8);
      const size = ethers.parseEther("10");
      const isLong = true;

      await faucet(WBTC, collateralAmount);
      await wbtc.connect(user).approve(account.target, collateralAmount);
      await account.connect(user).deposit(WBTC, collateralAmount);

      const positionOrder = await gmxV1.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeIncreasePosition(account.target);
      console.log(await account.getPosition(gmxV1.target, index, index, isLong)); // prettier-ignore
    }
    {
      const collateral = USDC;
      const index = WETH;
      const collateralAmount = ethers.parseUnits("1000", 6);
      const size = ethers.parseEther("10");
      const isLong = true;

      await faucet(USDC, collateralAmount);
      await usdc.connect(user).approve(account.target, collateralAmount);
      await account.connect(user).deposit(USDC, collateralAmount);

      const positionOrder = await gmxV1.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeIncreasePosition(account.target);
      console.log(await account.getPosition(gmxV1.target, index, index, isLong)); // prettier-ignore
    }
  });
});
