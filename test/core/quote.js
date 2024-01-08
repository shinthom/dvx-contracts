const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture/setup");

describe("Quoter", () => {
  it("scenario", async () => {
    const { gmxV1, mux, quoter, account, WETH } = await loadFixture(deploy);
    const collateral = WETH;
    const index = WETH;
    const isLong = true;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");

    const request = { collateral, index, collateralAmount, size, isLong } // prettier-ignore
    const answers = await quoter.quote(account.target, [gmxV1.target, mux.target], request); // prettier-ignore
  });
});
