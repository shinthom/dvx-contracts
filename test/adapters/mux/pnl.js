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
        printPosition,
        fillPositionOrder,
        replaceOracleReferenceAndSetPrice,
      } = await loadFixture(deploy);
      const collateral = WETH;
      const index = WETH;
      const collateralAmount = ethers.parseEther("1");
      const size = ethers.parseEther("10");
      const isLong = true;
      await account.deposit(ETH, collateralAmount, { value: collateralAmount });
      {
        console.log("`deposit`");
        await checkBalance(account);
      }
      var price = ethers.parseUnits("2000", 8);
      await replaceOracleReferenceAndSetPrice(WETH, price);
      const positionOrder = await mux.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders([mux.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }]); // prettier-ignore
      await fillPositionOrder();
      {
        console.log("`increasePosition`");
        await checkBalance(account);
        await printPosition(mux.target, collateral, index, isLong);
      }
      await account.deposit(ETH, collateralAmount, { value: collateralAmount });
      {
        console.log("`deposit`");
        await checkBalance(account);
      }
      var price = ethers.parseUnits("2200", 8); // pnl +10%
      await replaceOracleReferenceAndSetPrice(WETH, price);
      await account.connect(user).createMarketOrders([mux.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }]); // prettier-ignore
      await fillPositionOrder();
      {
        console.log("`increasePosition`");
        await checkBalance(account);
        await printPosition(mux.target, collateral, index, isLong);
      }
    });

    it("eth -> eth: long, increaseCollateral", async () => {
      const {
        mux,
        user,
        account,
        ETH,
        WETH,
        orderType,
        checkBalance,
        printPosition,
        fillPositionOrder,
        replaceOracleReferenceAndSetPrice,
      } = await loadFixture(deploy);
      const collateral = WETH;
      const index = WETH;
      const collateralAmount = ethers.parseEther("1");
      const size = ethers.parseEther("10");
      const isLong = true;
      await account.deposit(ETH, collateralAmount, { value: collateralAmount });
      {
        console.log("`deposit`");
        await checkBalance(account);
      }
      var price = ethers.parseUnits("2000", 8);
      await replaceOracleReferenceAndSetPrice(WETH, price);
      const positionOrder = await mux.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders([mux.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }]); // prettier-ignore
      await fillPositionOrder();
      {
        console.log("`increasePosition`");
        await checkBalance(account);
        await printPosition(mux.target, collateral, index, isLong);
      }
      await account.deposit(ETH, collateralAmount, { value: collateralAmount });
      {
        console.log("`deposit`");
        await checkBalance(account);
      }
      var price = ethers.parseUnits("2200", 8); // pnl +10%
      await replaceOracleReferenceAndSetPrice(WETH, price);
      await account.connect(user).createMarketOrders(
        [mux.target],
        [
          {
            orderType: orderType.increaseCollateral,
            path: [collateral],
            index: index,
            collateralAmount: collateralAmount,
            size: 0,
            isLong: isLong,
          },
        ]
      );
      {
        console.log("`increaseCollateral`");
        await checkBalance(account);
        await printPosition(mux.target, collateral, index, isLong);
      }
    });

    it("eth -> eth: long, decreaseCollateral", async () => {
      const {
        mux,
        user,
        account,
        ETH,
        WETH,
        orderType,
        checkBalance,
        printPosition,
        fillPositionOrder,
        fillWithdrawalOrder,
        replaceOracleReferenceAndSetPrice,
      } = await loadFixture(deploy);
      const collateral = WETH;
      const index = WETH;
      const collateralAmount = ethers.parseEther("1");
      const size = ethers.parseEther("10");
      const isLong = true;
      await account.deposit(ETH, collateralAmount, { value: collateralAmount });
      {
        console.log("`deposit`");
        await checkBalance(account);
      }
      var price = ethers.parseUnits("2000", 8);
      await replaceOracleReferenceAndSetPrice(WETH, price);
      const positionOrder = await mux.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders([mux.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }]); // prettier-ignore
      await fillPositionOrder();
      {
        console.log("`increasePosition`");
        await checkBalance(account);
        await printPosition(mux.target, collateral, index, isLong);
      }
      var price = ethers.parseUnits("2200", 8); // pnl +10%
      await replaceOracleReferenceAndSetPrice(WETH, price);
      await account.connect(user).createMarketOrders(
        [mux.target],
        [
          {
            orderType: orderType.decreaseCollateral,
            path: [collateral],
            index: index,
            collateralAmount: collateralAmount / 2n,
            size: 0,
            isLong: isLong,
          },
        ]
      );
      await fillWithdrawalOrder();
      {
        console.log("`decreaseCollateral`");
        await checkBalance(account);
        await printPosition(mux.target, collateral, index, isLong);
      }
    });

    it("eth -> eth: long, decreasePosition", async () => {
      const {
        mux,
        user,
        account,
        ETH,
        WETH,
        orderType,
        checkBalance,
        printPosition,
        fillPositionOrder,
        replaceOracleReferenceAndSetPrice,
      } = await loadFixture(deploy);
      const collateral = WETH;
      const index = WETH;
      const collateralAmount = ethers.parseEther("1");
      const size = ethers.parseEther("10");
      const isLong = true;
      await account.deposit(ETH, collateralAmount, { value: collateralAmount });
      {
        console.log("`deposit`");
        await checkBalance(account);
      }
      var price = ethers.parseUnits("2000", 8);
      await replaceOracleReferenceAndSetPrice(WETH, price);
      const positionOrder = await mux.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders([mux.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }]); // prettier-ignore
      await fillPositionOrder();
      {
        console.log("`increasePosition`");
        await checkBalance(account);
        await printPosition(mux.target, collateral, index, isLong);
      }
      var price = ethers.parseUnits("2200", 8); // pnl +10%
      await replaceOracleReferenceAndSetPrice(WETH, price);
      const position = await account.getPosition(mux.target, collateral, index, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders(
        [mux.target],
        [
          {
            orderType: orderType.decreasePosition,
            path: [collateral],
            index: index,
            collateralAmount: 0,
            size: position.size,
            isLong: isLong,
          },
        ]
      );
      await fillPositionOrder();
      {
        console.log("`decreasePosition`");
        await checkBalance(account);
        await printPosition(mux.target, collateral, index, isLong);
      }
    });

    it("btc -> eth: long, decreasePosition", async () => {
      const {
        mux,
        user,
        account,
        WETH,
        WBTC,
        orderType,
        checkBalance,
        printPosition,
        fillPositionOrder,
        replaceOracleReferenceAndSetPrice,
      } = await loadFixture(deployAndDepositWBTC);
      const collateral = WBTC;
      const index = WETH;
      const collateralAmount = await account.getBalance(WBTC);
      const size = ethers.parseEther("10");
      const isLong = true;
      {
        console.log("`deposit`");
        await checkBalance(account);
      }
      var price = ethers.parseUnits("2000", 8);
      await replaceOracleReferenceAndSetPrice(WETH, price);
      const positionOrder = await mux.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders([mux.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }]); // prettier-ignore
      await fillPositionOrder();
      {
        console.log("`increasePosition`");
        await checkBalance(account);
        await printPosition(mux.target, collateral, index, isLong);
      }
      var price = ethers.parseUnits("2200", 8); // pnl +10%
      await replaceOracleReferenceAndSetPrice(WETH, price);
      const position = await account.getPosition(mux.target, collateral, index, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders(
        [mux.target],
        [
          {
            orderType: orderType.decreasePosition,
            path: [collateral],
            index: index,
            collateralAmount: 0,
            size: position.size,
            isLong: isLong,
          },
        ]
      );
      await fillPositionOrder();
      {
        console.log("`decreasePosition`");
        await checkBalance(account);
        await printPosition(mux.target, collateral, index, isLong);
      }
    });

    it("btc -> eth: short, decreasePosition", async () => {
      const {
        mux,
        user,
        account,
        WETH,
        WBTC,
        orderType,
        checkBalance,
        printPosition,
        fillPositionOrder,
        replaceOracleReferenceAndSetPrice,
      } = await loadFixture(deployAndDepositWBTC);
      const collateral = WBTC;
      const index = WETH;
      const collateralAmount = await account.getBalance(WBTC);
      const size = ethers.parseEther("10");
      const isLong = false;
      {
        console.log("`deposit`");
        await checkBalance(account);
      }
      var price = ethers.parseUnits("2000", 8);
      await replaceOracleReferenceAndSetPrice(WETH, price);
      const positionOrder = await mux.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders([mux.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }]); // prettier-ignore
      await fillPositionOrder();
      {
        console.log("`increasePosition`");
        await checkBalance(account);
        await printPosition(mux.target, collateral, index, isLong);
      }
      var price = ethers.parseUnits("1800", 8); // pnl +10%
      await replaceOracleReferenceAndSetPrice(WETH, price);
      const position = await account.getPosition(mux.target, collateral, index, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders(
        [mux.target],
        [
          {
            orderType: orderType.decreasePosition,
            path: [collateral],
            index: index,
            collateralAmount: 0,
            size: position.size,
            isLong: isLong,
          },
        ]
      );
      await fillPositionOrder();
      {
        console.log("`decreasePosition`");
        await checkBalance(account);
        await printPosition(mux.target, collateral, index, isLong);
      }
    });
  });

  it("btc -> eth: short, decreasePosition", async () => {
    const {
      mux,
      user,
      account,
      WETH,
      WBTC,
      orderType,
      checkBalance,
      printPosition,
      fillPositionOrder,
      fillWithdrawalOrder,
      replaceOracleReferenceAndSetPrice,
    } = await loadFixture(deployAndDepositWBTC);
    const collateral = WBTC;
    const index = WETH;
    const collateralAmount = await account.getBalance(WBTC);
    const size = ethers.parseEther("10");
    const isLong = false;
    {
      console.log("`deposit`");
      await checkBalance(account);
    }
    var price = ethers.parseUnits("2000", 8);
    await replaceOracleReferenceAndSetPrice(WETH, price);
    const positionOrder = await mux.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
    await account.connect(user).createMarketOrders([mux.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }]); // prettier-ignore
    await fillPositionOrder();
    {
      console.log("`increasePosition`");
      await checkBalance(account);
      await printPosition(mux.target, collateral, index, isLong);
    }
    var price = ethers.parseUnits("1800", 8); // pnl +10%
    await replaceOracleReferenceAndSetPrice(WETH, price);
    const position = await account.getPosition(mux.target, collateral, index, isLong); // prettier-ignore
    await account.connect(user).createMarketOrders(
      [mux.target],
      [
        {
          orderType: orderType.decreaseCollateral,
          path: [collateral],
          index: index,
          collateralAmount: collateralAmount / 2n,
          size: 0,
          isLong: isLong,
        },
      ]
    );
    await fillWithdrawalOrder();
    {
      console.log("`decreaseCollateral`");
      await checkBalance(account);
      await printPosition(mux.target, collateral, index, isLong);
    }
  });
});
