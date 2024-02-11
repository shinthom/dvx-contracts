const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("./fixture");

describe("renewDelegatedAccount", () => {
  it("renew", async () => {
    const { owner, account, va } = await loadFixture(deploy);
    const [wallet] = await account.delegatedAccount();
    expect(wallet).to.equal(va.address);

    const newAccountPk = ethers.Wallet.createRandom().privateKey;
    const newAccount = new ethers.Wallet(newAccountPk);
    const expiration = Math.ceil(new Date().getTime() / 1000 + 3600);
    await account.connect(owner).renewDelegatedAccount(newAccount, expiration);

    expect((await account.delegatedAccount())[0]).to.equal(newAccount.address);
    expect((await account.delegatedAccount())[1]).to.equal(expiration);
  });
});
