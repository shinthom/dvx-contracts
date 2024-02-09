const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { deploy } = require("../fixture");

describe("depositPermit", () => {
  const depositAmount = ethers.parseUnits("100", 6);

  it("weth", async () => {
    const { owner, account, weth, faucet } = await loadFixture(deploy);

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

    await faucet(weth.target, depositAmount);
    await account
      .connect(owner)
      .deposit(
        weth.target,
        depositAmount,
        splitSig.v,
        splitSig.r,
        splitSig.s,
        0,
        "0x"
      );
    expect(await weth.balanceOf(account.target)).to.be.equal(depositAmount);
  });

  it("wbtc", async () => {
    const { owner, account, wbtc, faucet } = await loadFixture(deploy);

    const domain = {
      name: await wbtc.name(),
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: wbtc.target,
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
      nonce: await wbtc.nonces(owner.address),
      deadline: ethers.MaxUint256,
    };

    const signature = await owner.signTypedData(domain, types, values);
    const splitSig = ethers.Signature.from(signature);

    await faucet(wbtc.target, depositAmount);
    await account
      .connect(owner)
      .deposit(
        wbtc.target,
        depositAmount,
        splitSig.v,
        splitSig.r,
        splitSig.s,
        0,
        "0x"
      );
    expect(await wbtc.balanceOf(account.target)).to.be.equal(depositAmount);
  });

  it("usdt", async () => {
    const { owner, account, usdt, faucet } = await loadFixture(deploy);

    const domain = {
      name: await usdt.name(),
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: usdt.target,
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
      nonce: await usdt.nonces(owner.address),
      deadline: ethers.MaxUint256,
    };

    const signature = await owner.signTypedData(domain, types, values);
    const splitSig = ethers.Signature.from(signature);

    await faucet(usdt.target, depositAmount);
    await account
      .connect(owner)
      .deposit(
        usdt.target,
        depositAmount,
        splitSig.v,
        splitSig.r,
        splitSig.s,
        0,
        "0x"
      );
    expect(await usdt.balanceOf(account.target)).to.be.equal(depositAmount);
  });

  it("usdc", async () => {
    const { owner, account, usdc, faucet } = await loadFixture(deploy);

    const domain = {
      name: await usdc.name(),
      version: "2",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: usdc.target,
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
      nonce: await usdc.nonces(owner.address),
      deadline: ethers.MaxUint256,
    };

    const signature = await owner.signTypedData(domain, types, values);
    const splitSig = ethers.Signature.from(signature);

    await faucet(usdc.target, depositAmount);
    await account
      .connect(owner)
      .deposit(
        usdc.target,
        depositAmount,
        splitSig.v,
        splitSig.r,
        splitSig.s,
        0,
        "0x"
      );
    expect(await usdc.balanceOf(account.target)).to.be.equal(depositAmount);
  });

  it("usdc.e", async () => {
    const { owner, account, usdce, faucet } = await loadFixture(deploy);

    const domain = {
      name: await usdce.name(),
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: usdce.target,
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
      nonce: await usdce.nonces(owner.address),
      deadline: ethers.MaxUint256,
    };

    const signature = await owner.signTypedData(domain, types, values);
    const splitSig = ethers.Signature.from(signature);

    await faucet(usdce.target, depositAmount);
    await account
      .connect(owner)
      .deposit(
        usdce.target,
        depositAmount,
        splitSig.v,
        splitSig.r,
        splitSig.s,
        0,
        "0x"
      );
    expect(await usdce.balanceOf(account.target)).to.be.equal(depositAmount);
  });
});
