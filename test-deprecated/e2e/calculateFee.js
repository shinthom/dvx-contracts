const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture");

describe("limitOrder", () => {
  it("should execute a limit order", async () => {
    const {
      user,
      orderKeeper,
      account,
      exchange,
      warehouse,
      gmxV1Adapter,
      muxAdapter,
      WETH,
      WBTC,
      USDC,
      deposit,
      executeIncreasePosition,
      fillPositionOrder,
      setPrice,
    } = await loadFixture(deploy);

    var ethPrice = ethers.parseUnits("2000", 30);
    var btcPrice = ethers.parseUnits("40000", 30);
    var usdcPrice = ethers.parseUnits("1", 30);

    await setPrice(gmxV1Adapter, WETH, ethPrice, ethPrice, false);
    await setPrice(gmxV1Adapter, WBTC, btcPrice, btcPrice, true);
    await setPrice(gmxV1Adapter, USDC, usdcPrice, usdcPrice, true);

    const feeUsd = await exchange.getFeeUsd(
      gmxV1Adapter.target,
      WETH,
      ethers.parseEther("1"),
      true
    );
    // console.log(feeUsd);

    const collateralAmount = await exchange.feeUsdToCollateral(
      gmxV1Adapter.target,
      WBTC,
      true,
      feeUsd
    );
    // console.log(collateralAmount);

    const wbtcFee = await exchange.getPositionFee(
      gmxV1Adapter.target,
      WBTC,
      WETH,
      ethers.parseEther("1"),
      true
    );
    console.log(wbtcFee);
  });
});
