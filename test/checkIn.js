const { ethers } = require("hardhat");
const { expect } = require("chai");
const {
  increaseTo,
} = require("@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time");

describe("checkIn", () => {
  let snapshotId;

  let owner;
  let relayer;

  let startTime;
  let expiration;

  let account;
  let attendanceBook;

  const vaPk = ethers.Wallet.createRandom().privateKey;
  const va = new ethers.Wallet(vaPk);

  beforeEach(async () => {
    snapshotId = await network.provider.send("evm_snapshot");

    [owner, relayer] = await ethers.getSigners();
    startTime = Math.ceil(Date.now() / 1000) + 86400 * 3;
    expiration = startTime + 86400 * 30;

    account = await ethers.deployContract("Account");
    await account.initialize(
      owner,
      "0x" + "11".repeat(20),
      va.address,
      expiration
    );
    attendanceBook = await ethers.deployContract("AttendanceBook", [
      startTime,
      relayer,
    ]);
  });

  afterEach(async () => {
    await network.provider.send("evm_revert", [snapshotId]);
  });

  it("getDay", async () => {
    const day1 = 86400;
    await increaseTo(startTime - 1);
    console.log(await attendanceBook.getDay());
    await increaseTo(startTime);
    console.log(await attendanceBook.getDay());
    await increaseTo(startTime + day1);
    console.log(await attendanceBook.getDay());
    await increaseTo(startTime + day1 + day1);
    console.log(await attendanceBook.getDay());
  });

  it("checkIn", async () => {
    await increaseTo(startTime);
    const day = await attendanceBook.getDay();

    await attendanceBook.checkIn(account.target, 0, "0x");
    expect(await attendanceBook.accountHistory(account.target, day)).to.equal(
      1
    );
  });

  it("relay checkIn", async () => {
    await increaseTo(startTime);
    const day = await attendanceBook.getDay();

    const deadline = expiration;

    var messageHash = ethers.solidityPackedKeccak256(
      [
        "address", // account
        "uint256", // deadline
      ],
      [account.target, deadline]
    );
    var signature = await va.signMessage(ethers.getBytes(messageHash));

    await attendanceBook
      .connect(relayer)
      .checkIn(account.target, deadline, signature);
    expect(await attendanceBook.accountHistory(account.target, day)).to.equal(
      1
    );
  });

  it("account history", async () => {
    const day1 = 86400;
    await increaseTo(startTime - 1);
    await expect(
      attendanceBook.checkIn(account.target, 0, "0x")
    ).to.be.revertedWith("not started");

    await increaseTo(startTime);
    await attendanceBook.checkIn(account.target, 0, "0x");
    await increaseTo(startTime + day1);
    await attendanceBook.checkIn(account.target, 0, "0x");
    await increaseTo(startTime + day1 + day1);
    await attendanceBook.checkIn(account.target, 0, "0x");

    console.log(await attendanceBook.getAccountHistory(account.target, 1, 3));
  });
});
