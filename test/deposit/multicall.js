const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture");

describe("deposit", () => {
  it("multicall", async () => {
    const { owner, account, WETH, weth, faucet } = await loadFixture(deploy);

    var depositToken = WETH;
    var depositAmount = ethers.parseEther("1");

    await faucet(depositToken, depositAmount);

    const multicallArgs = [
      account.interface.encodeFunctionData("deposit", [
        depositToken,
        depositAmount,
        0,
        0,
        "0x",
      ]),
    ];

    await weth.connect(owner).approve(account.target, depositAmount);
    await account.connect(owner).multicall(multicallArgs);
    expect(await weth.balanceOf(account.target)).to.equal(depositAmount);
  });
});

describe("depositPermit", () => {
  it("multicall", async () => {
    const { owner, account, WETH, weth, faucet } = await loadFixture(deploy);

    var depositToken = WETH;
    var depositAmount = ethers.parseEther("1");

    await faucet(depositToken, depositAmount);

    const domain = {
      name: await weth.name(),
      version: "1",
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

    const signature = await owner.signTypedData(domain, types, values);
    const splitSig = ethers.Signature.from(signature);

    const multicallArgs = [
      account.interface.encodeFunctionData("depositPermit", [
        depositToken,
        depositAmount,
        splitSig.v,
        splitSig.r,
        splitSig.s,
        0,
        0,
        "0x",
      ]),
    ];

    await account.connect(owner).multicall(multicallArgs);
    expect(await weth.balanceOf(account.target)).to.equal(depositAmount);
  });
});
