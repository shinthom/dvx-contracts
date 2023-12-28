const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("./fixture/setup");
const axios = require("axios");

describe("Quoter", () => {
  // token contracts
  const WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
  const USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
  const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

  // prices
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

  it("scenario", async () => {
    const { gmxV1, mux, quoter, account } = await loadFixture(deploy);

    const tokenStr = (token) => {
      if (token === WETH) return "WETH";
      if (token === WBTC) return "WBTC";
      if (token === USDC) return "USDC";
      return token;
    };
    const isLongStr = (isLong) => (isLong ? "long" : "short");
    // get price
    const getPrice = (token) => {
      if (token === WETH) return wethPrice;
      if (token === WBTC) return wbtcPrice;
      if (token === USDC) return usdcPrice;
      return 0;
    };

    const wethAmount = ethers.parseEther("1");
    const wbtcAmount = ethers.parseUnits("0.1", 8);
    const usdcAmount = ethers.parseUnits("1000", 6);
    const orders = [
      // long
      { collateral: WETH, index: WETH, collateralAmount: wethAmount, leverage: 10n, isLong: true }, // prettier-ignore
      { collateral: WETH, index: WBTC, collateralAmount: wethAmount, leverage: 10n, isLong: true }, // prettier-ignore
      { collateral: WBTC, index: WETH, collateralAmount: wbtcAmount, leverage: 10n, isLong: true }, // prettier-ignore
      { collateral: WBTC, index: WBTC, collateralAmount: wbtcAmount, leverage: 10n, isLong: true }, // prettier-ignore
      { collateral: USDC, index: WETH, collateralAmount: usdcAmount, leverage: 10n, isLong: true }, // prettier-ignore
      { collateral: USDC, index: WBTC, collateralAmount: usdcAmount, leverage: 10n, isLong: true }, // prettier-ignore
      // short
      { collateral: WETH, index: WETH, collateralAmount: wethAmount, leverage: 10n, isLong: false }, // prettier-ignore
      { collateral: WETH, index: WBTC, collateralAmount: wethAmount, leverage: 10n, isLong: false }, // prettier-ignore
      { collateral: WBTC, index: WETH, collateralAmount: wbtcAmount, leverage: 10n, isLong: false }, // prettier-ignore
      { collateral: WBTC, index: WBTC, collateralAmount: wbtcAmount, leverage: 10n, isLong: false }, // prettier-ignore
      { collateral: USDC, index: WETH, collateralAmount: usdcAmount, leverage: 10n, isLong: false }, // prettier-ignore
      { collateral: USDC, index: WBTC, collateralAmount: usdcAmount, leverage: 10n, isLong: false }, // prettier-ignore
    ];

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];

      const gmxOrder = {
        ...order,
        collateralPrice: 0,
        indexPrice: 0,
      };
      const muxOrder = {
        ...order,
        collateralPrice: getPrice(order.collateral),
        indexPrice: getPrice(order.index),
      };
      const orders0 = [gmxOrder];
      const orders1 = [muxOrder];

      const answer0 = (
        await quoter.quote(account.target, [gmxV1.target], orders0)
      )[0];
      const answer1 = (
        await quoter.quote(account.target, [mux.target], orders1)
      )[0];
      console.log(answer0);
      console.log(answer1);

      // collateralPrice
      console.log(`\ncollateralPrice (${tokenStr(order.collateral)}:${tokenStr(order.index)} - ${isLongStr(order.isLong)})`); // prettier-ignore
      console.log(`- gmx: ${answer0[1]}`);
      console.log(`- mux: ${answer1[1]}`);

      // indexPrice
      console.log(`\nindexPrice (${tokenStr(order.collateral)}:${tokenStr(order.index)} - ${isLongStr(order.isLong)})`); // prettier-ignore
      console.log(`- gmx: ${answer0[2]}`);
      console.log(`- mux: ${answer1[2]}`);

      // fee
      console.log(`\nfee (${tokenStr(order.collateral)}:${tokenStr(order.index)} - ${isLongStr(order.isLong)})`); // prettier-ignore
      console.log(`- gmx: ${answer0[3]}`);
      console.log(`- mux: ${answer1[3]}`);

      // liquidity available
      console.log(`\nliquidity available (${tokenStr(order.collateral)}:${tokenStr(order.index)} - ${isLongStr(order.isLong)})`); // prettier-ignore
      console.log(`- gmx: ${answer0[4]}`);
      console.log(`- mux: ${answer1[4]}`);

      // position order
      console.log(`\nposition order (${tokenStr(order.collateral)}:${tokenStr(order.index)} - ${isLongStr(order.isLong)})`); // prettier-ignore
      console.log(`- gmx: ${answer0[5]}`);
      console.log(`- mux: ${answer1[5]}`);
    }
  });

  // it("makePositionOrder", async () => {
  //   const { quoter, gmxV1, mux } = await loadFixture(deploy);
  //   console.log("gmxV1");
  //   console.log(`- positionOrder: ${await quoter.makePositionOrder(gmxV1.target, [WETH, WETH, ethers.parseEther("1"), 10n, true, 0, 0])})`); // prettier-ignore
  //   console.log(`- positionOrder: ${await quoter.makePositionOrder(gmxV1.target, [WBTC, WETH, ethers.parseUnits("0.1", 8), 10n, true, 0, 0])})`); // prettier-ignore
  //   console.log(`- positionOrder: ${await quoter.makePositionOrder(gmxV1.target, [USDC, WETH, ethers.parseUnits("1000", 6), 10n, false, 0, 0])})`); // prettier-ignore
  //   console.log(`- positionOrder: ${await quoter.makePositionOrder(gmxV1.target, [WBTC, WETH, ethers.parseUnits("0.1", 8), 10n, false, 0, 0])})`); // prettier-ignore
  //   console.log("mux");
  //   console.log(`- positionOrder: ${await quoter.makePositionOrder(mux.target, [WETH, WETH, ethers.parseEther("1"), 10n, true, wethPrice, wethPrice])})`); // prettier-ignore
  //   console.log(`- positionOrder: ${await quoter.makePositionOrder(mux.target, [WBTC, WETH, ethers.parseUnits("0.1", 8), 10n, true, wbtcPrice, wethPrice])})`); // prettier-ignore
  //   console.log(`- positionOrder: ${await quoter.makePositionOrder(mux.target, [USDC, WETH, ethers.parseUnits("1000", 6), 10n, false, usdcPrice, wethPrice])})`); // prettier-ignore
  //   console.log(`- positionOrder: ${await quoter.makePositionOrder(mux.target, [WBTC, WETH, ethers.parseUnits("0.1", 8), 10n, false, wbtcPrice, wethPrice])})`); // prettier-ignore
  // });

  // it("getPosition", async () => {
  //   const { quoter, account, gmxV1, mux } = await loadFixture(deploy);
  //   console.log("gmxV1");
  //   console.log(`position: ${await quoter.getPosition(account.target, gmxV1.target, [WETH, WETH, ethers.parseEther("1"), 10n, true, 0, 0])}`); // prettier-ignore
  //   console.log(`position: ${await quoter.getPosition(account.target, gmxV1.target, [WBTC, WETH, ethers.parseUnits("0.1", 8), 10n, true, 0, 0])}`); // prettier-ignore
  //   console.log(`position: ${await quoter.getPosition(account.target, gmxV1.target, [USDC, WETH, ethers.parseUnits("1000", 6), 10n, false, 0, 0])}`); // prettier-ignore
  //   console.log(`position: ${await quoter.getPosition(account.target, gmxV1.target, [WBTC, WETH, ethers.parseUnits("0.1", 8), 10n, false, 0, 0])}`); // prettier-ignore
  //   console.log("mux");
  //   console.log(`position: ${await quoter.getPosition(account.target, mux.target, [WETH, WETH, ethers.parseEther("1"), 10n, true, wethPrice, wethPrice])}`); // prettier-ignore
  //   console.log(`position: ${await quoter.getPosition(account.target, mux.target, [WBTC, WETH, ethers.parseUnits("0.1", 8), 10n, true, wbtcPrice, wethPrice])}`); // prettier-ignore
  //   console.log(`position: ${await quoter.getPosition(account.target, mux.target, [USDC, WETH, ethers.parseUnits("1000", 6), 10n, false, usdcPrice, wethPrice])}`); // prettier-ignore
  //   console.log(`position: ${await quoter.getPosition(account.target, mux.target, [WBTC, WETH, ethers.parseUnits("0.1", 8), 10n, false, wbtcPrice, wethPrice])}`); // prettier-ignore
  // });

  // it("getFee", async () => {
  //   const { quoter, account, gmxV1, mux } = await loadFixture(deploy);
  //   console.log("gmx");
  //   console.log(`fee: ${await quoter.getFee(account.target, gmxV1.target, [WETH, WETH, ethers.parseEther("1"),       10n, true, 0, 0])}`); // prettier-ignore
  //   console.log(`fee: ${await quoter.getFee(account.target, gmxV1.target, [WBTC, WETH, ethers.parseUnits("0.1", 8),  10n, true, 0, 0])}`); // prettier-ignore
  //   console.log(`fee: ${await quoter.getFee(account.target, gmxV1.target, [USDC, WETH, ethers.parseUnits("1000", 6), 10n, false, 0, 0])}`); // prettier-ignore
  //   console.log(`fee: ${await quoter.getFee(account.target, gmxV1.target, [WBTC, WETH, ethers.parseUnits("0.1", 8),  10n, false, 0, 0])}`); // prettier-ignore
  //   console.log("mux");
  //   console.log(`fee: ${await quoter.getFee(account.target, mux.target, [WETH, WETH, ethers.parseEther("1"),       10n, true, wethPrice, wethPrice])}`); // prettier-ignore
  //   console.log(`fee: ${await quoter.getFee(account.target, mux.target, [WBTC, WETH, ethers.parseUnits("0.1", 8),  10n, true, wbtcPrice, wethPrice])}`); // prettier-ignore
  //   console.log(`fee: ${await quoter.getFee(account.target, mux.target, [USDC, WETH, ethers.parseUnits("1000", 6), 10n, false, usdcPrice, wethPrice])}`); // prettier-ignore
  //   console.log(`fee: ${await quoter.getFee(account.target, mux.target, [WBTC, WETH, ethers.parseUnits("0.1", 8),  10n, false, wbtcPrice, wethPrice])}`); // prettier-ignore
  // });

  // it("get", async () => {
  //   const { quoter, account, gmxV1, mux } = await loadFixture(deploy);
  //   console.log("gmxV1");
  //   console.log(`price, fee, availableLiquidity, positionOrder: ${await quoter.get(account.target, [gmxV1.target], [[WETH, WETH, ethers.parseEther("1"),       10n, true, 0, 0]])}`); // prettier-ignore
  //   console.log(`price, fee, availableLiquidity, positionOrder: ${await quoter.get(account.target, [gmxV1.target], [[WBTC, WETH, ethers.parseUnits("0.1", 8),  10n, true, 0, 0]])}`); // prettier-ignore
  //   console.log(`price, fee, availableLiquidity, positionOrder: ${await quoter.get(account.target, [gmxV1.target], [[USDC, WETH, ethers.parseUnits("1000", 6), 10n, false, 0, 0]])}`); // prettier-ignore
  //   console.log(`price, fee, availableLiquidity, positionOrder: ${await quoter.get(account.target, [gmxV1.target], [[WBTC, WETH, ethers.parseUnits("0.1", 8),  10n, false, 0, 0]])}`); // prettier-ignore
  //   console.log("mux");
  //   console.log(`price, fee, availableLiquidity, positionOrder: ${await quoter.get(account.target, [mux.target], [[WETH, WETH, ethers.parseEther("1"),       10n, true, wethPrice, wethPrice]])}`); // prettier-ignore
  //   console.log(`price, fee, availableLiquidity, positionOrder: ${await quoter.get(account.target, [mux.target], [[WBTC, WETH, ethers.parseUnits("0.1", 8),  10n, true, wbtcPrice, wethPrice]])}`); // prettier-ignore
  //   console.log(`price, fee, availableLiquidity, positionOrder: ${await quoter.get(account.target, [mux.target], [[USDC, WETH, ethers.parseUnits("1000", 6), 10n, false, usdcPrice, wethPrice]])}`); // prettier-ignore
  //   console.log(`price, fee, availableLiquidity, positionOrder: ${await quoter.get(account.target, [mux.target], [[WBTC, WETH, ethers.parseUnits("0.1", 8),  10n, false, wbtcPrice, wethPrice]])}`); // prettier-ignore
  // });

  // it("quote", async () => {
  //   const { quoter, account, gmxV1, mux } = await loadFixture(deploy);
  //   console.log("gmxV1");
  //   console.log(`price, fee, availableLiquidity, positionOrder: ${await quoter.get(account.target, [gmxV1.target], [[WETH, WETH, ethers.parseEther("1"),       10n, true, 0, 0]])}`); // prettier-ignore
  //   console.log(`price, fee, availableLiquidity, positionOrder: ${await quoter.get(account.target, [gmxV1.target], [[WBTC, WETH, ethers.parseUnits("0.1", 8),  10n, true, 0, 0]])}`); // prettier-ignore
  //   console.log(`price, fee, availableLiquidity, positionOrder: ${await quoter.get(account.target, [gmxV1.target], [[USDC, WETH, ethers.parseUnits("1000", 6), 10n, false, 0, 0]])}`); // prettier-ignore
  //   console.log(`price, fee, availableLiquidity, positionOrder: ${await quoter.get(account.target, [gmxV1.target], [[WBTC, WETH, ethers.parseUnits("0.1", 8),  10n, false, 0, 0]])}`); // prettier-ignore
  //   console.log("mux");
  //   console.log(`price, fee, availableLiquidity, positionOrder: ${await quoter.get(account.target, [mux.target], [[WETH, WETH, ethers.parseEther("1"),       10n, true, wethPrice, wethPrice]])}`); // prettier-ignore
  //   console.log(`price, fee, availableLiquidity, positionOrder: ${await quoter.get(account.target, [mux.target], [[WBTC, WETH, ethers.parseUnits("0.1", 8),  10n, true, wbtcPrice, wethPrice]])}`); // prettier-ignore
  //   console.log(`price, fee, availableLiquidity, positionOrder: ${await quoter.get(account.target, [mux.target], [[USDC, WETH, ethers.parseUnits("1000", 6), 10n, false, usdcPrice, wethPrice]])}`); // prettier-ignore
  //   console.log(`price, fee, availableLiquidity, positionOrder: ${await quoter.get(account.target, [mux.target], [[WBTC, WETH, ethers.parseUnits("0.1", 8),  10n, false, wbtcPrice, wethPrice]])}`); // prettier-ignore
  // });

  // it("sort", async () => {
  //   const { quoter } = await loadFixture(deploy);
  //   console.log(await quoter.sort([1, 2, 3]));
  //   console.log(await quoter.sort([1, 3, 2]));
  //   console.log(await quoter.sort([2, 1, 3]));
  //   console.log(await quoter.sort([2, 3, 1]));
  //   console.log(await quoter.sort([3, 1, 2]));
  //   console.log(await quoter.sort([3, 2, 1]));
  // });
});
