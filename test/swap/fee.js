const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture");

describe("swap", () => {
  it("zero fee", async () => {
    const { owner, account, USDC, WETH, weth, quoter, deposit } =
      await loadFixture(deploy);

    var tokenIn = USDC;
    var tokenOut = WETH;
    var amountIn = ethers.parseUnits("2000", 6);

    var expectedAmountOut = await quoter.quoteExactInputSingle.staticCall(
      tokenIn,
      tokenOut,
      amountIn
    );
    await deposit(tokenIn, amountIn);
    await account.connect(owner).swap(tokenIn, tokenOut, amountIn, 0, 0, "0x");
    expect(await weth.balanceOf(account.target)).to.equal(expectedAmountOut);
  });

  it("execution fee", async () => {
    const {
      owner,
      account,
      USDC,
      WETH,
      usdc,
      weth,
      quoter,
      feeCollector,
      deposit,
    } = await loadFixture(deploy);

    var tokenIn = USDC;
    var tokenOut = WETH;
    var amountIn = ethers.parseUnits("2000", 6);

    var networkFee = ethers.parseUnits("200", 6);

    var expectedAmountOut = await quoter.quoteExactInputSingle.staticCall(
      tokenIn,
      tokenOut,
      amountIn - networkFee
    );
    await deposit(tokenIn, amountIn);
    await account
      .connect(owner)
      .swap(tokenIn, tokenOut, amountIn, networkFee, 0, "0x");
    expect(await weth.balanceOf(account.target)).to.equal(expectedAmountOut);
    expect(await usdc.balanceOf(feeCollector.target)).to.equal(networkFee);
  });

  it("execution fee + swap fee", async () => {
    const {
      owner,
      account,
      USDC,
      WETH,
      usdc,
      weth,
      exchange,
      quoter,
      feeCollector,
      deposit,
    } = await loadFixture(deploy);

    var tokenIn = USDC;
    var tokenOut = WETH;
    var amountIn = ethers.parseUnits("2000", 6);

    var networkFee = ethers.parseUnits("200", 6);
    var swapFeeRate = ethers.parseUnits("0.1", 8); // 10%
    await exchange.setSwapFeeRate(swapFeeRate);
    var swapFee = await exchange.getSwapFee(amountIn - networkFee);
    expect(swapFee).to.equal(
      ((amountIn - networkFee) * swapFeeRate) / (await exchange.BASIS_POINTS())
    );

    var expectedAmountOut = await quoter.quoteExactInputSingle.staticCall(
      tokenIn,
      tokenOut,
      amountIn - networkFee - swapFee
    );
    await deposit(tokenIn, amountIn);
    await account
      .connect(owner)
      .swap(tokenIn, tokenOut, amountIn, networkFee, 0, "0x");
    expect(await weth.balanceOf(account.target)).to.equal(expectedAmountOut);
    expect(await usdc.balanceOf(feeCollector.target)).to.equal(
      networkFee + swapFee
    );
  });
});
