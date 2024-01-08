const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture/setup");

describe("swap", () => {
  const ethAmount = ethers.parseEther("1");
  const wbtcAmount = ethers.parseUnits("0.1", 8);
  const usdcAmount = ethers.parseUnits("1000", 6);

  it("reverts when trying to swap with no ownership", async () => {
    const { other, account, ETH } = await loadFixture(deploy);
    await expect(account.connect(other).swap(ETH, ETH, 0)).to.be.revertedWith(
      "Account: NOT_OWNER"
    );
  });

  it("reverts when swapping with same tokens", async () => {
    const { user, account, ETH } = await loadFixture(deploy);
    await expect(account.connect(user).swap(ETH, ETH, 0)).to.be.revertedWith(
      "Account: SAME_TOKEN"
    );
  });

  it("eth -> usdc", async () => {
    const { user, account, exchange, ETH, USDC } = await loadFixture(deploy); // prettier-ignore

    await account.deposit(ETH, ethAmount, { value: ethAmount });

    const expectedAmount = await exchange.quoteExactInputSingle.staticCall(ETH, USDC, ethAmount); // prettier-ignore
    await account.connect(user).swap(ETH, USDC, ethAmount);
    expect(await account.getBalance(USDC)).to.be.equal(expectedAmount);
  });

  it("eth -> wbtc", async () => {
    const { user, account, exchange, ETH, WBTC } = await loadFixture(deploy); // prettier-ignore

    await account.deposit(ETH, ethAmount, { value: ethAmount });

    const expectedAmount = await exchange.quoteExactInputSingle.staticCall(ETH, WBTC, ethAmount); // prettier-ignore
    await account.connect(user).swap(ETH, WBTC, ethAmount);
    expect(await account.getBalance(WBTC)).to.be.equal(expectedAmount);
  });

  it("wbtc -> eth", async () => {
    const { user, account, exchange, ETH, WBTC, wbtc, faucet } = await loadFixture(deploy); // prettier-ignore

    await faucet(WBTC, wbtcAmount);
    await wbtc.connect(user).approve(account.target, wbtcAmount);
    await account.connect(user).deposit(WBTC, wbtcAmount);

    const expectedAmount = await exchange.quoteExactInputSingle.staticCall(WBTC, ETH, wbtcAmount); // prettier-ignore
    await account.connect(user).swap(WBTC, ETH, wbtcAmount);
    expect(await account.getBalance(ETH)).to.be.equal(expectedAmount);
  });

  it("wbtc -> usdc", async () => {
    const { user, account, exchange, WBTC, USDC, wbtc, faucet } = await loadFixture(deploy); // prettier-ignore

    await faucet(WBTC, wbtcAmount);
    await wbtc.connect(user).approve(account.target, wbtcAmount);
    await account.connect(user).deposit(WBTC, wbtcAmount);

    const expectedAmount = await exchange.quoteExactInputSingle.staticCall(WBTC, USDC, wbtcAmount); // prettier-ignore
    await account.connect(user).swap(WBTC, USDC, wbtcAmount);
    expect(await account.getBalance(USDC)).to.be.equal(expectedAmount);
  });

  it("usdc -> eth", async () => {
    const { user, account, exchange, ETH, USDC, usdc, faucet } = await loadFixture(deploy); // prettier-ignore

    await faucet(USDC, usdcAmount);
    await usdc.connect(user).approve(account.target, usdcAmount);
    await account.connect(user).deposit(USDC, usdcAmount);

    const expectedAmount = await exchange.quoteExactInputSingle.staticCall(USDC, ETH, usdcAmount); // prettier-ignore
    await account.connect(user).swap(USDC, ETH, usdcAmount);
    expect(await account.getBalance(ETH)).to.be.equal(expectedAmount);
  });

  it("usdc -> wbtc", async () => {
    const { user, account, exchange, USDC, WBTC, usdc, faucet } = await loadFixture(deploy); // prettier-ignore

    await faucet(USDC, usdcAmount);
    await usdc.connect(user).approve(account.target, usdcAmount);
    await account.connect(user).deposit(USDC, usdcAmount);

    const expectedAmount = await exchange.quoteExactInputSingle.staticCall(USDC, WBTC, usdcAmount); // prettier-ignore
    await account.connect(user).swap(USDC, WBTC, usdcAmount);
    expect(await account.getBalance(WBTC)).to.be.equal(expectedAmount);
  });
});
