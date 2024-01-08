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

describe("increase/decrease", () => {
  it("long: eth -> eth", async () => {
    const { mux, user, account, orderType, ETH, WETH, checkBalance, fillPositionOrder, fillWithdrawalOrder } = await loadFixture(deployAndDepositETH); // prettier-ignore
    const collateralAmount = (await account.getBalance(ETH)) / 2n;
    await checkBalance(account);

    const order = await mux.makePositionOrder(WETH, WETH, collateralAmount, 10n, true, wethPrice, wethPrice); // prettier-ignore
    await account.connect(user).createMarketOrders([mux.target], [{ orderType: order.orderType, path: [...order.path], index: order.index, collateralAmount: order.collateralAmount, size: order.size, isLong: order.isLong }]); // prettier-ignore
    await fillPositionOrder();
    const position = await mux.getPosition(account.target, WETH, WETH, true); // prettier-ignore
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, WETH, WETH, true)}`); // prettier-ignore

    await account.connect(user).createMarketOrders([mux.target], [{ orderType: orderType.increaseCollateral, path: [WETH], index: WETH, collateralAmount: collateralAmount, size: 0, isLong: position.isLong }]); // prettier-ignore
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, WETH, WETH, true)}`); // prettier-ignore

    await account.connect(user).createMarketOrders([mux.target], [{ orderType: orderType.decreaseCollateral, path: [WETH], index: WETH, collateralAmount: collateralAmount, size: 0, isLong: position.isLong }]); // prettier-ignore
    await fillWithdrawalOrder(account.target);
    await checkBalance(account);

    console.log(`- position: ${await mux.getPosition(account.target, WETH, WETH, true)}`); // prettier-ignore

    await account.connect(user).createMarketOrders([mux.target], [{ orderType: orderType.decreasePosition, path: [WETH], index: WETH, collateralAmount: 0, size: position.size, isLong: position.isLong }]); // prettier-ignore
    await fillPositionOrder();
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, WETH, WETH, true)}`); // prettier-ignore
  });

  it("long: usdc -> eth", async () => {
    const { mux, user, account, orderType, USDC, WETH, checkBalance, fillPositionOrder, fillWithdrawalOrder } = await loadFixture(deployAndDepositUSDC); // prettier-ignore
    const collateralAmount = (await account.getBalance(USDC)) / 2n;
    await checkBalance(account);

    const order = await mux.makePositionOrder(USDC, WETH, collateralAmount, 10n, true, usdcPrice, wethPrice); // prettier-ignore
    await account.connect(user).createMarketOrders([mux.target], [{ orderType: order.orderType, path: [...order.path], index: order.index, collateralAmount: order.collateralAmount, size: order.size, isLong: order.isLong }]); // prettier-ignore
    await fillPositionOrder();
    const position = await mux.getPosition(account.target, USDC, WETH, true); // prettier-ignore
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, USDC, WETH, true)}`); // prettier-ignore

    await account.connect(user).createMarketOrders([mux.target], [{ orderType: orderType.increaseCollateral, path: [USDC], index: WETH, collateralAmount: collateralAmount, size: 0, isLong: position.isLong }]); // prettier-ignore
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, USDC, WETH, true)}`); // prettier-ignore

    await account.connect(user).createMarketOrders([mux.target], [{ orderType: orderType.decreaseCollateral, path: [USDC], index: WETH, collateralAmount: collateralAmount, size: 0, isLong: position.isLong }]); // prettier-ignore
    await fillWithdrawalOrder(account.target);
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, USDC, WETH, true)}`); // prettier-ignore

    await account.connect(user).createMarketOrders([mux.target], [{ orderType: orderType.decreasePosition, path: [USDC], index: WETH, collateralAmount: 0, size: position.size, isLong: position.isLong }]); // prettier-ignore
    await fillPositionOrder();
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, USDC, WETH, true)}`); // prettier-ignore
  });

  it("long: wbtc -> eth", async () => {
    const { mux, user, account, orderType, WBTC, WETH, checkBalance, fillPositionOrder, fillWithdrawalOrder } = await loadFixture(deployAndDepositWBTC); // prettier-ignore
    const collateralAmount = (await account.getBalance(WBTC)) / 2n;
    await checkBalance(account);

    const order = await mux.makePositionOrder(WBTC, WETH, collateralAmount, 10n, true, wbtcPrice, wethPrice); // prettier-ignore
    await account.connect(user).createMarketOrders([mux.target], [{ orderType: order.orderType, path: [...order.path], index: order.index, collateralAmount: order.collateralAmount, size: order.size, isLong: order.isLong }]); // prettier-ignore
    await fillPositionOrder();
    const position = await mux.getPosition(account.target, WBTC, WETH, true); // prettier-ignore
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, WBTC, WETH, true)}`); // prettier-ignore

    await account.connect(user).createMarketOrders([mux.target], [{ orderType: orderType.increaseCollateral, path: [WBTC], index: WETH, collateralAmount: collateralAmount, size: 0, isLong: position.isLong }]); // prettier-ignore
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, WBTC, WETH, true)}`); // prettier-ignore

    await account.connect(user).createMarketOrders([mux.target], [{ orderType: orderType.decreaseCollateral, path: [WBTC], index: WETH, collateralAmount: collateralAmount, size: 0, isLong: position.isLong }]); // prettier-ignore
    await fillWithdrawalOrder(account.target);
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, WBTC, WETH, true)}`); // prettier-ignore

    await account.connect(user).createMarketOrders([mux.target], [{ orderType: orderType.decreasePosition, path: [WBTC], index: WETH, collateralAmount: 0, size: position.size, isLong: position.isLong }]); // prettier-ignore
    await fillPositionOrder();
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, WBTC, WETH, true)}`); // prettier-ignore
  });

  it("long: wbtc -> wbtc", async () => {
    const { user, account, mux, orderType, WBTC, checkBalance, fillPositionOrder, fillWithdrawalOrder } = await loadFixture(deployAndDepositWBTC); // prettier-ignore
    const collateralAmount = (await account.getBalance(WBTC)) / 2n;
    await checkBalance(account);

    const order = await mux.makePositionOrder(WBTC, WBTC, collateralAmount, 10n, true, wbtcPrice, wbtcPrice); // prettier-ignore
    await account.connect(user).createMarketOrders([mux.target], [{ orderType: order.orderType, path: [...order.path], index: order.index, collateralAmount: order.collateralAmount, size: order.size, isLong: order.isLong }]); // prettier-ignore
    await fillPositionOrder();
    await checkBalance(account);
    const position = await mux.getPosition(account.target, WBTC, WBTC, true); // prettier-ignore
    console.log(`- position: ${position}`); // prettier-ignore

    await account.connect(user).createMarketOrders([mux.target], [{ orderType: orderType.increaseCollateral, path: [WBTC], index: WBTC, collateralAmount: collateralAmount, size: 0, isLong: position.isLong }]); // prettier-ignore
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, WBTC, WBTC, true)}`); // prettier-ignore

    await account.connect(user).createMarketOrders([mux.target], [{ orderType: orderType.decreaseCollateral, path: [WBTC], index: WBTC, collateralAmount: collateralAmount, size: 0, isLong: position.isLong }]); // prettier-ignore
    await fillWithdrawalOrder(account.target);
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, WBTC, WBTC, true)}`); // prettier-ignore

    await account.connect(user).createMarketOrders([mux.target], [{ orderType: orderType.decreasePosition, path: [WBTC], index: WBTC, collateralAmount: 0, size: position.size, isLong: position.isLong }]); // prettier-ignore
    await fillPositionOrder();
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, WBTC, WBTC, true)}`); // prettier-ignore
  });

  it("long: weth -> wbtc", async () => {
    const { user, account, mux, orderType, ETH, WETH, WBTC, checkBalance, fillPositionOrder, fillWithdrawalOrder } = await loadFixture(deployAndDepositETH); // prettier-ignore
    const collateralAmount = (await account.getBalance(ETH)) / 2n;
    await checkBalance(account);

    const order = await mux.makePositionOrder(WETH, WBTC, collateralAmount, 10n, true, wethPrice, wbtcPrice); // prettier-ignore
    await account.connect(user).createMarketOrders([mux.target], [{ orderType: order.orderType, path: [...order.path], index: order.index, collateralAmount: order.collateralAmount, size: order.size, isLong: order.isLong }]); // prettier-ignore
    await fillPositionOrder();
    await checkBalance(account);
    const position = await mux.getPosition(account.target, WETH, WBTC, true); // prettier-ignore
    console.log(`- position: ${position}`); // prettier-ignore

    await account.connect(user).createMarketOrders([mux.target], [{ orderType: orderType.increaseCollateral, path: [WETH], index: WBTC, collateralAmount: collateralAmount, size: 0, isLong: position.isLong }]); // prettier-ignore
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, WETH, WBTC, true)}`); // prettier-ignore

    await account.connect(user).createMarketOrders([mux.target], [{ orderType: orderType.decreaseCollateral, path: [WETH], index: WBTC, collateralAmount: collateralAmount, size: 0, isLong: position.isLong }]); // prettier-ignore
    await fillWithdrawalOrder(account.target);
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, WETH, WBTC, true)}`); // prettier-ignore

    await account.connect(user).createMarketOrders([mux.target], [{ orderType: orderType.decreasePosition, path: [WETH], index: WBTC, collateralAmount: 0, size: position.size, isLong: position.isLong }]); // prettier-ignore
    await fillPositionOrder();
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, WETH, WBTC, true)}`); // prettier-ignore
  });

  it("long: usdc -> wbtc", async () => {
    const { user, account, mux, orderType, USDC, WBTC, checkBalance, fillPositionOrder, fillWithdrawalOrder } = await loadFixture(deployAndDepositUSDC); // prettier-ignore
    const collateralAmount = (await account.getBalance(USDC)) / 2n;
    await checkBalance(account);

    const order = await mux.makePositionOrder(USDC, WBTC, collateralAmount, 10n, true, usdcPrice, wbtcPrice); // prettier-ignore
    await account.connect(user).createMarketOrders([mux.target], [{ orderType: order.orderType, path: [...order.path], index: order.index, collateralAmount: order.collateralAmount, size: order.size, isLong: order.isLong }]); // prettier-ignore
    await fillPositionOrder();
    await checkBalance(account);
    const position = await mux.getPosition(account.target, USDC, WBTC, true); // prettier-ignore
    console.log(`- position: ${position}`); // prettier-ignore

    await account.connect(user).createMarketOrders([mux.target], [{ orderType: orderType.increaseCollateral, path: [USDC], index: WBTC, collateralAmount: collateralAmount, size: 0, isLong: position.isLong }]); // prettier-ignore
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, USDC, WBTC, true)}`); // prettier-ignore

    await account.connect(user).createMarketOrders([mux.target], [{ orderType: orderType.decreaseCollateral, path: [USDC], index: WBTC, collateralAmount: collateralAmount, size: 0, isLong: position.isLong }]); // prettier-ignore
    await fillWithdrawalOrder(account.target);
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, USDC, WBTC, true)}`); // prettier-ignore

    await account.connect(user).createMarketOrders([mux.target], [{ orderType: orderType.decreasePosition, path: [USDC], index: WBTC, collateralAmount: 0, size: position.size, isLong: position.isLong }]); // prettier-ignore
    await fillPositionOrder();
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, USDC, WBTC, true)}`); // prettier-ignore
  });

  it("short: usdc -> eth", async () => {
    const { user, account, mux, orderType, WETH, USDC, checkBalance, fillPositionOrder, fillWithdrawalOrder } = await loadFixture(deployAndDepositUSDC); // prettier-ignore
    const collateralAmount = (await account.getBalance(USDC)) / 2n;
    await checkBalance(account);

    const order = await mux.makePositionOrder(USDC, WETH, collateralAmount, 10n, false, usdcPrice, wethPrice); // prettier-ignore
    await account.connect(user).createMarketOrders([mux.target], [{ orderType: order.orderType, path: [...order.path], index: order.index, collateralAmount: order.collateralAmount, size: order.size, isLong: order.isLong }]); // prettier-ignore
    await fillPositionOrder();
    await checkBalance(account);
    const position = await mux.getPosition(account.target, USDC, WETH, false); // prettier-ignore
    console.log(`- position: ${position}`); // prettier-ignore

    await account.connect(user).createMarketOrders([mux.target], [{ orderType: orderType.increaseCollateral, path: [USDC], index: WETH, collateralAmount: collateralAmount, size: 0, isLong: position.isLong }]); // prettier-ignore
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, USDC, WETH, false)}`); // prettier-ignore

    await account.connect(user).createMarketOrders([mux.target], [{ orderType: orderType.decreaseCollateral, path: [USDC], index: WETH, collateralAmount: collateralAmount, size: 0, isLong: position.isLong }]); // prettier-ignore
    await fillWithdrawalOrder(account.target);
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, USDC, WETH, false)}`); // prettier-ignore

    await account.connect(user).createMarketOrders([mux.target], [{ orderType: orderType.decreasePosition, path: [USDC], index: WETH, collateralAmount: 0, size: position.size, isLong: position.isLong }]); // prettier-ignore
    await fillPositionOrder();
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, USDC, WETH, false)}`); // prettier-ignore
  });

  it("short: usdc -> wbtc", async () => {
    const { user, account, mux, orderType, WBTC, USDC, checkBalance, fillPositionOrder, fillWithdrawalOrder } = await loadFixture(deployAndDepositUSDC); // prettier-ignore
    const collateralAmount = (await account.getBalance(USDC)) / 2n;
    await checkBalance(account);

    const order = await mux.makePositionOrder(USDC, WBTC, collateralAmount, 10n, false, usdcPrice, wbtcPrice); // prettier-ignore
    await account.connect(user).createMarketOrders([mux.target], [{ orderType: order.orderType, path: [...order.path], index: order.index, collateralAmount: order.collateralAmount, size: order.size, isLong: order.isLong }]); // prettier-ignore
    await fillPositionOrder();
    await checkBalance(account);
    const position = await mux.getPosition(account.target, USDC, WBTC, false); // prettier-ignore
    console.log(`- position: ${position}`); // prettier-ignore

    await account.connect(user).createMarketOrders([mux.target], [{ orderType: orderType.increaseCollateral, path: [USDC], index: WBTC, collateralAmount: collateralAmount, size: 0, isLong: position.isLong }]); // prettier-ignore
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, USDC, WBTC, false)}`); // prettier-ignore

    await account.connect(user).createMarketOrders([mux.target], [{ orderType: orderType.decreaseCollateral, path: [USDC], index: WBTC, collateralAmount: collateralAmount, size: 0, isLong: position.isLong }]); // prettier-ignore
    await fillWithdrawalOrder(account.target);
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, USDC, WBTC, false)}`); // prettier-ignore

    await account.connect(user).createMarketOrders([mux.target], [{ orderType: orderType.decreasePosition, path: [USDC], index: WBTC, collateralAmount: 0, size: position.size, isLong: position.isLong }]); // prettier-ignore
    await fillPositionOrder();
    await checkBalance(account);
    console.log(`- position: ${await mux.getPosition(account.target, USDC, WBTC, false)}`); // prettier-ignore
  });
});
