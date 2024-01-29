const { ethers } = require("hardhat");
const { expect } = require("chai");
const { faucet, WETH, WBTC } = require("./helper");

describe("Account", () => {
  let owner;
  let other;

  let weth;

  let logger;
  let exchangeMock;
  let account;

  beforeEach(async () => {
    [owner, other] = await ethers.getSigners();

    weth = await ethers.getContractAt("IERC20", WETH);

    logger = await ethers.deployContract("Logger", []);
    exchangeMock = await ethers.deployContract(
      "ExchangeMock",
      [logger.target],
      owner
    );
    account = await ethers.deployContract("Account", [
      owner.address,
      exchangeMock.target,
    ]);
  });

  describe("deposit", () => {
    const token = WETH;
    const tokenAmount = ethers.parseUnits("1", 18);

    beforeEach(async () => {
      await faucet(owner, token, tokenAmount);
    });

    it("reverts when msg.sender is not owner", async () => {
      await expect(
        account.connect(other).deposit(token, tokenAmount)
      ).to.be.revertedWith("msg.sender: not owner");
    });

    it("reverts when amount is zero", async () => {
      await weth.approve(account.target, tokenAmount);
      await expect(account.connect(owner).deposit(WETH, 0)).to.be.revertedWith(
        "amount: zero"
      );
    });

    it("successfully deposits", async () => {
      await weth.approve(account.target, tokenAmount);
      await expect(account.connect(owner).deposit(token, tokenAmount))
        .to.emit(logger, "Deposited")
        .withArgs(account.target, token, tokenAmount);
      await expect(await account.getBalance(token)).to.be.equal(tokenAmount);
    });
  });

  describe("withdraw", async () => {
    const token = WETH;
    const tokenAmount = ethers.parseUnits("1", 18);

    beforeEach(async () => {
      await faucet(owner, token, tokenAmount);
      await weth.approve(account.target, tokenAmount);
      await account.connect(owner).deposit(token, tokenAmount);
    });

    it("reverts when msg.sender is not owner", async () => {
      await expect(
        account.connect(other).withdraw(token, tokenAmount)
      ).to.be.revertedWith("msg.sender: not owner");
    });

    it("reverts when amount is zero", async () => {
      await expect(
        account.connect(owner).withdraw(token, 0)
      ).to.be.revertedWith("amount: zero");
    });

    it("reverts when amount is greater than withdrawable balance", async () => {
      await expect(
        account.connect(owner).withdraw(token, tokenAmount + 1n)
      ).to.be.revertedWith("amount: greater than withdrawable balance");
    });

    it("successfully withdraws", async () => {
      await expect(await account.getBalance(token)).to.be.equal(tokenAmount);
      await expect(account.connect(owner).withdraw(token, tokenAmount))
        .to.emit(logger, "Withdrawn")
        .withArgs(account.target, token, tokenAmount);
      await expect(await account.getBalance(token)).to.be.equal(0);
    });
  });

  describe("swap", () => {
    const token = WETH;
    const tokenAmount = ethers.parseUnits("1", 18);

    const expectedAmountOut = 100n;

    beforeEach(async () => {
      await faucet(owner, token, tokenAmount);
      await weth.approve(account.target, tokenAmount);
      await account.connect(owner).deposit(token, tokenAmount);

      const swapper = await ethers.deployContract("Swapper", []);
      await exchangeMock.setSwapper(swapper.target);
    });

    it("reverts when msg.sender is not owner", async () => {
      await expect(
        account.connect(other).swap(WETH, WBTC, tokenAmount)
      ).to.be.revertedWith("msg.sender: not owner");
    });

    it("reverts when amountIn is greater than withdrawable balance", async () => {
      await expect(
        account.connect(owner).swap(WETH, WBTC, tokenAmount + 1n)
      ).to.be.revertedWith("amountIn: greater than withdrawable balance");
    });

    it("successfully swaps", async () => {
      await expect(await account.getBalance(token)).to.be.equal(tokenAmount);
      await expect(account.connect(owner).swap(WETH, WBTC, tokenAmount))
        .to.emit(logger, "Swapped")
        .withArgs(account.target, WETH, WBTC, tokenAmount, expectedAmountOut);
      await expect(await account.getBalance(token)).to.be.equal(0);
    });
  });

  // The tests for orders are located in the 'test/e2e' directory.
});
