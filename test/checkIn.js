const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("./fixture");
const {
  increaseTo,
} = require("@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time");

describe("checkIn", () => {
  // let snapshotId;

  // beforeEach(async () => {
  //   snapshotId = await network.provider.send("evm_snapshot");
  // });

  // afterEach(async () => {
  //   await network.provider.send("evm_revert", [snapshotId]);
  // });

  it("getDay", async () => {
    const { attendanceBook } = await loadFixture(deploy);
    const startTime = await attendanceBook.startTime();

    const day1 = 86400n;
    await increaseTo(startTime - 1n);
    console.log(await attendanceBook.getDay()); // 0
    await increaseTo(startTime);
    console.log(await attendanceBook.getDay()); // 1
    await increaseTo(startTime + day1);
    console.log(await attendanceBook.getDay()); // 2
    await increaseTo(startTime + day1 + day1);
    console.log(await attendanceBook.getDay()); // 3

    console.log(await attendanceBook.getEndDay()); // 30
  });

  it("checkIn", async () => {
    const { owner, account, attendanceBook } = await loadFixture(deploy);

    expect(await attendanceBook.getDay()).to.equal(0n);
    expect(await attendanceBook.activated()).to.equal(false);

    const startTime = await attendanceBook.startTime();
    await increaseTo(startTime);
    expect(await attendanceBook.getDay()).to.equal(1n);
    expect(await attendanceBook.activated()).to.equal(true);

    var day = await attendanceBook.getDay();
    await attendanceBook
      .connect(owner)
      .checkIn(account.target, ethers.ZeroAddress, 0, 0, "0x");
    expect(await attendanceBook.accountHistory(account.target, day)).to.equal(
      1
    );

    const endTime = await attendanceBook.endTime();
    await increaseTo(endTime - 10n);
    expect(await attendanceBook.getDay()).to.equal(30n);
    expect(await attendanceBook.activated()).to.equal(true);

    var day = await attendanceBook.getDay();
    await attendanceBook
      .connect(owner)
      .checkIn(account.target, ethers.ZeroAddress, 0, 0, "0x");
    expect(await attendanceBook.accountHistory(account.target, day)).to.equal(
      1
    );

    await increaseTo(endTime + 1n);
    expect(await attendanceBook.getDay()).to.equal(31n);
    expect(await attendanceBook.activated()).to.equal(false);
  });

  it("relay checkIn", async () => {
    const {
      va,
      owner,
      relayer,
      account,
      attendanceBook,
      exchange,
      WETH,
      weth,
      deposit,
    } = await loadFixture(deploy);
    const startTime = await attendanceBook.startTime();

    await increaseTo(startTime);
    const day = await attendanceBook.getDay();

    const deadline = startTime + 86400n;
    const checkInNetworkFee = ethers.parseEther("0.01");
    await deposit(WETH, checkInNetworkFee);

    // make withdraw signature
    var messageHash = ethers.solidityPackedKeccak256(
      [
        "address", // token
        "address", // to
        "uint256", // amount
        "uint256", // network fee
        "uint256", // deadline
      ],
      [WETH, attendanceBook.target, checkInNetworkFee, 0, deadline]
    );
    var signature = await va.signMessage(ethers.getBytes(messageHash));

    await exchange.setRelayer(attendanceBook.target, true);

    await attendanceBook
      .connect(relayer)
      .checkIn(account.target, WETH, checkInNetworkFee, deadline, signature);

    expect(await attendanceBook.accountHistory(account.target, day)).to.equal(
      1
    );

    await attendanceBook.withdrawETH(owner.address, checkInNetworkFee);
  });

  it("account history", async () => {
    const { owner, account, attendanceBook, exchange, WETH, deposit } =
      await loadFixture(deploy);
    const startTime = await attendanceBook.startTime();

    const day1 = 86400n;
    await increaseTo(startTime - 1n);
    await expect(
      attendanceBook
        .connect(owner)
        .checkIn(account.target, ethers.ZeroAddress, 0, 0, "0x")
    ).to.be.revertedWith("not started");

    await increaseTo(startTime);
    await attendanceBook
      .connect(owner)
      .checkIn(account.target, ethers.ZeroAddress, 0, 0, "0x");
    await increaseTo(startTime + day1);
    await attendanceBook
      .connect(owner)
      .checkIn(account.target, ethers.ZeroAddress, 0, 0, "0x");
    await increaseTo(startTime + day1 + day1);
    await attendanceBook
      .connect(owner)
      .checkIn(account.target, ethers.ZeroAddress, 0, 0, "0x");

    console.log(await attendanceBook.getAccountHistory(account.target, 1, 3));
    console.log(await attendanceBook.getTotalCheckIn(account.target, 1, 1));
    console.log(await attendanceBook.getTotalCheckIn(account.target, 1, 2));
    console.log(await attendanceBook.getTotalCheckIn(account.target, 1, 3));

    let day = await attendanceBook.getEndDay();
    if (day == 0n) {
      day = await attendanceBook.getDay();
    }
    console.log(day);
    console.log(await attendanceBook.getAccountHistory(account.target, 1, day));
    console.log(await attendanceBook.getTotalCheckIn(account.target, 1, day));
  });

  it("deactivate", async () => {
    const { owner, account, attendanceBook, exchange, WETH, deposit } =
      await loadFixture(deploy);
    const startTime = await attendanceBook.startTime();

    const day1 = 86400n;
    await increaseTo(startTime - 1n);
    await expect(
      attendanceBook
        .connect(owner)
        .checkIn(account.target, ethers.ZeroAddress, 0, 0, "0x")
    ).to.be.revertedWith("not started");

    await increaseTo(startTime);
    await attendanceBook
      .connect(owner)
      .checkIn(account.target, ethers.ZeroAddress, 0, 0, "0x");
    await increaseTo(startTime + day1);
    await attendanceBook
      .connect(owner)
      .checkIn(account.target, ethers.ZeroAddress, 0, 0, "0x");
    await increaseTo(startTime + day1 + day1);
    await attendanceBook
      .connect(owner)
      .checkIn(account.target, ethers.ZeroAddress, 0, 0, "0x");

    console.log(await attendanceBook.getEndDay());
    await attendanceBook.deactivate();
    console.log(await attendanceBook.getEndDay());

    const endDay = await attendanceBook.getEndDay();
    console.log(
      await attendanceBook.getTotalCheckIn(account.target, 1, endDay)
    );

    await expect(
      attendanceBook
        .connect(owner)
        .checkIn(account.target, ethers.ZeroAddress, 0, 0, "0x")
    ).to.be.revertedWith("ended");
  });
});
