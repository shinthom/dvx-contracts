const { ethers } = require("hardhat");

// token contracts
const WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
const USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

describe("Quoter", () => {
  let user0;

  let gmxQuoter;
  let muxQuoter;

  beforeEach(async () => {
    [owner, user0] = await ethers.getSigners();

    gmxQuoter = await ethers.deployContract("GMXQuoter");
    muxQuoter = await ethers.deployContract("MUXQuoter");
  });

  describe("GMXQuoter", () => {
    it("getPrice", async () => {
      const isLong = true;
      const price = await gmxQuoter.getPrice(WETH, isLong);
      console.log(`price: ${price}`);
    });

    it("getExecutionFee", async () => {
      const isLong = true;
      const getExecutionFee = await gmxQuoter.getExecutionFee(isLong);
      console.log(`getExecutionFee: ${getExecutionFee}`);
    });

    it("getPositionFee", async () => {
      const size = ethers.parseUnits("600", 30);
      const positionFee = await gmxQuoter.getPositionFee(size);
      console.log(`positionFee: ${positionFee}`);
    });

    it("getAvailableLiquidity", async () => {
      const availableLiquidity = await gmxQuoter.getAvailableLiquidity(WETH);
      console.log(`availableLiquidity: ${availableLiquidity}`);
    });
  });

  describe("MUXQuoter", () => {
    it("getPositionFee", async () => {
      const price = ethers.parseUnits("1000", 18);
      const size = ethers.parseEther("10");

      // 1000 * 10 = 10000
      // 10000 * 60 / 100000 = 6
      const positionFee = await muxQuoter.getPositionFee(price, WETH, size);
      console.log(`positionFee: ${positionFee}`);
    });
  });
});
