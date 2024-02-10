const { ethers, network } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("./fixture");

describe("withdraw", () => {
  const deadline = Math.ceil(Date.now() / 1000) + 60 * 60 * 3;

  it("no fee", async () => {
    const { owner, va, relayer, account, feeCollector, WETH, weth, deposit } =
      await loadFixture(deploy);

    var token = WETH;
    var depositAmount = ethers.parseEther("1");
    await deposit(token, depositAmount);

    var networkFee = 0;
    var withdrawAmount = await account.getBalance(token);
    await account
      .connect(owner)
      .withdraw(token, withdrawAmount, networkFee, 0, "0x");
    console.log(await weth.balanceOf(owner.address));
  });

  it("network fee", async () => {
    const { owner, va, relayer, account, feeCollector, WETH, weth, deposit } =
      await loadFixture(deploy);

    var token = WETH;
    var depositAmount = ethers.parseEther("1");
    await deposit(token, depositAmount);

    var networkFee = ethers.parseUnits("0.01", 18);
    var withdrawAmount = await account.getBalance(token);
    await account
      .connect(owner)
      .withdraw(token, withdrawAmount, networkFee, 0, "0x");
    console.log(await weth.balanceOf(owner.address));
  });

  it("relay", async () => {
    const { owner, va, relayer, account, feeCollector, WETH, weth, deposit } =
      await loadFixture(deploy);

    var token = WETH;
    var depositAmount = ethers.parseEther("1");
    await deposit(token, depositAmount);

    var networkFee = ethers.parseUnits("0.01", 18);
    var withdrawAmount = await account.getBalance(token);
    var messageHash = ethers.solidityPackedKeccak256(
      [
        "address", // token
        "uint256", // amount
        "uint256", // networkFee
        "uint256", // deadline
      ],
      [token, withdrawAmount, networkFee, deadline]
    );
    var signature = await va.signMessage(ethers.getBytes(messageHash));

    await weth.connect(owner).approve(account.target, depositAmount);
    await account
      .connect(relayer)
      .withdraw(token, depositAmount, networkFee, deadline, signature);
    console.log(await weth.balanceOf(owner.address));
  });
});
