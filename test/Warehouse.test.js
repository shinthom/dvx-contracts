const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("./fixture/setup");
const axios = require("axios");

// token contracts
const WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
const USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

describe("warehouse", () => {
  const minExecutionFee = BigInt("180000000000000");

  const format = (priceString) => {
    let [whole, fraction = ""] = priceString.split(".");
    fraction = fraction.padEnd(18, "0");

    const combined = whole + fraction;
    return BigInt(combined).toString();
  };

  // todo: fix (use typescript?)
  const toObj = (answer) => {
    return {
      adapter: answer[0],
      collateralPrice: answer[1],
      indexPrice: answer[2],
      fee: answer[3],
      availableLiquidity: answer[4],
      positionOrder: {
        orderType: answer[5][0],
        path: [...answer[5][1]],
        index: answer[5][2],
        collateralAmount: answer[5][3],
        size: answer[5][4],
        isLong: answer[5][5],
      },
    };
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

  it("limit order", async () => {
    const { user, other, account, warehouse, quoter, gmxV1, mux, fillPositionOrder } = await loadFixture(deploy); // prettier-ignore

    console.log("\n`deposit`");
    const collateralAmount = ethers.parseEther("0.1");
    await account.connect(user).deposit(ethers.ZeroAddress, collateralAmount, { value: collateralAmount }); // prettier-ignore

    console.log("\n`create limit order`");
    const limitOrderParam = { collateral: WETH, index: WETH, collateralAmount: collateralAmount, leverage: 10n, isLong: true, price: ethers.parseUnits("2000", 18) }; // prettier-ignore
    await account.connect(user).createLimitOrder({ ...limitOrderParam }); // prettier-ignore
    const limitOrderIndex0 = await warehouse.getLimitOrderIndex(account.target); // prettier-ignore
    const limitOrder0 = await warehouse.getLimitOrder(account.target, limitOrderIndex0 - 1n); // prettier-ignore
    console.log(`- limitOrder: ${limitOrder0}`) // prettier-ignore

    console.log("\n`quote`");
    const gmxOrder = { collateral: limitOrder0.collateral, index: limitOrder0.index, collateralAmount: limitOrder0.collateralAmount, leverage: limitOrder0.leverage, isLong: limitOrder0.isLong, collateralPrice: 0, indexPrice: 0 }; // prettier-ignore
    const muxOrder = { collateral: limitOrder0.collateral, index: limitOrder0.index, collateralAmount: limitOrder0.collateralAmount, leverage: limitOrder0.leverage, isLong: limitOrder0.isLong, collateralPrice: wethPrice, indexPrice: wethPrice }; // prettier-ignore
    const orders = [gmxOrder, muxOrder];
    const answers = await quoter.quote(account.target, [gmxV1.target, mux.target], orders); // prettier-ignore

    console.log("\n`execute limit order`");
    const answer = toObj(answers[0]); // note: routes to mux adapter.
    await expect(
      warehouse.executeLimitOrder(account.target, 0, [answer])
    ).to.be.revertedWith("Warehouse: not order keeper");
    await warehouse.setOrderKeeper(other.address, true);
    await warehouse
      .connect(other)
      .executeLimitOrder(account.target, 0, [answer]);
    await fillPositionOrder();
    const position = await account.getPosition(mux.target, WETH, WETH, true);
    console.log(`- position: ${position}`);

    console.log("\n`create another limit order`");
    await account.connect(user).createLimitOrder({ ...limitOrderParam });
    const limitOrderIndex1 = await warehouse.getLimitOrderIndex(account.target); // prettier-ignore
    const limitOrder1 = await warehouse.getLimitOrder(account.target, limitOrderIndex1 - 1n); // prettier-ignore
    console.log(`- limitOrder: ${limitOrder1}`) // prettier-ignore

    console.log("\n`cancel limit order`");
    await account.connect(user).cancelLimitOrder(limitOrderIndex1 - 1n);
    const limitOrderIndex2 = await warehouse.getLimitOrderIndex(account.target); // prettier-ignore
    const limitOrder2 = await warehouse.getLimitOrder(account.target, limitOrderIndex2 - 1n); // prettier-ignore
    console.log(`- limitOrder: ${limitOrder2}`) // prettier-ignore

    console.log("\n`create many limit orders`");
    await account.connect(user).createLimitOrder({ ...limitOrderParam });
    await account.connect(user).createLimitOrder({ ...limitOrderParam });
    await account.connect(user).createLimitOrder({ ...limitOrderParam });
    await account.connect(user).createLimitOrder({ ...limitOrderParam });
    await account.connect(user).createLimitOrder({ ...limitOrderParam });
    const index = await warehouse.getLimitOrderIndex(account.target);
    await account.connect(user).cancelLimitOrder(index - 1n);
    await account.connect(user).cancelLimitOrder(index - 3n);
    await account.connect(user).cancelLimitOrder(index - 5n);
    console.log(`limit orders: ${await warehouse.getLimitOrders(account.target)}`); // prettier-ignore
    console.log(`limit orders (active): ${(await warehouse.getLimitOrders(account.target)).filter(limitOrder => limitOrder.index != ethers.ZeroAddress)}`); // prettier-ignore
  });

  it("trigger order", async () => {
    const { user, other, account, gmxV1, weth, warehouse, executeIncreasePosition, executeDecreasePosition } = await loadFixture(deploy); // prettier-ignore

    console.log("\n`open position`");
    const depositAmount = ethers.parseEther("1");
    const leverage = 10n;
    await account.connect(user).deposit(ethers.ZeroAddress, depositAmount, { value: depositAmount }); // prettier-ignore
    const balance = await account.getBalance(ethers.ZeroAddress);
    const order = await gmxV1.makePositionOrder(weth.target, weth.target, balance, leverage, true, 0, 0); // prettier-ignore
    await account.connect(user).createMarketOrders([gmxV1.target], [ { orderType: order.orderType, path: [order.path[0]], index: order.index, collateralAmount: order.collateralAmount, size: order.size, isLong: order.isLong }], { value: minExecutionFee }); // prettier-ignore
    await executeIncreasePosition(account.target);
    const position0 = await account.getPosition(gmxV1.target, order.path[order.path.length - 1], order.index, order.isLong); // prettier-ignore
    console.log(`- position: ${position0}`);

    console.log("\n`create trigger order`");
    const triggerOrderParam = { account: account.target, adapter: gmxV1.target, collateral: WETH, index: WETH, isLong: true, price: ethers.parseUnits("2000", 18) }; // prettier-ignore
    await account.connect(user).createTriggerOrder(triggerOrderParam);
    const triggerOrderIndex0 = await warehouse.getTriggerOrderIndex(account.target); // prettier-ignore
    const triggerOrder = await warehouse.getTriggerOrder(account.target, triggerOrderIndex0 - 1n); // prettier-ignore
    console.log(`- triggerOrder: ${triggerOrder}`) // prettier-ignore

    console.log("\n`execute trigger order`");
    await expect(
      warehouse.executeTriggerOrder(account.target, triggerOrderIndex0 - 1n, {
        value: minExecutionFee,
      })
    ).to.be.revertedWith("Warehouse: not order keeper");
    await warehouse.setOrderKeeper(other.address, true);
    await warehouse.connect(other).executeTriggerOrder(account.target, triggerOrderIndex0 - 1n, { value: minExecutionFee }); // prettier-ignore
    await executeDecreasePosition(account.target);
    const position1 = await account.getPosition(gmxV1.target, order.path[order.path.length - 1], order.index, order.isLong); // prettier-ignore
    console.log(`- position: ${position1}`);

    console.log("\n`open another position`");
    await account.connect(user).deposit(ethers.ZeroAddress, depositAmount, { value: depositAmount }); // prettier-ignore
    await account.connect(user).createMarketOrders([gmxV1.target], [ { orderType: order.orderType, path: [order.path[0]], index: order.index, collateralAmount: order.collateralAmount, size: order.size, isLong: order.isLong }], { value: minExecutionFee }); // prettier-ignore
    await executeIncreasePosition(account.target);
    const position2 = await account.getPosition(gmxV1.target, order.path[order.path.length - 1], order.index, order.isLong); // prettier-ignore
    console.log(`position: ${position2}`);

    console.log("\n`create another trigger order`");
    await account.connect(user).createTriggerOrder(triggerOrderParam);
    const triggerOrderIndex1 = await warehouse.getTriggerOrderIndex(account.target); // prettier-ignore
    const triggerOrder1 = await warehouse.getTriggerOrder(account.target, triggerOrderIndex1 - 1n); // prettier-ignore
    console.log(`- triggerOrder: ${triggerOrder1}`) // prettier-ignore

    console.log("\n`cancel trigger order`");
    await account.connect(user).cancelTriggerOrder(triggerOrderIndex1 - 1n);
    const triggerOrderIndex2 = await warehouse.getTriggerOrderIndex(account.target); // prettier-ignore
    const triggerOrder2 = await warehouse.getTriggerOrder(account.target, triggerOrderIndex2 - 1n); // prettier-ignore
    console.log(`- triggerOrder: ${triggerOrder2}`) // prettier-ignore

    console.log("\n`create many trigger orders`");
    await account.connect(user).createTriggerOrder(triggerOrderParam);
    await account.connect(user).createTriggerOrder(triggerOrderParam);
    await account.connect(user).createTriggerOrder(triggerOrderParam);
    await account.connect(user).createTriggerOrder(triggerOrderParam);
    await account.connect(user).createTriggerOrder(triggerOrderParam);
    const index = await warehouse.getTriggerOrderIndex(account.target);
    await account.connect(user).cancelTriggerOrder(index - 1n);
    await account.connect(user).cancelTriggerOrder(index - 3n);
    await account.connect(user).cancelTriggerOrder(index - 5n);
    console.log(`trigger orders: ${await warehouse.getTriggerOrders(account.target)}`); // prettier-ignore
    console.log(`trigger orders (active): ${(await warehouse.getTriggerOrders(account.target)).filter(limitOrder => limitOrder.index != ethers.ZeroAddress)}`); // prettier-ignore
  });

  describe("upgradeTo", () => {
    it("sets new implementation to upgrade", async () => {
      const { warehouse } = await loadFixture(deploy);
      const uups = await ethers.deployContract("Warehouse");
      await uups.initialize();
      await warehouse.upgradeTo(uups.target);
    });

    it("reverts when new implementation is not uups", async () => {
      const { warehouse } = await loadFixture(deploy);
      const notUUPS = await ethers.deployContract("Reader");
      await expect(warehouse.upgradeTo(notUUPS.target)).to.be.revertedWith(
        "ERC1967Upgrade: new implementation is not UUPS"
      );
    });

    it("reverts when new implementation is not contract", async () => {
      const { warehouse } = await loadFixture(deploy);
      const newContract = "0x000000000000000000000000000000000000dEaD";
      await expect(warehouse.upgradeTo(newContract)).to.be.reverted;
    });
  });
});
