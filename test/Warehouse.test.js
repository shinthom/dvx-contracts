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
  const orderState = {
    ACTIVE: 1,
    EXECUTED: 2,
    CANCELED: 3,
  };

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

  describe("limit order", () => {
    it("scenario", async () => {
      const { account, warehouse, quoter, gmxV1, mux } = await loadFixture(
        deploy
      );

      expect(await warehouse.totalLimitOrders()).to.be.equal(0);
      const limitOrder = {
        collateral: WETH,
        index: WETH,
        collateralAmount: ethers.parseEther("0.1"),
        leverage: 10n,
        isLong: true,
        price: ethers.parseUnits("2000", 18),
      };
      await account.createLimitOrder(limitOrder);
      expect(await warehouse.totalLimitOrders()).to.be.equal(1);

      const orderId = 0;
      const createdLimitOrder = await warehouse.getLimitOrder(orderId);
      const gmxOrder = {
        collateral: createdLimitOrder.collateral,
        index: createdLimitOrder.index,
        collateralAmount: createdLimitOrder.collateralAmount,
        leverage: createdLimitOrder.leverage,
        isLong: createdLimitOrder.isLong,
        collateralPrice: 0,
        indexPrice: 0,
      };
      const muxOrder = {
        collateral: createdLimitOrder.collateral,
        index: createdLimitOrder.index,
        collateralAmount: createdLimitOrder.collateralAmount,
        leverage: createdLimitOrder.leverage,
        isLong: createdLimitOrder.isLong,
        collateralPrice: wethPrice,
        indexPrice: wethPrice,
      };
      const orders = [gmxOrder, muxOrder];
      const answers = await quoter.quote(
        account.target,
        [gmxV1.target, mux.target],
        orders
      );
      const positionOrder = await mux.makePositionOrder(
        ...Object.values(muxOrder)
      );

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
      const answer = toObj(answers[0]);
      await warehouse.executeLimitOrder(account.target, 0, [answer]);

      expect(await warehouse.totalLimitOrders()).to.be.equal(1);
      await account.createLimitOrder(limitOrder);
      expect(await warehouse.totalLimitOrders()).to.be.equal(2);
      expect((await warehouse.limitOrders(1)).status).to.be.equal(orderState.ACTIVE); // prettier-ignore
      await account.cancelLimitOrder(1);
      expect((await warehouse.limitOrders(1)).status).to.be.equal(orderState.CANCELED); // prettier-ignore
    });
  });

  // describe("trigger order", () => {
  //   it("scenario", async () => {
  //     const {
  //       account,
  //       gmxV1,
  //       weth,
  //       warehouse,
  //       executeIncreasePosition,
  //       executeDecreasePosition,
  //     } = await loadFixture(deploy);

  //     const depositAmount = ethers.parseEther("1");
  //     const leverage = 10n;
  //     await account.deposit(ethers.ZeroAddress, depositAmount, {
  //       value: depositAmount,
  //     });
  //     const balance = await account.getBalance(ethers.ZeroAddress);
  //     const order = await gmxV1.makePositionOrder(weth.target, weth.target, balance, leverage, true, 0, 0); // prettier-ignore
  //     await account.createMarketOrders(
  //       [gmxV1.target],
  //       [
  //         {
  //           orderType: order.orderType,
  //           path: [order.path[0]],
  //           index: order.index,
  //           collateralAmount: order.collateralAmount,
  //           size: order.size,
  //           isLong: order.isLong,
  //         },
  //       ],
  //       {
  //         value: minExecutionFee,
  //       }
  //     );
  //     await executeIncreasePosition(account.target);

  //     expect(await warehouse.totalTriggerOrders()).to.be.equal(0);
  //     const triggerOrder = {
  //       account: account.target,
  //       adapter: gmxV1.target,
  //       collateral: WETH,
  //       index: WETH,
  //       isLong: true,
  //       price: ethers.parseUnits("2000", 18),
  //     };
  //     await account.createTriggerOrder(triggerOrder);
  //     expect(await warehouse.totalTriggerOrders()).to.be.equal(1);

  //     const registeredTriggerOrder = (await warehouse.getTriggerOrder(0))[2];
  //     console.log(registeredTriggerOrder);

  //     const beforePosition = await account.getPosition(
  //       gmxV1.target,
  //       order.path[order.path.length - 1],
  //       order.index,
  //       order.isLong
  //     );
  //     console.log(`position: ${beforePosition}`);
  //     await warehouse.executeTriggerOrder(account.target, 0, {
  //       value: minExecutionFee,
  //     });
  //     await executeDecreasePosition(account.target);
  //     const afterPosition = await account.getPosition(
  //       gmxV1.target,
  //       order.path[order.path.length - 1],
  //       order.index,
  //       order.isLong
  //     );
  //     console.log(`position: ${afterPosition}`);
  //   });
  // });
});
