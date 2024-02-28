const { ethers } = require("hardhat");

// prod
const exchangeAddr = "0xea125907e5FbC098080A96Ce8d8a3e16Ae9912F6";
const warehouseAddr = "0x28A8aA355FC3cF450Ae7F5EEEaa00422511B7843";
const accountFactoryAddr = "0x36dc3458EfE2c31A62504eBa71c7dBfbb08757d1";
const attendanceBookAddr = "0x413c118EDb45092257Eb5B7d2b2e90Ab49Df9E07";
const alphaAccessCardAddr = "0xB963e2c38C7569e4454C7a28D2774bFfa7a13575";
const newOwner = "0xd02e3b3f604Da3b365a449f7eE99EAA7deC5aC8A";

// // dev
// const exchangeAddr = "0xD3c54FFbca403E1bF95ea96Fa4A58595D6A172C5";
// const warehouseAddr = "0x02643f0D153bdE44C418b5a90AdF1AF8971Aa156";
// const accountFactoryAddr = "0x39B667fbCE2d51E1070F314098C214ac9c74858D";
// const attendanceBookAddr = "0xD71fdB2F598b2b9e33bB1752b65Cf416249469A9";
// const newOwner = "0x27c9DeB3CC6d41E172e07ee69F53dCF1FbCbeDc0";

async function main() {
  let gasUsed = 0n;

  const waitAndLogAccumulatedGasUsed = async (tx) => {
    const receipt = await tx.wait(2);
    gasUsed += receipt.gasUsed;
    console.log("gasUsed:", gasUsed);
  };

  const exchange = await ethers.getContractAt("Exchange", exchangeAddr);
  const warehouse = await ethers.getContractAt("Warehouse", warehouseAddr);
  const accountFactory = await ethers.getContractAt(
    "AccountFactory",
    accountFactoryAddr
  );
  const attendanceBook = await ethers.getContractAt(
    "AttendanceBook",
    attendanceBookAddr
  );
  const alphaAccessCard = await ethers.getContractAt(
    "AlphaAccessCard",
    alphaAccessCardAddr
  );

  // // dev
  // console.log(await exchange.owner());
  // console.log(await warehouse.owner());
  // console.log(await accountFactory.owner());
  // console.log(await attendanceBook.owner());

  // await waitAndLogAccumulatedGasUsed(
  //   await exchange.transferOwnership(newOwner)
  // );
  // console.log(await exchange.owner());

  // await waitAndLogAccumulatedGasUsed(
  //   await warehouse.transferOwnership(newOwner)
  // );
  // console.log(await warehouse.owner());

  // await waitAndLogAccumulatedGasUsed(
  //   await accountFactory.transferOwnership(newOwner)
  // );
  // console.log(await accountFactory.owner());

  // await waitAndLogAccumulatedGasUsed(
  //   await attendanceBook.transferOwnership(newOwner)
  // );
  // console.log(await attendanceBook.owner());

  // prod
  console.log(await exchange.owner());
  console.log(await warehouse.owner());
  console.log(await accountFactory.owner());
  console.log(await attendanceBook.owner());
  console.log(await alphaAccessCard.owner());

  await waitAndLogAccumulatedGasUsed(
    await exchange.transferOwnership(newOwner)
  );
  console.log(await exchange.owner());

  await waitAndLogAccumulatedGasUsed(
    await warehouse.transferOwnership(newOwner)
  );
  console.log(await warehouse.owner());

  await waitAndLogAccumulatedGasUsed(
    await accountFactory.transferOwnership(newOwner)
  );
  console.log(await accountFactory.owner());

  await waitAndLogAccumulatedGasUsed(
    await attendanceBook.transferOwnership(newOwner)
  );
  console.log(await attendanceBook.owner());

  await waitAndLogAccumulatedGasUsed(
    await alphaAccessCard.transferOwnership(newOwner)
  );
  console.log(await alphaAccessCard.owner());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
