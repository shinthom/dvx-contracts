const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture/setup");

describe("MUX", () => {
  // token contracts
  const WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
  const USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
  const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

  const wethPrice = ethers.parseUnits("2000", 18);
  const wbtcPrice = ethers.parseUnits("40000", 18);
  const usdcPrice = ethers.parseUnits("1", 18);

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
      const { mux, fillPositionOrder } = await loadFixture(deploy);
      const positionOrder = await mux.makePositionOrder(
        WETH,
        WETH,
        ethers.parseEther("1"),
        10n,
        true,
        wethPrice,
        wethPrice
      );
      await mux.increasePosition(
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
      const { mux, fillPositionOrder, updateFundingState } = await loadFixture(
        deploy
      );
      const positionOrder = await mux.makePositionOrder(
        WETH,
        WETH,
        ethers.parseEther("1"),
        10n,
        true,
        wethPrice,
        wethPrice
      );
      await mux.increasePosition(
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

  describe("make order", () => {
    const leverage = 10n;

    it("eth -> eth", async () => {
      const { mux } = await loadFixture(deploy);

      const collateralPrice = 2000n;
      const indexPrice = 2000n;

      const order = await mux.makePositionOrder(
        WETH,
        WETH,
        ethers.parseEther("1"),
        leverage,
        true,
        collateralPrice,
        indexPrice
      );
      console.log(order);
    });

    it("usdc -> eth", async () => {
      const { mux } = await loadFixture(deploy);

      const collateralPrice = 1n;
      const indexPrice = 2000n;

      const order = await mux.makePositionOrder(
        USDC,
        WETH,
        ethers.parseUnits("100", 6),
        leverage,
        true,
        collateralPrice,
        indexPrice
      );
      console.log(order);
    });

    it("wbtc -> eth", async () => {
      const { mux } = await loadFixture(deploy);

      const collateralPrice = 40000n;
      const indexPrice = 2000n;

      const order = await mux.makePositionOrder(
        WBTC,
        WETH,
        ethers.parseUnits("1", 8),
        leverage,
        true,
        collateralPrice,
        indexPrice
      );
      console.log(order);
    });

    it("eth -> wbtc", async () => {
      const { mux } = await loadFixture(deploy);

      const collateralPrice = 2000n;
      const indexPrice = 40000n;

      const order = await mux.makePositionOrder(
        WETH,
        WBTC,
        ethers.parseEther("1"),
        leverage,
        true,
        collateralPrice,
        indexPrice
      );
      console.log(order);
    });

    it("usdc -> wbtc", async () => {
      const { mux } = await loadFixture(deploy);

      const collateralPrice = 1n;
      const indexPrice = 40000n;

      const order = await mux.makePositionOrder(
        USDC,
        WBTC,
        ethers.parseUnits("100", 6),
        leverage,
        true,
        collateralPrice,
        indexPrice
      );
      console.log(order);
    });

    it("wbtc -> wbtc", async () => {
      const { mux } = await loadFixture(deploy);

      const collateralPrice = 40000n;
      const indexPrice = 40000n;

      const order = await mux.makePositionOrder(
        WBTC,
        WBTC,
        ethers.parseUnits("1", 8),
        leverage,
        true,
        collateralPrice,
        indexPrice
      );
      console.log(order);
    });
  });
});
