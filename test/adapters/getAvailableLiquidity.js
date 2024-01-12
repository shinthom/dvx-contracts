const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture/setup");

describe("getAvailableLiquidity", () => {
  it("gmx v1", async () => {
    const { gmxV1, WETH, WBTC } = await loadFixture(deploy);
    console.log("gmxV1 -> ETH, long:", await gmxV1.getAvailableLiquidity(WETH, true)); // prettier-ignore
    console.log("gmxV1 -> ETH, short:", await gmxV1.getAvailableLiquidity(WETH, false)); // prettier-ignore
    console.log("gmxV1 -> BTC, short:", await gmxV1.getAvailableLiquidity(WBTC, true)); // prettier-ignore
    console.log("gmxV1 -> BTC, short:", await gmxV1.getAvailableLiquidity(WBTC, false)); // prettier-ignore
  });

  it("mux", async () => {
    const { mux, WETH, WBTC } = await loadFixture(deploy);
    console.log("mux -> ETH, long:", await mux.getAvailableLiquidity(WETH, true)); // prettier-ignore
    console.log("mux -> ETH, short:", await mux.getAvailableLiquidity(WETH, false)); // prettier-ignore
    console.log("mux -> BTC, long:", await mux.getAvailableLiquidity(WBTC, true)); // prettier-ignore
    console.log("mux -> BTC, short:", await mux.getAvailableLiquidity(WBTC, false)); // prettier-ignore
  });
});
