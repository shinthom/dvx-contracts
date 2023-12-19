const { ethers } = require("hardhat");

describe("Quoter", () => {
  // gmx contracts
  const PositionRouter = "0xb87a436b93ffe9d75c5cfa7bacfff96430b09868";
  const Router = "0xabbc5f99639c9b6bcb58544ddf04efa6802f4064";
  const Vault = "0x489ee077994b6658eafa855c308275ead8097c4a";
  // uniswap
  const SwapRouter = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

  // token contracts
  const WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
  const USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
  const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

  let user0;

  let quoter;

  before(async () => {
    [user0] = await ethers.getSigners();

    positionRouter = await ethers.getContractAt(
      "IPositionRouter",
      PositionRouter
    );
    weth = await ethers.getContractAt("IERC20", WETH);
    usdc = await ethers.getContractAt("IERC20", USDC);
    wbtc = await ethers.getContractAt("IERC20", WBTC);
  });

  beforeEach(async () => {
    gmxV1 = await ethers.deployContract("GMXV1", [
      PositionRouter,
      Router,
      Vault,
      SwapRouter,
    ]);

    quoter = await ethers.deployContract("Quoter");
  });

  it("check quote orders", async () => {
    const quote = async (
      description,
      collateral,
      index,
      collateralAmount,
      leverage,
      isLong
    ) => {
      const [gmxOrder, muxOrder] = await quoter.quote(
        collateral,
        index,
        collateralAmount,
        leverage,
        isLong
      );
      console.log(`
${description}
- gmx v1
  - collateralAmount: ${gmxOrder.collateralAmount}
  - size            : ${gmxOrder.size}
- mux
  - collateralAmount: ${muxOrder.collateralAmount}
  - size            : ${muxOrder.size}
`);
    };

    console.log("eth market");
    await quote(
      "long: eth -> weth",
      WETH,
      WETH,
      ethers.parseEther("10"),
      10n,
      true
    );
    await quote(
      "long: wbtc -> weth",
      WBTC,
      WETH,
      ethers.parseUnits("1", 8),
      10n,
      true
    );
    await quote(
      "long: usdc -> weth",
      USDC,
      WETH,
      ethers.parseUnits("100", 6),
      10n,
      true
    );
    await quote(
      "short: weth -> weth",
      WETH,
      WETH,
      ethers.parseEther("10"),
      10n,
      false
    );
    await quote(
      "short: wbtc -> weth",
      WBTC,
      WETH,
      ethers.parseUnits("1", 8),
      10n,
      false
    );
    await quote(
      "short: usdc -> weth",
      USDC,
      WETH,
      ethers.parseUnits("100", 6),
      10n,
      false
    );
    console.log("btc market");
    await quote(
      "short: weth -> wbtc",
      WETH,
      WBTC,
      ethers.parseEther("10"),
      10n,
      false
    );
    await quote(
      "short: wbtc -> wbtc",
      WBTC,
      WBTC,
      ethers.parseUnits("1", 8),
      10n,
      false
    );
    await quote(
      "short: usdc -> wbtc",
      USDC,
      WBTC,
      ethers.parseUnits("100", 6),
      10n,
      false
    );
    await quote(
      "short: eth -> wbtc",
      WETH,
      WBTC,
      ethers.parseEther("10"),
      10n,
      false
    );
    await quote(
      "short: wbtc -> wbtc",
      WBTC,
      WBTC,
      ethers.parseUnits("1", 8),
      10n,
      false
    );
    await quote(
      "short: usdc -> wbtc",
      USDC,
      WBTC,
      ethers.parseUnits("100", 6),
      10n,
      false
    );
  });
});
