const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("./fixture");

const deadline = Math.ceil(Date.now() / 1000) + 60 * 60 * 3;

describe("deposit", () => {
  it("depositETH", async () => {
    const { owner, account, WETH } = await loadFixture(deploy);
    const wethBalance = await ethers.provider.getBalance(WETH);

    var depositAmount = ethers.parseEther("1");
    await account
      .connect(owner)
      .depositETH(depositAmount, { value: depositAmount });
    expect(await ethers.provider.getBalance(WETH)).to.equal(
      wethBalance + depositAmount
    );
  });

  it("no fee", async () => {
    const { owner, va, relayer, account, feeCollector, WETH, weth, faucet } =
      await loadFixture(deploy);

    var depositToken = WETH;
    var depositAmount = ethers.parseEther("1");

    await faucet(depositToken, depositAmount);
    expect(await weth.balanceOf(owner.address)).to.equal(depositAmount);

    var networkFee = 0;
    var messageHash = ethers.solidityPackedKeccak256(
      [
        "address", // token
        "uint256", // amount
        "uint256", // networkFee
        "uint256", // deadline
      ],
      [depositToken, depositAmount, networkFee, deadline]
    );
    var signature = await va.signMessage(ethers.getBytes(messageHash));

    await weth.connect(owner).approve(account.target, depositAmount);
    await account
      .connect(relayer)
      .deposit(depositToken, depositAmount, networkFee, deadline, signature);
    expect(await weth.balanceOf(feeCollector.address)).to.equal(networkFee);
  });

  it("network fee", async () => {
    const { owner, va, relayer, account, feeCollector, WETH, weth, faucet } =
      await loadFixture(deploy);

    var depositToken = WETH;
    var depositAmount = ethers.parseEther("1");

    await faucet(depositToken, depositAmount);
    expect(await weth.balanceOf(owner.address)).to.equal(depositAmount);

    var networkFee = ethers.parseEther("0.01");
    var messageHash = ethers.solidityPackedKeccak256(
      [
        "address", // token
        "uint256", // amount
        "uint256", // networkFee
        "uint256", // deadline
      ],
      [depositToken, depositAmount, networkFee, deadline]
    );
    var signature = await va.signMessage(ethers.getBytes(messageHash));

    await weth.connect(owner).approve(account.target, depositAmount);
    await account
      .connect(relayer)
      .deposit(depositToken, depositAmount, networkFee, deadline, signature);
    expect(await weth.balanceOf(account.target)).to.equal(depositAmount - networkFee); // prettier-ignore
    expect(await weth.balanceOf(feeCollector.address)).to.equal(networkFee);
  });

  it("multicall - deposit", async () => {
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

  it("multicall- depositPermit", async () => {
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

  describe("permit", () => {
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
        .depositPermit(
          weth.target,
          depositAmount,
          splitSig.v,
          splitSig.r,
          splitSig.s,
          0,
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
        .depositPermit(
          wbtc.target,
          depositAmount,
          splitSig.v,
          splitSig.r,
          splitSig.s,
          0,
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
        .depositPermit(
          usdt.target,
          depositAmount,
          splitSig.v,
          splitSig.r,
          splitSig.s,
          0,
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
        .depositPermit(
          usdc.target,
          depositAmount,
          splitSig.v,
          splitSig.r,
          splitSig.s,
          0,
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
        .depositPermit(
          usdce.target,
          depositAmount,
          splitSig.v,
          splitSig.r,
          splitSig.s,
          0,
          0,
          "0x"
        );
      expect(await usdce.balanceOf(account.target)).to.be.equal(depositAmount);
    });
  });

  describe("relay", () => {
    const deadline = Math.ceil(Date.now() / 1000) + 60 * 60 * 3;

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

      console.log((await ethers.provider.getNetwork()).chainId);

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
});
