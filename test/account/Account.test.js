const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy, deployAndDeposit } = require("../fixture/setup");
const axios = require("axios");

// token contracts
const ETH = ethers.ZeroAddress;
const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

describe("Account", async () => {
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

  describe("constructor", async () => {
    const { user, account, exchange } = await loadFixture(deploy);
    expect(await account.owner()).to.be.equal(user.address);
    expect(await account.exchange()).to.be.equal(exchange.target);
  });

  describe("deposit", () => {
    it("reverts when depositing 0", async () => {
      const { account } = await loadFixture(deploy);
      await expect(account.deposit(ETH, 0)).to.be.revertedWith(
        "Account: ZERO_AMOUNT"
      );
    });

    it("reverts when depositing eth without value", async () => {
      const { account } = await loadFixture(deploy);
      await expect(
        account.deposit(ETH, ethers.parseEther("1"))
      ).to.be.revertedWith("Account: INVALID_AMOUNT");
    });

    it("eth", async () => {
      const { user, account } = await loadFixture(deploy);
      const depositAmount = ethers.parseEther("1");
      await account.connect(user).deposit(ETH, depositAmount, {
        value: depositAmount,
      });
      expect(await account.getBalance(ETH)).to.equal(depositAmount); // prettier-ignore
    });

    it("wbtc", async () => {
      const { user, account, wbtc, faucet } = await loadFixture(deploy);
      await faucet(WBTC, ethers.parseEther("1"));
      const depositAmount = await wbtc.balanceOf(user.address);

      await wbtc.connect(user).approve(account.target, depositAmount);
      await account.connect(user).deposit(WBTC, depositAmount);
      expect(await account.getBalance(WBTC)).to.equal(depositAmount);
    });

    it("usdc", async () => {
      const { user, account, usdc, faucet } = await loadFixture(deploy);
      await faucet(USDC, ethers.parseEther("1"));
      const depositAmount = await usdc.balanceOf(user.address);

      await usdc.connect(user).approve(account.target, depositAmount);
      await account.connect(user).deposit(USDC, depositAmount);
      expect(await account.getBalance(USDC)).to.equal(depositAmount);
    });
  });

  describe("withdraw", () => {
    it("reverts when trying to withdraw with no ownership", async () => {
      const { other, account } = await loadFixture(deployAndDeposit);
      await expect(account.connect(other).withdraw(ETH, 0)).to.be.revertedWith(
        "Account: NOT_OWNER"
      );
    });

    it("reverts when withdrawing 0", async () => {
      const { user, account } = await loadFixture(deployAndDeposit);
      await expect(account.connect(user).withdraw(ETH, 0)).to.be.revertedWith(
        "Account: ZERO_AMOUNT"
      );
    });

    it("eth", async () => {
      const { user, account } = await loadFixture(deployAndDeposit);
      const withdrawAmount = account.getBalance(ETH);
      await account.connect(user).withdraw(ETH, withdrawAmount);
      expect(await account.getBalance(ETH)).to.equal(0);
    });

    it("wbtc", async () => {
      const { user, account } = await loadFixture(deployAndDeposit);
      const withdrawAmount = account.getBalance(WBTC);
      await account.connect(user).withdraw(WBTC, withdrawAmount);
      expect(await account.getBalance(WBTC)).to.equal(0);
    });

    it("usdc", async () => {
      const { user, account } = await loadFixture(deployAndDeposit);
      const withdrawAmount = account.getBalance(USDC);
      await account.connect(user).withdraw(USDC, withdrawAmount);
      expect(await account.getBalance(USDC)).to.equal(0);
    });
  });

  describe("swap", () => {
    it("reverts when trying to swap with no ownership", async () => {
      const { other, account } = await loadFixture(deployAndDeposit);
      await expect(account.connect(other).swap(ETH, ETH, 0)).to.be.revertedWith(
        "Account: NOT_OWNER"
      );
    });

    it("reverts when swapping with same tokens", async () => {
      const { user, account } = await loadFixture(deployAndDeposit);
      await expect(account.connect(user).swap(ETH, ETH, 0)).to.be.revertedWith(
        "Account: SAME_TOKEN"
      );
    });

    it("eth -> wbtc", async () => {
      const { user, account } = await loadFixture(deployAndDeposit);
      const fromAmount = await account.getBalance(ETH);
      const toAmount = await account.getBalance(WBTC);
      await account.connect(user).swap(ETH, WBTC, fromAmount);
      expect(await account.getBalance(ETH)).to.equal(0);
      expect(await account.getBalance(WBTC)).to.be.greaterThan(toAmount);
    });

    it("eth -> usdc", async () => {
      const { user, account } = await loadFixture(deployAndDeposit);
      const fromAmount = await account.getBalance(ETH);
      const toAmount = await account.getBalance(USDC);
      await account.connect(user).swap(ETH, USDC, fromAmount);
      expect(await account.getBalance(ETH)).to.equal(0);
      expect(await account.getBalance(USDC)).to.be.greaterThan(toAmount);
    });

    it("wbtc -> eth", async () => {
      const { user, account } = await loadFixture(deployAndDeposit);
      const fromAmount = await account.getBalance(WBTC);
      const toAmount = await account.getBalance(ETH);
      await account.connect(user).swap(WBTC, ETH, fromAmount);
      expect(await account.getBalance(WBTC)).to.equal(0);
      expect(await account.getBalance(ETH)).to.be.greaterThan(toAmount);
    });

    it("wbtc -> usdc", async () => {
      const { user, account } = await loadFixture(deployAndDeposit);
      const fromAmount = await account.getBalance(WBTC);
      const toAmount = await account.getBalance(USDC);
      await account.connect(user).swap(WBTC, USDC, fromAmount);
      expect(await account.getBalance(WBTC)).to.equal(0);
      expect(await account.getBalance(USDC)).to.be.greaterThan(toAmount);
    });

    it("usdc -> eth", async () => {
      const { user, account } = await loadFixture(deployAndDeposit);
      const fromAmount = await account.getBalance(WBTC);
      const toAmount = await account.getBalance(ETH);
      await account.connect(user).swap(WBTC, ETH, fromAmount);
      expect(await account.getBalance(WBTC)).to.equal(0);
      expect(await account.getBalance(ETH)).to.be.greaterThan(toAmount);
    });

    it("usdc -> wbtc", async () => {
      const { user, account } = await loadFixture(deployAndDeposit);
      const fromAmount = await account.getBalance(USDC);
      const toAmount = await account.getBalance(WBTC);
      await account.connect(user).swap(USDC, WBTC, fromAmount);
      expect(await account.getBalance(USDC)).to.equal(0);
      expect(await account.getBalance(WBTC)).to.be.greaterThan(toAmount);
    });
  });
});
