const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("./fixture");

describe("sbt", () => {
  it("whitelist", async () => {
    const { other, sbt } = await loadFixture(deploy);

    expect(await sbt.whitelist(other, 1)).to.be.equal(false);
    expect(await sbt.claimed(other, 1)).to.be.equal(false);

    await sbt.addWhitelist([other], 1);
    expect(await sbt.whitelist(other, 1)).to.be.equal(true);

    await sbt.connect(other).claim(1);
    expect(await sbt.claimed(other, 1)).to.be.equal(true);

    await expect(sbt.connect(other).claim(1)).to.be.revertedWith(
      "already claimed"
    );
  });

  it("non-transfer", async () => {
    const { other, sbt } = await loadFixture(deploy);

    await sbt.airdrop([other], 1);
    expect(await sbt.balanceOf(other, 1)).to.be.equal(1);

    await expect(
      sbt.connect(other).safeTransferFrom(other, other, 1, 1, "0x")
    ).to.be.revertedWith("non-transferable");
  });
});
