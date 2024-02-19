const { ethers } = require("hardhat");

async function main() {
  let gasUsed = 0n;

  const waitAndLogAccumulatedGasUsed = async (tx) => {
    const receipt = await tx.wait(2);
    gasUsed += receipt.gasUsed;
    console.log("gasUsed:", gasUsed);
  };

  const sbtAddr = "0x4CEa5b0fc92A4f41A5ebCfD034E58489D36E5aa0";
  const sbt = await ethers.getContractAt("SBT", sbtAddr);

  await waitAndLogAccumulatedGasUsed(
    await sbt.addWhitelist(["0x43c1dBC830c30B0FeA4f0499357188DC9240C70a"], 1)
  );

  // console.log(
  //   await sbt.whitelist("0x95C86d17A1A492327a4c5c3ea552AC6371834a2e", 2)
  // );
  // console.log(
  //   await sbt.whitelist("0x95C86d17A1A492327a4c5c3ea552AC6371834a2e", 3)
  // );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
