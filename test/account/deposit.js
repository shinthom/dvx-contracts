const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { deploy } = require("../fixture/setup");

describe("deposit", () => {
  it("reverts when depositing 0", async () => {
    const { user, account, ETH } = await loadFixture(deploy);
    await expect(account.connect(user).deposit(ETH, 0)).to.be.revertedWith(
      "Account: ZERO_AMOUNT"
    );
  });

  it("reverts when depositing eth without value", async () => {
    const { user, account, ETH } = await loadFixture(deploy);
    await expect(
      account.connect(user).deposit(ETH, ethers.parseEther("1"))
    ).to.be.revertedWith("Account: INVALID_AMOUNT");
  });

  it("eth", async () => {
    const { user, account, ETH } = await loadFixture(deploy);
    const depositAmount = ethers.parseEther("1");
    await account.connect(user).deposit(ETH, depositAmount, {
      value: depositAmount,
    });
    expect(await account.getBalance(ETH)).to.equal(depositAmount); // prettier-ignore
  });

  it("wbtc", async () => {
    const { user, account, wbtc, WBTC, faucet } = await loadFixture(deploy);

    const depositAmount = ethers.parseUnits("0.1", 8);
    await faucet(WBTC, depositAmount);

    await wbtc.connect(user).approve(account.target, depositAmount);
    await account.connect(user).deposit(WBTC, depositAmount);
    expect(await account.getBalance(WBTC)).to.equal(depositAmount);
  });

  it("usdc", async () => {
    const { user, account, usdc, USDC, faucet } = await loadFixture(deploy);

    const depositAmount = ethers.parseUnits("1000", 6);
    await faucet(USDC, depositAmount);

    await usdc.connect(user).approve(account.target, depositAmount);
    await account.connect(user).deposit(USDC, depositAmount);
    expect(await account.getBalance(USDC)).to.equal(depositAmount);
  });
});
