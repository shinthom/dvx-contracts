const { ethers, network } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("./fixture");

describe("upgradeAccount", () => {
  it("v1 -> v2", async () => {
    const { owner, account, exchange } = await loadFixture(deploy);
    console.log(await account.version());
    console.log(await exchange.accountImplementation(1));

    const accountV2 = await ethers.deployContract("AccountV2", []);
    await exchange.addAccountImplementation(2, accountV2.target);
    await account.connect(owner).upgrade(2);
    console.log(await account.version());
  });
});
