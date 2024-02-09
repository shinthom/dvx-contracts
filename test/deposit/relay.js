const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture");

const deadline = Math.ceil(Date.now() / 1000) + 60 * 60 * 3;

describe("relay", () => {
  it("deposit", async () => {
    const { owner, va, relayer, account, WETH, weth, faucet } =
      await loadFixture(deploy);

    var depositToken = WETH;
    var depositAmount = ethers.parseEther("1");

    await faucet(depositToken, depositAmount);
    expect(await weth.balanceOf(owner.address)).to.equal(depositAmount);

    var messageHash = ethers.solidityPackedKeccak256(
      [
        "address", // token
        "uint256", // amount
        "uint256", // networkFee
        "uint256", // deadline
      ],
      [depositToken, depositAmount, 0, deadline]
    );
    var signature = await va.signMessage(ethers.getBytes(messageHash));

    await weth.connect(owner).approve(account.target, depositAmount);
    await account
      .connect(relayer)
      .deposit(depositToken, depositAmount, 0, deadline, signature);
    expect(await weth.balanceOf(account.target)).to.equal(depositAmount);
  });

  it("depositPermit", async () => {
    const { owner, va, relayer, account, WETH, weth, faucet } =
      await loadFixture(deploy);

    var depositToken = WETH;
    var depositAmount = ethers.parseEther("1");

    await faucet(depositToken, depositAmount);
    expect(await weth.balanceOf(owner.address)).to.equal(depositAmount);

    const domain = {
      name: await weth.name(),
      version: "1", // NOTE: usdc has version 2
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: weth.target,
    };

    const types = {
      Permit: [
        {
          name: "owner",
          type: "address",
        },
        {
          name: "spender",
          type: "address",
        },
        {
          name: "value",
          type: "uint256",
        },
        {
          name: "nonce",
          type: "uint256",
        },
        {
          name: "deadline",
          type: "uint256",
        },
      ],
    };

    const values = {
      owner: owner.address,
      spender: account.target,
      value: depositAmount,
      nonce: await weth.nonces(owner.address),
      deadline: ethers.MaxUint256,
    };

    var permitSig = await owner.signTypedData(domain, types, values);
    var splitSig = ethers.Signature.from(permitSig);

    var messageHash = ethers.solidityPackedKeccak256(
      [
        "address", // token
        "uint256", // amount
        "uint8", // v
        "bytes32", // r
        "bytes32", // s
        "uint256", // networkFee
        "uint256", // deadline
      ],
      [
        depositToken,
        depositAmount,
        splitSig.v,
        splitSig.r,
        splitSig.s,
        0,
        deadline,
      ]
    );
    var relaySig = await va.signMessage(ethers.getBytes(messageHash));

    await account
      .connect(relayer)
      .depositPermit(
        depositToken,
        depositAmount,
        splitSig.v,
        splitSig.r,
        splitSig.s,
        0,
        deadline,
        relaySig
      );
    expect(await weth.balanceOf(account.target)).to.equal(depositAmount);
  });
});
