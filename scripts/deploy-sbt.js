const { ethers } = require("hardhat");
const d = require("../contracts/token/d.json");
const v = require("../contracts/token/v.json");
const x = require("../contracts/token/x.json");

async function main() {
  const waitAndLogAccumulatedGasUsed = async (tx) => {
    const receipt = await tx.wait(2);
    console.log("gasUsed:", receipt.gasUsed);
  };

  const sbt = await ethers.getContractAt(
    "AlphaAccessCard",
    "0xB963e2c38C7569e4454C7a28D2774bFfa7a13575"
  );

  // const divider = 1000;

  // var id = 1;
  // var whitelist = d;
  // var loop = Math.ceil(whitelist.length / divider);
  // for (let i = 0; i < loop; i++) {
  //   await waitAndLogAccumulatedGasUsed(
  //     await sbt.addWhitelist(
  //       whitelist.slice(i * divider, (i + 1) * divider),
  //       id
  //     )
  //   );
  //   console.log("Whitelist", id, "added");
  // }

  // var id = 2;
  // var whitelist = v;
  // var loop = Math.ceil(whitelist.length / divider);
  // for (let i = 4; i < loop; i++) { // fix me!
  //   await waitAndLogAccumulatedGasUsed(
  //     await sbt.addWhitelist(
  //       whitelist.slice(i * divider, (i + 1) * divider),
  //       id
  //     )
  //   );
  //   console.log("Whitelist", id, "added");
  // }

  // var id = 3;
  // var whitelist = x;
  // var loop = Math.ceil(whitelist.length / divider);

  // for (let i = 0; i < loop; i++) {
  //   await waitAndLogAccumulatedGasUsed(
  //     await sbt.addWhitelist(
  //       whitelist.slice(i * divider, (i + 1) * divider),
  //       id
  //     )
  //   );
  //   console.log("Whitelist", id, "added");
  // }

  // const a = "0xeac67E2878174c7b6e5Db0Ee709c8A713BE974Bf";
  // const b = "0x18A58Bb88622bd1f46e73Fd8e37dE23813a334bb";
  // console.log(await sbt.whitelist(a, 3));
  // console.log(await sbt.whitelist(b, 3));

  await waitAndLogAccumulatedGasUsed(await sbt.claim(3));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
