const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {
  deployAndDepositETH,
  deployAndDepositWBTC,
  deployAndDepositUSDC,
} = require("../fixture/setup");

describe("swap", () => {
  it("eth -> usdc", async () => {
    const { user, account, exchange, ETH, USDC } = await loadFixture(deployAndDepositETH); // prettier-ignore
    expect(await account.getBalance(ETH)).to.be.greaterThan(0);
    expect(await account.getBalance(USDC)).to.be.equal(0);

    const amountIn = await account.getBalance(ETH);
    const amountOut = await exchange.quoteExactInputSingle.staticCall(ETH, USDC, amountIn); // prettier-ignore
    await account.connect(user).swap(ETH, USDC, amountIn);
    expect(await account.getBalance(USDC)).to.be.equal(amountOut);
  });

  it("eth -> wbtc", async () => {
    const { user, account, exchange, ETH, WBTC } = await loadFixture(deployAndDepositETH); // prettier-ignore
    expect(await account.getBalance(ETH)).to.be.greaterThan(0);
    expect(await account.getBalance(WBTC)).to.be.equal(0);

    const amountIn = await account.getBalance(ETH);
    const amountOut = await exchange.quoteExactInputSingle.staticCall(ETH, WBTC, amountIn); // prettier-ignore
    await account.connect(user).swap(ETH, WBTC, amountIn);
    expect(await account.getBalance(WBTC)).to.be.equal(amountOut);
  });

  it("wbtc -> eth", async () => {
    const { user, account, exchange, WBTC, ETH } = await loadFixture(deployAndDepositWBTC); // prettier-ignore
    expect(await account.getBalance(WBTC)).to.be.greaterThan(0);
    expect(await account.getBalance(ETH)).to.be.equal(0);

    const amountIn = await account.getBalance(WBTC);
    const amountOut = await exchange.quoteExactInputSingle.staticCall(WBTC, ETH, amountIn); // prettier-ignore
    await account.connect(user).swap(WBTC, ETH, amountIn);
    expect(await account.getBalance(ETH)).to.be.equal(amountOut);
  });

  it("wbtc -> usdc", async () => {
    const { user, account, exchange, WBTC, USDC } = await loadFixture(deployAndDepositWBTC); // prettier-ignore
    expect(await account.getBalance(WBTC)).to.be.greaterThan(0);
    expect(await account.getBalance(USDC)).to.be.equal(0);

    const amountIn = await account.getBalance(WBTC);
    const amountOut = await exchange.quoteExactInputSingle.staticCall(WBTC, USDC, amountIn); // prettier-ignore
    await account.connect(user).swap(WBTC, USDC, amountIn);
    expect(await account.getBalance(USDC)).to.be.equal(amountOut);
  });

  it("usdc -> eth", async () => {
    const { user, account, exchange, USDC, ETH } = await loadFixture(deployAndDepositUSDC); // prettier-ignore
    expect(await account.getBalance(USDC)).to.be.greaterThan(0);
    expect(await account.getBalance(ETH)).to.be.equal(0);

    const amountIn = await account.getBalance(USDC);
    const amountOut = await exchange.quoteExactInputSingle.staticCall(USDC, ETH, amountIn); // prettier-ignore
    await account.connect(user).swap(USDC, ETH, amountIn);
    expect(await account.getBalance(ETH)).to.be.equal(amountOut);
  });

  it("usdc -> wbtc", async () => {
    const { user, account, exchange, USDC, WBTC } = await loadFixture(deployAndDepositUSDC); // prettier-ignore
    expect(await account.getBalance(USDC)).to.be.greaterThan(0);
    expect(await account.getBalance(WBTC)).to.be.equal(0);

    const amountIn = await account.getBalance(USDC);
    const amountOut = await exchange.quoteExactInputSingle.staticCall(USDC, WBTC, amountIn); // prettier-ignore
    await account.connect(user).swap(USDC, WBTC, amountIn);
    expect(await account.getBalance(WBTC)).to.be.equal(amountOut);
  });
});
