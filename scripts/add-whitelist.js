const { ethers } = require("hardhat");

async function main() {
  let gasUsed = 0n;

  const waitAndLogAccumulatedGasUsed = async (tx) => {
    const receipt = await tx.wait();
    gasUsed += receipt.gasUsed;
    console.log("gasUsed:", gasUsed);
  };

  const sbtAddr = "0x7b3f489b056349878727633b3373bbdc46e77fe4";
  const sbt = await ethers.getContractAt("SBT", sbtAddr);

  const whitelist = ["0x5356A56ee48c2a4998Bb133103896Ae1B951Cb78"];
  await waitAndLogAccumulatedGasUsed(await sbt.addWhitelist(whitelist));
  console.log("SBT: addWhitelist\n");

  console.log(await sbt.whitelist(whitelist[0]));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
