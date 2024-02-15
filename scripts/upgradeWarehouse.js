const { ethers } = require("hardhat");

async function main() {
  let gasUsed = 0n;

  const waitAndLogAccumulatedGasUsed = async (tx) => {
    const receipt = await tx.wait();
    gasUsed += receipt.gasUsed;
    console.log("gasUsed:", gasUsed);
  };

  const Warehouse = await ethers.getContractFactory("Warehouse");
  const warehouseV2 = await Warehouse.deploy();
  await waitAndLogAccumulatedGasUsed(warehouseV2.deploymentTransaction());

  const warehouseV1 = "0x9D224907Fda34dc60a5544db722BC93FC7CfC001";
  const warehouse = await ethers.getContractAt("Warehouse", warehouseV1);
  await waitAndLogAccumulatedGasUsed(
    await warehouse.upgradeTo(warehouseV2.target)
  );
  console.log("Warehouse: upgradeTo\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
