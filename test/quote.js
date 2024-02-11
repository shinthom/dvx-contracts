const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("./fixture");

describe("Quoter", () => {
  it("quote", async () => {
    const { gmxV1Adapter, muxAdapter, quoter, account, WETH } =
      await loadFixture(deploy);

    const collateral = WETH;
    const index = WETH;
    const isLong = true;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");

    const request = { collateral, index, collateralAmount, size, isLong };
    const answers = await quoter.quote(
      account.target,
      [gmxV1Adapter.target, muxAdapter.target],
      request
    );
    console.log(answers);
  });
});
