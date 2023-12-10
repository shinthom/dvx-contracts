const { ethers } = require("hardhat");

describe("GMXV1", () => {
  // gmx contracts
  const PositionRouter = "0xb87a436b93ffe9d75c5cfa7bacfff96430b09868";
  const Router = "0xabbc5f99639c9b6bcb58544ddf04efa6802f4064";
  const Vault = "0x489ee077994b6658eafa855c308275ead8097c4a";
  // uniswap
  const SwapRouter = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

  // token contracts
  const WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
  const USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";

  // signers
  let user0;
  let impersonatedAdmin;

  // contracts
  let gmxV1;
  let positionRouter;
  let weth;
  let usdc;

  const fee = BigInt("180000000000000");

  const executeIncreasePosition = async () => {
    const increasePositionsIndex = await positionRouter.increasePositionsIndex(
      gmxV1.target
    );
    const requestKey = await positionRouter.getRequestKey(
      gmxV1.target,
      increasePositionsIndex
    );
    await gmxV1.executeIncreasePosition(requestKey, user0.address);
  };

  const executeDecreasePosition = async () => {
    const decreasePositionsIndex = await positionRouter.decreasePositionsIndex(
      gmxV1.target
    );
    const requestKey = await positionRouter.getRequestKey(
      gmxV1.target,
      decreasePositionsIndex
    );
    await gmxV1.executeDecreasePosition(requestKey, user0.address);
  };

  before(async () => {
    [user0] = await ethers.getSigners();
    impersonatedAdmin = await ethers.getImpersonatedSigner(
      "0xb4d2603b2494103c90b2c607261dd85484b49ef0" // gmx admin
    );

    positionRouter = await ethers.getContractAt(
      "IPositionRouter",
      PositionRouter
    );
    // execution reverted: delay
    await positionRouter.connect(impersonatedAdmin).setDelayValues(0, 0, 100);

    weth = await ethers.getContractAt("IERC20", WETH);
    usdc = await ethers.getContractAt("IERC20", USDC);
  });

  beforeEach(async () => {
    gmxV1 = await ethers.deployContract("GMXV1", [
      PositionRouter,
      Router,
      Vault,
      SwapRouter,
    ]);
  });

  describe("long", () => {
    const long = true;

    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseUnits("6000", 30);

    beforeEach(async () => {
      await weth.deposit({ value: collateralAmount });
      await weth.transfer(gmxV1.target, collateralAmount);
    });

    it("increase position", async () => {
      await gmxV1.increasePosition(
        collateral,
        index,
        collateralAmount,
        size,
        long,
        {
          value: fee,
        }
      );
      await executeIncreasePosition();

      const position = await gmxV1.getPosition(gmxV1.target, WETH, WETH, long);
      console.log(`position: ${position}`);
    });

    describe("after increase position", () => {
      beforeEach(async () => {
        await gmxV1.increasePosition(
          collateral,
          index,
          collateralAmount,
          size,
          long,
          {
            value: fee,
          }
        );
        await executeIncreasePosition();

        const position = await gmxV1.getPosition(
          gmxV1.target,
          WETH,
          WETH,
          long
        );
        console.log(`position: ${position}`);
      });

      it("decrease position (1/2)", async () => {
        await gmxV1.decreasePosition(collateral, index, size / 2n, long, {
          value: fee,
        });
        await executeDecreasePosition();

        const position = await gmxV1.getPosition(
          gmxV1.target,
          WETH,
          WETH,
          long
        );
        console.log(`position: ${position}`);
      });

      it("decrease position (2/2)", async () => {
        await gmxV1.decreasePosition(collateral, index, size, long, {
          value: fee,
        });
        await executeDecreasePosition();

        const position = await gmxV1.getPosition(
          gmxV1.target,
          WETH,
          WETH,
          long
        );
        console.log(`position: ${position}`);
      });

      it("increase collateral", async () => {
        await weth.deposit({ value: collateralAmount });
        await weth.transfer(gmxV1.target, collateralAmount);

        await gmxV1.increaseCollateral(
          collateral,
          index,
          collateralAmount,
          long,
          {
            value: fee,
          }
        );
        await executeIncreasePosition();

        const position = await gmxV1.getPosition(
          gmxV1.target,
          WETH,
          WETH,
          long
        );
        console.log(`position: ${position}`);
      });

      it("decrease collateral", async () => {
        const amountUsd = ethers.parseUnits("1000", 30);
        await gmxV1.decreaseCollateral(collateral, index, amountUsd, long, {
          value: fee,
        });
        await executeDecreasePosition();

        const position = await gmxV1.getPosition(
          gmxV1.target,
          WETH,
          WETH,
          long
        );
        console.log(`position: ${position}`);
      });
    });
  });

  describe("short", () => {
    const short = false;

    const collateral = USDC;
    const index = WETH;

    const collateralAmount = ethers.parseUnits("1000", 6);
    const size = ethers.parseUnits("6000", 30);

    beforeEach(async () => {
      const ethAmount = ethers.parseEther("1");

      await weth.deposit({ value: ethAmount });
      await weth.transfer(gmxV1.target, ethAmount);

      await gmxV1.swap(WETH, USDC, ethAmount);
      await usdc.transfer(gmxV1.target, collateralAmount);
    });

    it("increase position", async () => {
      await gmxV1.increasePosition(
        collateral,
        index,
        collateralAmount,
        size,
        short,
        {
          value: fee,
        }
      );
      await executeIncreasePosition();

      const position = await gmxV1.getPosition(gmxV1.target, USDC, WETH, short);
      console.log(`position: ${position}`);
    });

    describe("after increase position", () => {
      beforeEach(async () => {
        await gmxV1.increasePosition(
          collateral,
          index,
          collateralAmount,
          size,
          short,
          {
            value: fee,
          }
        );
        await executeIncreasePosition();

        const position = await gmxV1.getPosition(
          gmxV1.target,
          USDC,
          WETH,
          short
        );
        console.log(`position: ${position}`);
      });

      it("decrease position (1/2)", async () => {
        await gmxV1.decreasePosition(collateral, index, size / 2n, short, {
          value: fee,
        });
        await executeDecreasePosition();

        const position = await gmxV1.getPosition(
          gmxV1.target,
          USDC,
          WETH,
          short
        );
        console.log(`position: ${position}`);
      });

      it("decrease position (2/2)", async () => {
        await gmxV1.decreasePosition(collateral, index, size, short, {
          value: fee,
        });
        await executeDecreasePosition();

        const position = await gmxV1.getPosition(
          gmxV1.target,
          USDC,
          WETH,
          short
        );
        console.log(`position: ${position}`);
      });

      it("increase collateral", async () => {
        await usdc.transfer(gmxV1.target, collateralAmount);
        await gmxV1.increaseCollateral(
          collateral,
          index,
          collateralAmount,
          short,
          {
            value: fee,
          }
        );
        await executeIncreasePosition();

        const position = await gmxV1.getPosition(
          gmxV1.target,
          USDC,
          WETH,
          short
        );
        console.log(`position: ${position}`);
      });

      it("decrease collateral", async () => {
        const amountUsd = ethers.parseUnits("500", 30);
        await gmxV1.decreaseCollateral(collateral, index, amountUsd, short, {
          value: fee,
        });
        await executeDecreasePosition();

        const position = await gmxV1.getPosition(
          gmxV1.target,
          USDC,
          WETH,
          short
        );
        console.log(`position: ${position}`);
      });
    });
  });
});
