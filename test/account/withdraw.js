const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { deploy } = require("../fixture/setup");

describe("withdraw", () => {
  it("reverts when trying to withdraw with no ownership", async () => {
    const { other, account, ETH } = await loadFixture(deploy);
    await expect(account.connect(other).withdraw(ETH, 0)).to.be.revertedWith(
      "Account: NOT_OWNER"
    );
  });

  it("reverts when withdrawing 0", async () => {
    const { user, account, ETH } = await loadFixture(deploy);
    await expect(account.connect(user).withdraw(ETH, 0)).to.be.revertedWith(
      "Account: ZERO_AMOUNT"
    );
  });

  it("eth", async () => {
    const { user, account, ETH } = await loadFixture(deploy);
    const depositAmount = ethers.parseEther("1");
    await account.connect(user).deposit(ETH, depositAmount, {
      value: depositAmount,
    });

    const withdrawAmount = account.getBalance(ETH);
    await account.connect(user).withdraw(ETH, withdrawAmount);
    expect(await account.getBalance(ETH)).to.equal(0);
  });

  it("wbtc", async () => {
    const { user, account, wbtc, WBTC, faucet } = await loadFixture(deploy);

    const depositAmount = ethers.parseUnits("0.1", 8);
    await faucet(WBTC, depositAmount);

    await wbtc.connect(user).approve(account.target, depositAmount);
    await account.connect(user).deposit(WBTC, depositAmount);
    expect(await account.getBalance(WBTC)).to.equal(depositAmount);

    const withdrawAmount = account.getBalance(WBTC);
    await account.connect(user).withdraw(WBTC, withdrawAmount);
    expect(await account.getBalance(WBTC)).to.equal(0);
  });

  it("usdc", async () => {
    const { user, account, usdc, USDC, faucet } = await loadFixture(deploy);

    const depositAmount = ethers.parseUnits("1000", 6);
    await faucet(USDC, depositAmount);

    await usdc.connect(user).approve(account.target, depositAmount);
    await account.connect(user).deposit(USDC, depositAmount);
    expect(await account.getBalance(USDC)).to.equal(depositAmount);

    const withdrawAmount = account.getBalance(USDC);
    await account.connect(user).withdraw(USDC, withdrawAmount);
    expect(await account.getBalance(USDC)).to.equal(0);
  });
});
