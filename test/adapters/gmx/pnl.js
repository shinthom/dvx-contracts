const { ethers } = require("hardhat");
const { expect, use } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deployAndDepositETH } = require("../../fixture/setup");

describe("GMXV1", () => {
  it("eth -> eth: long, increasePosition", async () => {
    const {
      gmxV1,
      user,
      account,
      ETH,
      WETH,
      minExecutionFee,
      checkBalance,
      executeIncreasePosition,
      replaceFastPriceFeedAndSetPrice,
    } = await loadFixture(deployAndDepositETH);
    const collateralAmount = (await account.getBalance(ETH)) / 2n;
    const leverage = 10n;
    const isLong = true;
    {
      await checkBalance(account);
    }
    var ethMinPrice = ethers.parseUnits("2000", 30);
    var ethMaxPrice = ethers.parseUnits("2000", 30);
    await replaceFastPriceFeedAndSetPrice(WETH, ethMinPrice, ethMaxPrice);
    const order = await gmxV1.makePositionOrder(WETH, WETH, collateralAmount, leverage, isLong, 0, 0); // prettier-ignore
    await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: order.orderType, path: [...order.path], index: order.index, collateralAmount: order.collateralAmount, size: order.size, isLong: order.isLong }], { value: minExecutionFee }); // prettier-ignore
    await executeIncreasePosition(account.target);
    {
      await checkBalance(account);
      console.log(`- position: ${await gmxV1.getPosition(account.target, WETH, WETH, true)}`); // prettier-ignore
    }
    var ethMinPrice = ethers.parseUnits("2200", 30); // +10%
    var ethMaxPrice = ethers.parseUnits("2200", 30); // +10%
    await replaceFastPriceFeedAndSetPrice(WETH, ethMinPrice, ethMaxPrice);
    await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: order.orderType, path: [...order.path], index: order.index, collateralAmount: order.collateralAmount, size: order.size, isLong: order.isLong }], { value: minExecutionFee }); // prettier-ignore
    await executeIncreasePosition(account.target);
    {
      await checkBalance(account);
      console.log(`- position: ${await gmxV1.getPosition(account.target, WETH, WETH, true)}`); // prettier-ignore
    }
  });
});
