const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const { deploy } = require("./fixture/setup");

describe("Quoter", () => {
  // token contracts
  const WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
  const USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
  const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

  it("makePositionOrder", async () => {
    const { quoter, gmxV1 } = await loadFixture(deploy);
    console.log(`positionOrder: ${await quoter.makePositionOrder(gmxV1.target, [WETH, WETH, ethers.parseEther("1"), 10n, true, 0, 0])})`); // prettier-ignore
    console.log(`positionOrder: ${await quoter.makePositionOrder(gmxV1.target, [WBTC, WETH, ethers.parseUnits("0.1", 8), 10n, true, 0, 0])})`); // prettier-ignore
    console.log(`positionOrder: ${await quoter.makePositionOrder(gmxV1.target, [USDC, WETH, ethers.parseUnits("1000", 6), 10n, false, 0, 0])})`); // prettier-ignore
    console.log(`positionOrder: ${await quoter.makePositionOrder(gmxV1.target, [WBTC, WETH, ethers.parseUnits("0.1", 8), 10n, false, 0, 0])})`); // prettier-ignore
  });

  it("getPosition", async () => {
    const { quoter, account, gmxV1 } = await loadFixture(deploy);
    console.log(`position: ${await quoter.getPosition(account.target, gmxV1.target, [WETH, WETH, ethers.parseEther("1"), 10n, true, 0, 0])}`); // prettier-ignore
    console.log(`position: ${await quoter.getPosition(account.target, gmxV1.target, [WBTC, WETH, ethers.parseUnits("0.1", 8), 10n, true, 0, 0])}`); // prettier-ignore
    console.log(`position: ${await quoter.getPosition(account.target, gmxV1.target, [USDC, WETH, ethers.parseUnits("1000", 6), 10n, false, 0, 0])}`); // prettier-ignore
    console.log(`position: ${await quoter.getPosition(account.target, gmxV1.target, [WBTC, WETH, ethers.parseUnits("0.1", 8), 10n, false, 0, 0])}`); // prettier-ignore
  });

  it("getFee", async () => {
    const { quoter, account, gmxV1 } = await loadFixture(deploy);
    console.log(`fee: ${await quoter.getFee(account.target, gmxV1.target, [WETH, WETH, ethers.parseEther("1"),       10n, true, 0, 0])}`); // prettier-ignore
    console.log(`fee: ${await quoter.getFee(account.target, gmxV1.target, [WBTC, WETH, ethers.parseUnits("0.1", 8),  10n, true, 0, 0])}`); // prettier-ignore
    console.log(`fee: ${await quoter.getFee(account.target, gmxV1.target, [USDC, WETH, ethers.parseUnits("1000", 6), 10n, false, 0, 0])}`); // prettier-ignore
    console.log(`fee: ${await quoter.getFee(account.target, gmxV1.target, [WBTC, WETH, ethers.parseUnits("0.1", 8),  10n, false, 0, 0])}`); // prettier-ignore
  });

  it("get", async () => {
    const { quoter, account, gmxV1 } = await loadFixture(deploy);
    console.log(`price, fee, availableLiquidity: ${await quoter.get(account.target, [gmxV1.target], [[WETH, WETH, ethers.parseEther("1"),       10n, true, 0, 0]])}`); // prettier-ignore
    console.log(`price, fee, availableLiquidity: ${await quoter.get(account.target, [gmxV1.target], [[WBTC, WETH, ethers.parseUnits("0.1", 8),  10n, true, 0, 0]])}`); // prettier-ignore
    console.log(`price, fee, availableLiquidity: ${await quoter.get(account.target, [gmxV1.target], [[USDC, WETH, ethers.parseUnits("1000", 6), 10n, false, 0, 0]])}`); // prettier-ignore
    console.log(`price, fee, availableLiquidity: ${await quoter.get(account.target, [gmxV1.target], [[WBTC, WETH, ethers.parseUnits("0.1", 8),  10n, false, 0, 0]])}`); // prettier-ignore
  });

  it("sort", async () => {
    const { quoter } = await loadFixture(deploy);
    console.log(await quoter.sort([1, 2, 3]));
    console.log(await quoter.sort([1, 3, 2]));
    console.log(await quoter.sort([2, 1, 3]));
    console.log(await quoter.sort([2, 3, 1]));
    console.log(await quoter.sort([3, 1, 2]));
    console.log(await quoter.sort([3, 2, 1]));
  });
});
