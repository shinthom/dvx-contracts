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
    var answers1 = await quoter.quote(
      account.target,
      [gmxV1Adapter.target],
      request
    );
    console.log(answers1);
    var answers2 = await quoter.quote(
      account.target,
      [muxAdapter.target],
      request
    );
    console.log(answers2);
  });

  it("quote, UNI / LINK", async () => {
    const { owner, quoter, gmxV1Adapter, UNI, LINK } = await loadFixture(
      deploy
    );

    var collateral = UNI;
    var index = UNI;
    var isLong = true;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var request = { collateral, index, collateralAmount, size, isLong };
    var answer = await quoter.quote(
      owner.address,
      [gmxV1Adapter.target],
      request
    );
    console.log(answer);

    var collateral = LINK;
    var index = LINK;
    var isLong = true;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var request = { collateral, index, collateralAmount, size, isLong };
    var answer = await quoter.quote(
      owner.address,
      [gmxV1Adapter.target],
      request
    );
    console.log(answer);
  });

  it("quote, ARB", async () => {
    const { owner, quoter, muxAdapter, ARB } = await loadFixture(deploy);

    var collateral = ARB;
    var index = ARB;
    var isLong = true;
    var collateralAmount = ethers.parseEther("10");
    var size = ethers.parseEther("100");
    var request = { collateral, index, collateralAmount, size, isLong };
    var answer = await quoter.quote(
      owner.address,
      [muxAdapter.target],
      request
    );
  });

  it("quoteExactOutputSingle", async () => {
    const { quoter, WBTC, WETH, USDC, USDT, USDCe } = await loadFixture(deploy);

    var tokenIn = WETH;
    var tokenOut = WBTC;
    var amountOut = ethers.parseUnits("1", 8);

    const amountIn = await quoter.quoteExactOutputSingle.staticCall(
      tokenIn,
      tokenOut,
      amountOut
    );
    console.log(amountIn.toString());
  });
});
