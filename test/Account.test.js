const { ethers } = require("hardhat");
const { expect } = require("chai");
const { faucet } = require("./helper/index");

describe("Account", () => {
  const ETH = ethers.ZeroAddress;
  const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

  let user;
  let other;

  let exchangeMock;
  let account;
  let wbtc;

  beforeEach(async () => {
    [user, other] = await ethers.getSigners();

    exchangeMock = await ethers.deployContract("ExchangeMock", [], user);
    account = await ethers.deployContract(
      "Account",
      [user.address, exchangeMock.target],
      user
    );
    wbtc = await ethers.getContractAt("IERC20", WBTC);
  });

  describe("deposit", () => {
    const depositAmount = ethers.parseUnits("1", 18);

    it("reverts when zero amount", async () => {
      await expect(account.connect(user).deposit(ETH, 0)).to.be.revertedWith(
        "amount: zero"
      );
    });

    it("reverts when not owner", async () => {
      await expect(
        account.connect(other).deposit(ETH, depositAmount)
      ).to.be.revertedWith("msg.sender: not owner");
    });

    it("reverts when amount is not exact", async () => {
      await expect(
        account.connect(user).deposit(ETH, depositAmount)
      ).to.be.revertedWith("amount: not exact");
    });

    it("deposits ETH", async () => {
      await expect(
        account
          .connect(user)
          .deposit(ETH, depositAmount, { value: depositAmount })
      )
        .to.emit(account, "Deposited")
        .withArgs(account.target, ETH, depositAmount);
      expect(await account.getBalance(ETH)).to.be.equal(depositAmount);
    });

    it("deposits token", async () => {
      await faucet(user.address, WBTC, depositAmount);
      await wbtc.connect(user).approve(account.target, depositAmount);
      await expect(account.connect(user).deposit(WBTC, depositAmount))
        .to.emit(account, "Deposited")
        .withArgs(account.target, WBTC, depositAmount);
      expect(await account.getBalance(WBTC)).to.be.equal(depositAmount);
    });
  });

  describe("withdraw", () => {
    const withdrawAmount = ethers.parseUnits("1", 18);

    it("reverts when zero amount", async () => {
      await expect(account.connect(user).withdraw(ETH, 0)).to.be.revertedWith(
        "amount: zero"
      );
    });

    it("reverts when not owner", async () => {
      await expect(
        account.connect(other).withdraw(ETH, withdrawAmount)
      ).to.be.revertedWith("msg.sender: not owner");
    });

    it("reverts when exceed balance", async () => {
      await account.deposit(ETH, withdrawAmount - 1n, {
        value: withdrawAmount - 1n,
      });
      await expect(
        account.connect(user).withdraw(ETH, withdrawAmount)
      ).to.be.revertedWith("amount: exceed balance");

      await faucet(user.address, WBTC, withdrawAmount);
      await wbtc.connect(user).approve(account.target, withdrawAmount);

      await account.connect(user).deposit(WBTC, withdrawAmount - 1n);
      await expect(
        account.connect(user).withdraw(WBTC, withdrawAmount)
      ).to.be.revertedWith("amount: exceed balance");
    });

    it("reverts when exceed balance w/ lockedBalance", async () => {
      await account.deposit(ETH, withdrawAmount, {
        value: withdrawAmount,
      });
      await exchangeMock.increaseLockedBalance(account.target, ETH, 1n);
      await expect(
        account.connect(user).withdraw(ETH, withdrawAmount)
      ).to.be.revertedWith("amount: exceed balance");

      await faucet(user.address, WBTC, withdrawAmount);
      await wbtc.connect(user).approve(account.target, withdrawAmount);

      await account.connect(user).deposit(WBTC, withdrawAmount);
      await exchangeMock.increaseLockedBalance(account.target, WBTC, 1n);
      await expect(
        account.connect(user).withdraw(WBTC, withdrawAmount)
      ).to.be.revertedWith("amount: exceed balance");
    });

    it("withdraws ETH", async () => {
      await account
        .connect(user)
        .deposit(ETH, withdrawAmount, { value: withdrawAmount });
      expect(await account.getBalance(ETH)).to.be.equal(withdrawAmount);

      await expect(account.connect(user).withdraw(ETH, withdrawAmount))
        .to.emit(account, "Withdrawn")
        .withArgs(account.target, ETH, withdrawAmount);
      expect(await account.getBalance(ETH)).to.be.equal(0);
    });

    it("withdraws token", async () => {
      await faucet(user.address, WBTC, withdrawAmount);
      await wbtc.connect(user).approve(account.target, withdrawAmount);
      await account.connect(user).deposit(WBTC, withdrawAmount);
      expect(await account.getBalance(WBTC)).to.be.equal(withdrawAmount);

      await expect(account.connect(user).withdraw(WBTC, withdrawAmount))
        .to.emit(account, "Withdrawn")
        .withArgs(account.target, WBTC, withdrawAmount);
      expect(await account.getBalance(WBTC)).to.be.equal(0);
    });
  });

  describe("swap", () => {
    const swapAmount = ethers.parseUnits("1", 18);
    const expectedAmountOut = 10n;

    it("reverts when not owner", async () => {
      await expect(
        account.connect(other).swap(ETH, WBTC, 1n)
      ).to.be.revertedWith("msg.sender: not owner");
    });

    it("reverts when same tokens are used", async () => {
      await expect(
        account.connect(user).swap(WBTC, WBTC, 1n)
      ).to.be.revertedWith("same tokens");
    });

    it("reverts when amountIn exceed balance", async () => {
      await expect(
        account.connect(user).swap(WBTC, ETH, 1n)
      ).to.be.revertedWith("amountIn: exceed balance");
      await expect(
        account.connect(user).swap(ETH, WBTC, 1n)
      ).to.be.revertedWith("amountIn: exceed balance");
    });

    it("swaps eth -> token", async () => {
      await account
        .connect(user)
        .deposit(ETH, swapAmount, { value: swapAmount });
      await expect(account.connect(user).swap(ETH, WBTC, swapAmount))
        .to.emit(account, "Swapped")
        .withArgs(account.target, ETH, WBTC, swapAmount, expectedAmountOut);
    });

    it("swaps token -> eth", async () => {
      await faucet(user.address, WBTC, swapAmount);
      await wbtc.connect(user).approve(account.target, swapAmount);
      await account.connect(user).deposit(WBTC, swapAmount);
      await expect(account.connect(user).swap(WBTC, ETH, swapAmount))
        .to.emit(account, "Swapped")
        .withArgs(account.target, WBTC, ETH, swapAmount, expectedAmountOut);
    });
  });
});
