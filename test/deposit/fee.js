const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture");

const deadline = Math.ceil(Date.now() / 1000) + 60 * 60 * 3;

describe("deposit", () => {
  let snapshotId;

  beforeEach(async () => {
    snapshotId = await network.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await network.provider.send("evm_revert", [snapshotId]);
  });

  it("fee", async () => {
    const { owner, va, relayer, account, feeCollector, WETH, weth, faucet } =
      await loadFixture(deploy);

    var depositToken = WETH;
    var depositAmount = ethers.parseEther("1");

    await faucet(depositToken, depositAmount);
    expect(await weth.balanceOf(owner.address)).to.equal(depositAmount);

    var executionFee = ethers.parseEther("0.01");
    var messageHash = ethers.solidityPackedKeccak256(
      [
        "address", // token
        "uint256", // amount
        "uint256", // executionFee
        "uint256", // deadline
      ],
      [depositToken, depositAmount, executionFee, deadline]
    );
    var signature = await va.signMessage(ethers.getBytes(messageHash));

    await weth.connect(owner).approve(account.target, depositAmount);
    await account
      .connect(relayer)
      .deposit(depositToken, depositAmount, executionFee, deadline, signature);
    expect(await weth.balanceOf(account.target)).to.equal(depositAmount - executionFee); // prettier-ignore
    expect(await weth.balanceOf(feeCollector.target)).to.equal(executionFee);
  });
});
