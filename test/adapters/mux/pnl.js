const axios = require("axios");
const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {
  deploy,
  deployAndDepositETH,
  deployAndDepositWBTC,
  deployAndDepositUSDC,
} = require("../../fixture/setup");

describe("MUX", () => {
  let wethPrice;
  let wbtcPrice;
  let usdcPrice;

  const format = (priceString) => {
    let [whole, fraction = ""] = priceString.split(".");
    fraction = fraction.padEnd(18, "0");

    const combined = whole + fraction;
    return BigInt(combined).toString();
  };

  before(async () => {
    const assets
      = (await axios("https://app.mux.network/api/liquidityAsset")).data.assets; // prettier-ignore
    const weth = assets.find((asset) => asset.symbol === "ETH");
    const wbtc = assets.find((asset) => asset.symbol === "BTC");
    const usdc = assets.find((asset) => asset.symbol === "USDC");

    wethPrice = format(weth.price);
    wbtcPrice = format(wbtc.price);
    usdcPrice = format(usdc.price);
  });

  describe("pnl", () => {
    it("eth -> eth: long, increasePosition", async () => {
      const {
        mux,
        user,
        account,
        ETH,
        WETH,
        checkBalance,
        fillPositionOrder,
        replaceOracleReferenceAndSetPrice,
      } = await loadFixture(deployAndDepositETH);
      const collateralAmount = (await account.getBalance(ETH)) / 2n;
      const leverage = 10n;
      const isLong = true;
      {
        await checkBalance(account);
      }
      var price = ethers.parseUnits("2000", 8);
      await replaceOracleReferenceAndSetPrice(WETH, price);
      const order = await mux.makePositionOrder(WETH, WETH, collateralAmount, leverage, isLong, usdcPrice, wethPrice); // prettier-ignore
      await account.connect(user).createMarketOrders([mux.target], [{ orderType: order.orderType, path: [...order.path], index: order.index, collateralAmount: order.collateralAmount, size: order.size, isLong: order.isLong }]); // prettier-ignore
      await fillPositionOrder();
      {
        await checkBalance(account);
        console.log("position:\n", await mux.getPosition(account.target, WETH, WETH, isLong)); // prettier-ignore
      }
      var price = ethers.parseUnits("2200", 8); // pnl +10%
      await replaceOracleReferenceAndSetPrice(WETH, price);
      await account.connect(user).createMarketOrders([mux.target], [{ orderType: order.orderType, path: [...order.path], index: order.index, collateralAmount: order.collateralAmount, size: order.size, isLong: order.isLong }]); // prettier-ignore
      await fillPositionOrder();
      {
        await checkBalance(account);
        console.log("position:\n", await mux.getPosition(account.target, WETH, WETH, isLong)); // prettier-ignore
      }
    });
  });
});
