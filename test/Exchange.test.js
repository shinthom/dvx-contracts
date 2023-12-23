const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Exchange", () => {
  // token contracts
  const WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
  const USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
  const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

  // uniswap
  const SwapRouter = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

  let owner;
  let user0;

  let wbtc;
  let usdc;
  let exchange;

  before(async () => {
    [owner, user0] = await ethers.getSigners();

    wbtc = await ethers.getContractAt("IERC20", WBTC);
    usdc = await ethers.getContractAt("IERC20", USDC);
  });

  beforeEach(async () => {
    const exchangeImpl = await ethers.deployContract("Exchange");
    const proxy = await ethers.deployContract("ERC1967Proxy", [
      exchangeImpl.target,
      "0x",
    ]);
    exchange = await ethers.getContractAt("Exchange", proxy.target);
    await exchange.initialize(SwapRouter);
  });

  describe("swap", () => {
    it("eth -> wbtc", async () => {
      await exchange
        .connect(user0)
        .swap(ethers.ZeroAddress, WBTC, ethers.parseEther("1"), {
          value: ethers.parseEther("1"),
        });
    });

    it("eth -> usdc", async () => {
      await exchange
        .connect(user0)
        .swap(ethers.ZeroAddress, USDC, ethers.parseEther("1"), {
          value: ethers.parseEther("1"),
        });
    });

    it("wbtc -> eth", async () => {
      await exchange
        .connect(user0)
        .swap(ethers.ZeroAddress, WBTC, ethers.parseEther("1"), {
          value: ethers.parseEther("1"),
        });
      const wbtcBalance = await wbtc.balanceOf(user0.address);

      await wbtc.connect(user0).approve(exchange.target, wbtcBalance);
      await exchange.connect(user0).swap(WBTC, WETH, wbtcBalance);
    });

    it("usdc -> eth", async () => {
      await exchange
        .connect(user0)
        .swap(ethers.ZeroAddress, USDC, ethers.parseEther("1"), {
          value: ethers.parseEther("1"),
        });
      const usdcBalance = await usdc.balanceOf(user0.address);

      await usdc.connect(user0).approve(exchange.target, usdcBalance);
      await exchange.connect(user0).swap(USDC, WETH, usdcBalance);
    });
  });

  it("(un)register exchange", async () => {
    const newAdapter = "0x" + "1".repeat(40);

    await exchange.connect(owner).registerAdapter(newAdapter);
    expect(await exchange.isRegisteredAdapter(newAdapter)).to.equal(true);

    await exchange.connect(owner).unregisterAdapter(newAdapter);
    expect(await exchange.isRegisteredAdapter(newAdapter)).to.equal(false);
  });

  it("reverts when non-owner (un)register exchange", async () => {
    const newAdapter = "0x" + "1".repeat(40);

    await expect(
      exchange.connect(user0).registerAdapter(newAdapter)
    ).to.be.revertedWith("NOT_OWNER");
    await expect(
      exchange.connect(user0).unregisterAdapter(newAdapter)
    ).to.be.revertedWith("NOT_OWNER");
  });

  it("(un)register token", async () => {
    const newToken = "0x" + "2".repeat(40);

    await exchange.connect(owner).registerToken(newToken);
    expect(await exchange.isRegisteredToken(newToken)).to.equal(true);

    await exchange.connect(owner).unregisterToken(newToken);
    expect(await exchange.isRegisteredToken(newToken)).to.equal(false);
  });

  it("reverts when non-owner (un)register token", async () => {
    const newToken = "0x" + "2".repeat(40);

    await expect(
      exchange.connect(user0).registerToken(newToken)
    ).to.be.revertedWith("NOT_OWNER");
    await expect(
      exchange.connect(user0).unregisterToken(newToken)
    ).to.be.revertedWith("NOT_OWNER");
  });

  describe("account", () => {
    it("createAccount", async () => {
      await exchange.connect(user0).createAccount();

      expect(await exchange.totalAccount()).to.equal(1);
    });

    it("createAccountAndDeposit", async () => {
      const depositAmount = ethers.parseEther("1");
      await exchange
        .connect(user0)
        .createAccountAndDeposit(ethers.ZeroAddress, depositAmount, {
          value: depositAmount,
        });

      const account = await ethers.getContractAt(
        "IAccount",
        await exchange.account(user0.address)
      );
      expect(await exchange.totalAccount()).to.equal(1);
      expect(await account.getBalance(ethers.ZeroAddress)).to.equal(
        depositAmount
      );
    });
  });

  describe("upgradeTo", () => {
    it("sets new implementation to upgrade", async () => {
      const uups = await ethers.deployContract("Exchange");
      await uups.initialize(SwapRouter);
      await exchange.upgradeTo(uups.target);
    });

    it("reverts when new implementation is not uups", async () => {
      const notUUPS = await ethers.deployContract("Reader");
      await expect(exchange.upgradeTo(notUUPS.target)).to.be.revertedWith(
        "ERC1967Upgrade: new implementation is not UUPS"
      );
    });

    it("reverts when new implementation is not contract", async () => {
      const newContract = "0x000000000000000000000000000000000000dEaD";
      await expect(exchange.upgradeTo(newContract)).to.be.reverted;
    });
  });
});
