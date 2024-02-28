const { ethers } = require("hardhat");

async function main() {
  const accountAddr = "0x18A58Bb88622bd1f46e73Fd8e37dE23813a334bb";
  const account = await ethers.getContractAt("Account", accountAddr);

  const da = await account.delegatedAccount();
  console.log(da);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
