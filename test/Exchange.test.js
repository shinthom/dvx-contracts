const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Exchange", () => {
  let owner, user0;

  let exchange;

  beforeEach(async () => {
    [owner, user0] = await ethers.getSigners();

    exchange = await ethers.deployContract("Exchange");
  });

  it("(un)register exchange", async () => {
    const newAdapter = "0x" + "1".repeat(40);

    await exchange.connect(owner).registerAdapter(newAdapter);
    expect(await exchange.isRegisteredAdapter(newAdapter)).to.equal(true);

    await exchange.connect(owner).unregisterAdapter(newAdapter);
    expect(await exchange.isRegisteredAdapter(newAdapter)).to.equal(false);
  });

  it("reverts when non-owner (un)register exchange", async () => {
    const newAdapter = "0x" + "1".repeat(40);

    await expect(
      exchange.connect(user0).registerAdapter(newAdapter)
    ).to.be.revertedWith("NOT_OWNER");
    await expect(
      exchange.connect(user0).unregisterAdapter(newAdapter)
    ).to.be.revertedWith("NOT_OWNER");
  });

  it("(un)register token", async () => {
    const newToken = "0x" + "2".repeat(40);

    await exchange.connect(owner).registerToken(newToken);
    expect(await exchange.isRegisteredToken(newToken)).to.equal(true);

    await exchange.connect(owner).unregisterToken(newToken);
    expect(await exchange.isRegisteredToken(newToken)).to.equal(false);
  });

  it("reverts when non-owner (un)register token", async () => {
    const newToken = "0x" + "2".repeat(40);

    await expect(
      exchange.connect(user0).registerToken(newToken)
    ).to.be.revertedWith("NOT_OWNER");
    await expect(
      exchange.connect(user0).unregisterToken(newToken)
    ).to.be.revertedWith("NOT_OWNER");
  });

  describe("account", () => {
    it("createAccount", async () => {
      await exchange.connect(user0).createAccount();

      console.log(await exchange.account(user0.address));
      expect(await exchange.totalAccount()).to.equal(1);
    });

    it("createAccountAndDeposit", async () => {
      const depositAmount = ethers.parseEther("1");
      await exchange
        .connect(user0)
        .createAccountAndDeposit(ethers.ZeroAddress, depositAmount, {
          value: depositAmount,
        });

      const account = await ethers.getContractAt(
        "IAccount",
        await exchange.account(user0.address)
      );
      console.log(await exchange.account(user0.address));
      expect(await exchange.totalAccount()).to.equal(1);
      expect(await account.getBalance(ethers.ZeroAddress)).to.equal(
        depositAmount
      );
    });
  });
});
