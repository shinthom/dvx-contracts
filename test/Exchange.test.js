const { ethers, network } = require("hardhat");
const { expect } = require("chai");
const { faucet } = require("./helper");

let snapshotId;

describe("Exchange", () => {
  const ETH = ethers.ZeroAddress;
  const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";
  const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

  let user;
  let other;

  let exchange;
  let wbtc;
  let usdc;

  beforeEach(async () => {
    [user, other, gov] = await ethers.getSigners();

    exchange = await ethers.deployContract("Exchange", []);
    wbtc = await ethers.getContractAt("IERC20", WBTC);
    usdc = await ethers.getContractAt("IERC20", USDC);

    snapshotId = await network.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await network.provider.send("evm_revert", [snapshotId]);
  });

  describe("createAccount", () => {
    it("reverts when account is already created", async () => {
      await exchange.connect(user).createAccount();
      await expect(exchange.connect(user).createAccount()).to.be.revertedWith(
        "account: already created"
      );
    });

    it("creates account", async () => {
      expect(await exchange.accounts(user.address)).to.be.equal(
        ethers.ZeroAddress
      );
      await exchange.connect(user).createAccount();
      expect(await exchange.accounts(user.address)).to.be.not.equal(
        ethers.ZeroAddress
      );
    });

    it("creates account and deposits ETH", async () => {
      const depositAmount = ethers.parseUnits("1", 18);
      await exchange
        .connect(user)
        .createAccountAndDeposit(ETH, depositAmount, { value: depositAmount });
      const account = await ethers.getContractAt(
        "Account",
        await exchange.accounts(user.address)
      );
      expect(await account.getBalance(ETH)).to.be.equal(depositAmount);
    });

    it("creates account and deposits token", async () => {
      const depositAmount = ethers.parseUnits("1", 18);
      await faucet(user.address, WBTC, depositAmount);

      await wbtc.connect(user).approve(exchange.target, depositAmount);
      await exchange.connect(user).createAccountAndDeposit(WBTC, depositAmount);
      const account = await ethers.getContractAt(
        "Account",
        await exchange.accounts(user.address)
      );
      expect(await account.getBalance(WBTC)).to.be.equal(depositAmount);
    });
  });

  describe("setStableToken", () => {
    beforeEach(async () => {
      await exchange.setGov(gov);
    });

    it("reverts when not gov", async () => {
      await expect(
        exchange.connect(other).setStableToken(USDC, true)
      ).to.be.revertedWith("msg.sender: not gov");
    });

    it("set stable token", async () => {
      await exchange.connect(gov).setStableToken(USDC, true);
      expect(await exchange.isStableToken(USDC)).to.be.equal(true);
    });
  });

  describe("setRegisteredAdapter", () => {
    const adapter = "0x" + "11".repeat(20);

    beforeEach(async () => {
      await exchange.setGov(gov);
    });

    it("reverts when not gov", async () => {
      await expect(
        exchange.connect(other).setRegisteredAdapter(adapter, true)
      ).to.be.revertedWith("msg.sender: not gov");
    });

    it("set registered adapter", async () => {
      await exchange.connect(gov).setRegisteredAdapter(adapter, true);
      expect(await exchange.isRegisteredAdapter(adapter)).to.be.equal(true);
    });
  });

  describe("tier", () => {
    beforeEach(async () => {
      await exchange.setGov(gov);
    });

    it("reverts when not gov", async () => {
      await expect(exchange.connect(other).setTier(1, 1000)).to.be.revertedWith(
        "msg.sender: not gov"
      );
    });

    it("reverts when tierId is zero", async () => {
      await expect(exchange.connect(gov).setTier(0, 1000)).to.be.revertedWith(
        "tierId: zero"
      );
    });

    it("reverts when discountRate is invalid", async () => {
      await expect(
        exchange.connect(gov).setTier(1, 100_000_000 + 1)
      ).to.be.revertedWith("discountRate: invalid");
    });

    it("set tier", async () => {
      await exchange.connect(gov).setTier(1, 1000);
      expect(await exchange.tiers(1)).to.be.equal(1000);
    });
  });

  describe("referralTier", () => {
    const tierId = 1;

    beforeEach(async () => {
      await exchange.setGov(gov);
    });

    it("reverts when not gov", async () => {
      await expect(
        exchange.connect(other).setReferralTier(user.address, tierId)
      ).to.be.revertedWith("msg.sender: not gov");
    });

    it("set referral tier", async () => {
      await exchange.connect(gov).setReferralTier(user.address, tierId);
      expect(await exchange.referralTiers(user.address)).to.be.equal(tierId);
    });
  });

  describe("positionFeeRate", () => {
    beforeEach(async () => {
      await exchange.setGov(gov);
    });

    it("reverts when not gov", async () => {
      await expect(
        exchange.connect(other).setOpenPositionFeeRate(1000)
      ).to.be.revertedWith("msg.sender: not gov");
    });

    it("reverts when feeRate is invalid", async () => {
      await expect(
        exchange.connect(gov).setOpenPositionFeeRate(100_000_000 + 1)
      ).to.be.revertedWith("feeRate: invalid");
    });

    it("set open position fee rate", async () => {
      await exchange.connect(gov).setOpenPositionFeeRate(1000);
      expect(await exchange.openPositionFeeRate()).to.be.equal(1000);
    });
  });

  describe("swap", () => {
    it("reverts when amount is not exact", async () => {
      await expect(
        exchange.connect(user).swap(ETH, WBTC, 1)
      ).to.be.revertedWith("amount: not exact");
    });

    it("swaps ETH to token", async () => {
      const ethAmount = ethers.parseUnits("1", 18);

      expect(await wbtc.balanceOf(user.address)).to.be.equal(0n);
      await exchange
        .connect(user)
        .swap(ETH, WBTC, ethAmount, { value: ethAmount });
      expect(await wbtc.balanceOf(user.address)).to.be.greaterThan(0n);
    });

    it("swaps token to ETH", async () => {
      const wbtcAmount = ethers.parseUnits("1", 8);
      await faucet(user.address, WBTC, wbtcAmount);

      const beforeBalance = await ethers.provider.getBalance(user.address);
      await wbtc.connect(user).approve(exchange.target, wbtcAmount);
      await exchange.connect(user).swap(WBTC, ETH, wbtcAmount);
      expect(await ethers.provider.getBalance(user.address)).to.be.greaterThan(
        beforeBalance
      );
    });

    it("swaps token to token", async () => {
      const wbtcAmount = ethers.parseUnits("1", 8);
      await faucet(user.address, WBTC, wbtcAmount);

      expect(await usdc.balanceOf(user.address)).to.be.equal(0n);
      await wbtc.connect(user).approve(exchange.target, wbtcAmount);
      await exchange.connect(user).swap(WBTC, USDC, wbtcAmount);
      expect(await usdc.balanceOf(user.address)).to.be.greaterThan(0n);
    });
  });

  describe("marketOrder", () => {
    const collateral = ETH;
    const index = ETH;
    const collateralAmount = ethers.parseUnits("1", 18);
    const size = ethers.parseUnits("10", 18);
    const isLong = true;

    const orderType = {
      increasePosition: 0,
      decreasePosition: 1,
      increaseCollateral: 2,
      decreaseCollateral: 3,
    };
    const validExecutionFee = 10;
    const invalidExecutionFee = 1;

    let exchangeMock;
    let accountMock;
    let adapterMock;

    beforeEach(async () => {
      exchangeMock = await ethers.deployContract("ExchangeMock", []);
      await exchangeMock.setGov(gov);
      await exchangeMock.connect(user).createAccountMock();

      accountMock = await ethers.getContractAt(
        "AccountMock",
        await exchangeMock.accounts(user.address)
      );
      adapterMock = await ethers.deployContract("AdapterMock");
    });

    it("reverts when account zero", async () => {
      await expect(
        exchangeMock
          .connect(user)
          .executeMarketOrder(
            ethers.ZeroAddress,
            orderType.increasePosition,
            adapterMock.target,
            [collateral],
            index,
            collateralAmount,
            size,
            isLong,
            validExecutionFee,
            { value: validExecutionFee }
          )
      ).to.be.revertedWith("account: zero");
    });

    it("reverts when account not owner", async () => {
      await expect(
        exchangeMock
          .connect(other)
          .executeMarketOrder(
            accountMock.target,
            orderType.increasePosition,
            adapterMock.target,
            [collateral],
            index,
            collateralAmount,
            size,
            isLong,
            validExecutionFee,
            { value: validExecutionFee }
          )
      ).to.be.revertedWith("account: not owner");
    });

    it("reverts when invalid path", async () => {
      await expect(
        exchangeMock
          .connect(user)
          .executeMarketOrder(
            accountMock.target,
            orderType.increasePosition,
            adapterMock.target,
            [],
            index,
            collateralAmount,
            size,
            isLong,
            validExecutionFee,
            { value: validExecutionFee }
          )
      ).to.be.revertedWith("path: invalid length");

      await expect(
        exchangeMock
          .connect(user)
          .executeMarketOrder(
            accountMock.target,
            orderType.increasePosition,
            adapterMock.target,
            [ETH, WBTC, USDC],
            index,
            collateralAmount,
            size,
            isLong,
            validExecutionFee,
            { value: validExecutionFee }
          )
      ).to.be.revertedWith("path: invalid length");
    });

    it("reverts when not registered adapter", async () => {
      await expect(
        exchangeMock
          .connect(user)
          .executeMarketOrder(
            accountMock.target,
            orderType.increasePosition,
            adapterMock.target,
            [ETH],
            index,
            collateralAmount,
            size,
            isLong,
            validExecutionFee,
            { value: validExecutionFee }
          )
      ).to.be.revertedWith("adapter: not registered");
    });

    it("reverts when not registered adapter", async () => {
      await expect(
        exchangeMock
          .connect(user)
          .executeMarketOrder(
            accountMock.target,
            orderType.increasePosition,
            adapterMock.target,
            [ETH],
            index,
            collateralAmount,
            size,
            isLong,
            validExecutionFee,
            { value: validExecutionFee }
          )
      ).to.be.revertedWith("adapter: not registered");
    });

    it("reverts when collateralAmount is zero", async () => {
      await exchangeMock
        .connect(gov)
        .setRegisteredAdapter(adapterMock.target, true);

      await expect(
        exchangeMock
          .connect(user)
          .executeMarketOrder(
            accountMock.target,
            orderType.increasePosition,
            adapterMock.target,
            [ETH],
            index,
            0,
            size,
            isLong,
            validExecutionFee,
            { value: validExecutionFee }
          )
      ).to.be.revertedWith("collateralAmount: zero");
    });

    it("reverts when size is zero", async () => {
      await exchangeMock
        .connect(gov)
        .setRegisteredAdapter(adapterMock.target, true);

      await expect(
        exchangeMock
          .connect(user)
          .executeMarketOrder(
            accountMock.target,
            orderType.increasePosition,
            adapterMock.target,
            [ETH],
            index,
            collateralAmount,
            0,
            isLong,
            validExecutionFee,
            { value: validExecutionFee }
          )
      ).to.be.revertedWith("size: zero");
    });

    it("executes market order", async () => {
      await exchangeMock
        .connect(gov)
        .setRegisteredAdapter(adapterMock.target, true);

      await exchangeMock
        .connect(user)
        .executeMarketOrder(
          accountMock.target,
          orderType.increasePosition,
          adapterMock.target,
          [collateral],
          index,
          collateralAmount,
          size,
          isLong,
          validExecutionFee,
          { value: validExecutionFee }
        );
    });
  });

  describe("withdraw", () => {
    const withdrawAmount = ethers.parseUnits("1", 18);

    beforeEach(async () => {
      await user.sendTransaction({
        to: exchange.target,
        value: withdrawAmount,
      });
      await faucet(exchange.target, WBTC, withdrawAmount);

      await exchange.setGov(gov);
    });

    it("reverts when msg.sender is not gov", async () => {
      await expect(
        exchange.connect(other).withdraw(user.address, WBTC, 1)
      ).to.be.revertedWith("msg.sender: not gov");
    });

    it("reverts when receiver is zero address", async () => {
      await expect(
        exchange.connect(gov).withdraw(ethers.ZeroAddress, WBTC, 1)
      ).to.be.revertedWith("receiver: zero address");
    });

    it("reverts when amount is zero", async () => {
      await expect(
        exchange.connect(gov).withdraw(user.address, WBTC, 0)
      ).to.be.revertedWith("amount: zero");
    });

    it("withdraws", async () => {
      expect(await ethers.provider.getBalance(exchange.target)).to.be.equal(
        withdrawAmount
      );
      expect(await wbtc.balanceOf(exchange.target)).to.be.equal(withdrawAmount);

      await exchange.connect(gov).withdraw(user.address, ETH, withdrawAmount);
      await exchange.connect(gov).withdraw(user.address, WBTC, withdrawAmount);
      expect(await ethers.provider.getBalance(exchange.target)).to.be.equal(0);
      expect(await wbtc.balanceOf(exchange.target)).to.be.equal(0);
    });
  });
});
