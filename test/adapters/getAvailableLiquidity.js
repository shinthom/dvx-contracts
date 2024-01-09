const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture/setup");

describe("getAvailableLiquidity", () => {
  it("gmx v1", async () => {
    const { gmxV1, WETH, WBTC } = await loadFixture(deploy);
    console.log(await gmxV1.getAvailableLiquidity(WETH, true));
    console.log(await gmxV1.getAvailableLiquidity(WETH, false));
    console.log(await gmxV1.getAvailableLiquidity(WBTC, true));
    console.log(await gmxV1.getAvailableLiquidity(WBTC, false));
  });

  it("mux", async () => {
    const { mux, WETH, WBTC } = await loadFixture(deploy);
    console.log(await mux.getAvailableLiquidity(WETH, true));
    console.log(await mux.getAvailableLiquidity(WETH, false));
    console.log(await mux.getAvailableLiquidity(WBTC, true));
    console.log(await mux.getAvailableLiquidity(WBTC, false));
  });
});
