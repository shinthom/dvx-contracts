const { ethers } = require("hardhat");

async function main() {
  let gasUsed = 0n;

  const waitAndLogAccumulatedGasUsed = async (tx) => {
    const receipt = await tx.wait();
    gasUsed += receipt.gasUsed;
    console.log("gasUsed:", gasUsed);
  };

  const startTime = Math.ceil(Date.now() / 1000) + 60;
  const relayer = "0x8411D1E7eED0EB00D2E1F7332122581156062fD2";
  const AttendanceBook = await ethers.getContractFactory("AttendanceBook");
  const attendanceBook = await AttendanceBook.deploy(startTime, relayer);
  await waitAndLogAccumulatedGasUsed(attendanceBook.deploymentTransaction());
  console.log("AttendanceBook deployed at:", attendanceBook.target, "\n");

  const exchangeAddr = "0xcbEFf0C9698503Ca83B236E2a6D08138A79D1Aa6";
  const exchange = await ethers.getContractAt("Exchange", exchangeAddr);
  await waitAndLogAccumulatedGasUsed(
    await exchange.setRelayer(attendanceBook.target, true)
  );
  console.log("Exchange: setRelayer\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
