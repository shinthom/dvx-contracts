const { ethers } = require("hardhat");

const waitAndLogAccumulatedGasUsed = async (tx) => {
  const receipt = await tx.wait();
  console.log("gasUsed:", receipt.gasUsed);
};

async function main() {
  const AccountV2 = await ethers.getContractFactory("AccountV2");
  const accountV2 = await AccountV2.deploy();
  await waitAndLogAccumulatedGasUsed(accountV2.deploymentTransaction());
  await waitAndLogAccumulatedGasUsed(
    await exchange.addAccountImplementation(2, accountV2.target)
  );

  // users can upgrade their accounts
  await waitAndLogAccumulatedGasUsed(await account.connect(owner).upgrade(2));

  // AccountFactory can upgrade default version to new version
  const accountFactoryAddr = "0x111...111";
  const accountFactory = await ethers.getContractAt(
    "AccountFactory",
    accountFactoryAddr
  );
  await waitAndLogAccumulatedGasUsed(
    await accountFactory.connect(owner).upgradeVersion(2)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
