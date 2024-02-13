const { ethers, network } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("./fixture");

describe("upgradeable", () => {
  it("exchange", async () => {
    const { deployer, owner, exchange } = await loadFixture(deploy);
    const uups = await ethers.deployContract("UUPSMock");
    await expect(
      exchange.connect(owner).upgradeTo(uups.target)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await exchange.connect(deployer).upgradeTo(uups.target);

    const exchangeUpgraded = await ethers.getContractAt(
      "UUPSMock",
      exchange.target
    );
    expect(await exchangeUpgraded.checkUpgrade()).to.be.equal(1);
  });

  it("warehouse", async () => {
    const { deployer, owner, warehouse } = await loadFixture(deploy);
    const uups = await ethers.deployContract("UUPSMock");
    await expect(
      warehouse.connect(owner).upgradeTo(uups.target)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await warehouse.connect(deployer).upgradeTo(uups.target);

    const warehouseUpgraded = await ethers.getContractAt(
      "UUPSMock",
      warehouse.target
    );
    expect(await warehouseUpgraded.checkUpgrade()).to.be.equal(1);
  });

  it("accountFactory", async () => {
    const { deployer, owner, accountFactory } = await loadFixture(deploy);
    const uups = await ethers.deployContract("UUPSMock");
    await expect(
      accountFactory.connect(owner).upgradeTo(uups.target)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await accountFactory.connect(deployer).upgradeTo(uups.target);

    const accountFactoryUpgraded = await ethers.getContractAt(
      "UUPSMock",
      accountFactory.target
    );
    expect(await accountFactoryUpgraded.checkUpgrade()).to.be.equal(1);
  });
});
