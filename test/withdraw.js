const { ethers, network } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("./fixture");

describe("withdraw", () => {
  const deadline = Math.ceil(Date.now() / 1000) + 60 * 60 * 3;

  it("withdraw", async () => {
    const { owner, account, WETH } = await loadFixture(deploy);
    const wethBalance = await ethers.provider.getBalance(WETH);

    const amount = ethers.parseEther("1");
    await account.connect(owner).depositETH(amount, { value: amount });
    expect(await ethers.provider.getBalance(WETH)).to.equal(
      wethBalance + amount
    );

    const vaPk = ethers.Wallet.createRandom().privateKey;
    const va = new ethers.Wallet(vaPk);
    await account.connect(owner).withdraw(WETH, va.address, amount, 0, 0, "0x");
    expect(await ethers.provider.getBalance(va.address)).to.equal(amount);
  });

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
      .withdraw(token, owner.address, withdrawAmount, networkFee, 0, "0x");
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
      .withdraw(token, owner.address, withdrawAmount, networkFee, 0, "0x");
    console.log(await weth.balanceOf(owner.address));
  });

  it("network fee + fee debt", async () => {
    const {
      owner,
      account,
      WETH,
      weth,
      gmxV1Adapter,
      setDummyPrice,
      deposit,
      checkPosition,
      feeCollector,
      executeIncreasePosition,
      executeDecreasePosition,
    } = await loadFixture(deploy);

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;

    await setDummyPrice();
    var acceptablePrice = ethers.parseUnits("2000", 18);
    var networkFee = 0;
    var deadline = 0;

    await deposit(collateral, collateralAmount);
    await account
      .connect(owner)
      .increasePosition(
        gmxV1Adapter.target,
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        acceptablePrice,
        networkFee,
        deadline,
        "0x",
        { value: await gmxV1Adapter.getMinExecutionFee() }
      );
    await executeIncreasePosition(account.target);

    var networkFee = ethers.parseUnits("0.01", 18); // debt
    await account
      .connect(owner)
      .decreasePosition(
        gmxV1Adapter.target,
        collateral,
        index,
        isLong,
        size,
        acceptablePrice,
        networkFee,
        deadline,
        "0x",
        { value: await gmxV1Adapter.getMinExecutionFee() }
      );
    await executeDecreasePosition(account.target);

    console.log(await account.getFeeDebt(collateral));
    console.log(await account.getBalance(collateral));

    var balance = await account.getBalance(collateral);
    await expect(
      account
        .connect(owner)
        .withdraw(collateral, owner.address, balance, 0, 0, "0x")
    ).to.be.revertedWith("amount: greater than withdrawable balance");

    var withdrawableBalance = await account.getWithdrawableBalance(collateral);
    await account
      .connect(owner)
      .withdraw(collateral, owner.address, withdrawableBalance, 0, 0, "0x");

    console.log(await weth.balanceOf(owner.address));
    expect(await weth.balanceOf(feeCollector.address)).to.equal(networkFee);
    expect(await account.getFeeDebt(collateral)).to.equal(0);
    expect(await account.getBalance(collateral)).to.equal(0);
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
        "address", // to
        "uint256", // amount
        "uint256", // networkFee
        "uint256", // deadline
      ],
      [token, owner.address, withdrawAmount, networkFee, deadline]
    );
    var signature = await va.signMessage(ethers.getBytes(messageHash));

    await weth.connect(owner).approve(account.target, depositAmount);
    await account
      .connect(relayer)
      .withdraw(
        token,
        owner.address,
        depositAmount,
        networkFee,
        deadline,
        signature
      );
    console.log(await weth.balanceOf(owner.address));
  });
});
