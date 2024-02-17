const { ethers } = require("hardhat");

async function main() {
  let gasUsed = 0n;

  const waitAndLogAccumulatedGasUsed = async (tx) => {
    const receipt = await tx.wait();
    gasUsed += receipt.gasUsed;
    console.log("gasUsed:", gasUsed);
  };

  const SBT = await ethers.getContractFactory("SBT");
  const sbt = await SBT.deploy();
  await waitAndLogAccumulatedGasUsed(sbt.deploymentTransaction());
  console.log("SBT deployed at:", sbt.target, "\n");

  await waitAndLogAccumulatedGasUsed(
    await sbt.updateBaseUri(
      "ipfs://QmYNzdhsAeiBnyMLk5oNPXyKebKBGSD6snyAPrPjeE8gPs/"
    )
  );
  console.log("SBT: updateBaseUri\n");

  const owner = (await ethers.provider.getSigner()).address;
  await waitAndLogAccumulatedGasUsed(await sbt.airdrop([owner], 1));
  console.log("SBT: airdrop (#1)\n");
  await waitAndLogAccumulatedGasUsed(await sbt.airdrop([owner], 2));
  console.log("SBT: airdrop (#2)\n");
  await waitAndLogAccumulatedGasUsed(await sbt.airdrop([owner], 3));
  console.log("SBT: airdrop (#3)\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
