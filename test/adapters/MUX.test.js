const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {
  deploy,
  deployAndDepositETH,
  deployAndDepositWBTC,
  deployAndDepositUSDC,
} = require("../fixture/setup");

describe("MUX", () => {
  // token contracts
  const WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
  const USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
  const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

  const wethPrice = ethers.parseUnits("2000", 18);
  const wbtcPrice = ethers.parseUnits("40000", 18);
  const usdcPrice = ethers.parseUnits("1", 18);

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

  describe("values", async () => {
    it("getPrice", async () => {
      const { mux } = await loadFixture(deploy);
      console.log(await mux.getPrice(WETH, wethPrice, true));
      console.log(await mux.getPrice(WETH, wethPrice, false));
      console.log(await mux.getPrice(WBTC, wbtcPrice, true));
      console.log(await mux.getPrice(WBTC, wbtcPrice, false));
      console.log(await mux.getPrice(USDC, usdcPrice, true));
      console.log(await mux.getPrice(USDC, usdcPrice, false));
    });

    it("deposit fee", async () => {
      const { mux } = await loadFixture(deploy);
      const positionOrder = await mux.makePositionOrder(
        WETH,
        WETH,
        ethers.parseEther("1"),
        10n,
        true,
        wethPrice,
        wethPrice
      );
      expect(
        await mux.getDepositFee(mux.target, {
          orderType: positionOrder.orderType,
          path: [...positionOrder.path],
          index: positionOrder.index,
          collateralAmount: positionOrder.collateralAmount,
          size: positionOrder.size,
          isLong: positionOrder.isLong,
        })
      ).to.be.equal(0);
    });

    it("position fee", async () => {
      const { user, mux, fillPositionOrder } = await loadFixture(deploy);
      const positionOrder = await mux.makePositionOrder(
        WETH,
        WETH,
        ethers.parseEther("1"),
        10n,
        true,
        wethPrice,
        wethPrice
      );
      await mux
        .connect(user)
        .increasePosition(
          [...positionOrder.path],
          positionOrder.index,
          positionOrder.collateralAmount,
          positionOrder.size,
          positionOrder.isLong,
          {
            value: positionOrder.collateralAmount,
          }
        );
      await fillPositionOrder();

      const position = await mux.getPosition(mux.target, WETH, WETH, true);
      const positionFee = await mux.getPositionFee(WETH, wethPrice, positionOrder.size); // prettier-ignore
      expect(
        ((positionOrder.collateralAmount - position.collateralAmount) *
          wethPrice) /
          10n ** 18n
      ).to.be.equal(positionFee);
    });

    it("funding fee", async () => {
      const { user, mux, fillPositionOrder, updateFundingState } =
        await loadFixture(deploy);
      const positionOrder = await mux.makePositionOrder(
        WETH,
        WETH,
        ethers.parseEther("1"),
        10n,
        true,
        wethPrice,
        wethPrice
      );
      await mux
        .connect(user)
        .increasePosition(
          [...positionOrder.path],
          positionOrder.index,
          positionOrder.collateralAmount,
          positionOrder.size,
          positionOrder.isLong,
          {
            value: positionOrder.collateralAmount,
          }
        );
      await fillPositionOrder();

      const position = await mux.getPosition(mux.target, WETH, WETH, true);
      expect(
        await mux.getFundingFee(
          WETH,
          WETH,
          position.size,
          position.fundingRate,
          true,
          wethPrice
        )
      ).to.be.equal(0n);

      await updateFundingState();
      expect(
        await mux.getFundingFee(
          WETH,
          WETH,
          position.size,
          position.fundingRate,
          true,
          wethPrice
        )
      ).to.be.gt(0n);
    });
  });
});
