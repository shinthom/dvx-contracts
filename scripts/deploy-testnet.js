const { deploy } = require("../test/fixture");

async function main() {
  const noAccount = true;
  const {
    user,
    gmxV1Adapter,
    muxAdapter,
    exchange,
    warehouse,
    reader,
    quoter,
    account,
  } = await deploy(noAccount);
  console.log(`
- user     : ${user.address}
- gmxV1    : ${gmxV1Adapter.target}
- mux      : ${muxAdapter.target}
- exchange : ${exchange.target}
- warehouse: ${warehouse.target}
- reader   : ${reader.target}
- quoter   : ${quoter.target}
- account  : ${noAccount ? "null" : account.target}
  `);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
