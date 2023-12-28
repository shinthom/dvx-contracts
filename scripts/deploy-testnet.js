const { deploy } = require("../test/fixture/setup");

async function main() {
  const noAccount = true;
  const { user0, gmxV1, mux, exchange, warehouse, reader, quoter, account } =
    await deploy(noAccount);
  console.log(`
- user0    : ${user0.address}
- gmxV1    : ${gmxV1.target}
- mux      : ${mux.target}
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
