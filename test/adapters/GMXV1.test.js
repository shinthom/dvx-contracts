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
  const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

  const orderType = {
    increasePosition: 0,
    decreasePosition: 1,
    increaseCollateral: 2,
    decreaseCollateral: 3,
  };

  const fee = BigInt("180000000000000");

  // signers
  let user0;
  let impersonatedAdmin;

  // contracts
  let gmxV1;
  let positionRouter;
  let weth;
  let usdc;

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
    wbtc = await ethers.getContractAt("IERC20", WBTC);
  });

  beforeEach(async () => {
    gmxV1 = await ethers.deployContract("GMXV1", [
      PositionRouter,
      Router,
      Vault,
      SwapRouter,
    ]);
  });

  describe("fee", () => {
    const depositAmount = ethers.parseEther("10");
    const fee = ethers.parseEther("0.00018");
    const size = ethers.parseUnits("6000", 30);

    beforeEach(async () => {
      await weth.deposit({ value: depositAmount });
      await weth.transfer(gmxV1.target, depositAmount);
    });

    it("ETH -> ETH (long)", async () => {
      let position;

      console.log("\n`increasePosition`");
      {
        const collateralAmount = ethers.parseEther("1");
        await gmxV1.increasePosition(WETH, WETH, collateralAmount, size, true, {
          value: fee + collateralAmount,
        });
        await executeIncreasePosition();
        position = await gmxV1.getPosition(gmxV1.target, WETH, WETH, true);
        const { feeUsd, collateralAmountUsd } = await gmxV1.getFeeUsd(
          orderType.increasePosition,
          WETH,
          WETH,
          collateralAmount,
          size,
          true // long
        );
        console.log(`position  : ${position}`);
        console.log(
          "realFeeUsd:",
          collateralAmountUsd - position.collateralAmount
        );
        console.log("feeUsd    :", feeUsd);
      }

      console.log("\n`increaseCollateral`");
      {
        const beforeCollateralAmountUsd = position.collateralAmount;

        const collateralAmount = ethers.parseEther("1");
        await gmxV1.increaseCollateral(WETH, WETH, collateralAmount, true, {
          value: fee + collateralAmount,
        });
        await executeIncreasePosition();
        position = await gmxV1.getPosition(gmxV1.target, WETH, WETH, true);
        const collateralUsdDelta =
          position.collateralAmount - beforeCollateralAmountUsd;

        const { feeUsd, collateralAmountUsd } = await gmxV1.getFeeUsd(
          orderType.increaseCollateral,
          WETH,
          WETH,
          collateralAmount,
          0,
          true // long
        );
        console.log(`position  : ${position}`);
        console.log("realFeeUsd:", collateralAmountUsd - collateralUsdDelta);
        console.log("feeUsd    :", feeUsd);
      }

      console.log("\n`decreaseCollateral`");
      {
        const beforeCollateralAmountUsd = position.collateralAmount;

        const collateralAmount = ethers.parseUnits("2000", 30);
        await gmxV1.decreaseCollateral(WETH, WETH, collateralAmount, true, {
          value: fee,
        });
        await executeDecreasePosition();
        position = await gmxV1.getPosition(gmxV1.target, WETH, WETH, true);

        const { feeUsd, collateralAmountUsd } = await gmxV1.getFeeUsd(
          orderType.decreaseCollateral,
          WETH,
          WETH,
          collateralAmount,
          0,
          true // long
        );
        console.log(`position  : ${position}`);
        console.log(
          "realFeeUsd:",
          beforeCollateralAmountUsd -
            collateralAmount -
            position.collateralAmount
        );
        console.log("feeUsd    :", feeUsd);
      }

      console.log("\n`decreasePosition`");
      {
        const decreaseSize = size / 2n;
        const beforeCollateralAmountUsd = position.collateralAmount;

        await gmxV1.decreasePosition(WETH, WETH, decreaseSize, true, {
          value: fee,
        });
        await executeDecreasePosition();
        position = await gmxV1.getPosition(gmxV1.target, WETH, WETH, true);

        const { feeUsd, collateralAmountUsd } = await gmxV1.getFeeUsd(
          orderType.decreasePosition,
          WETH,
          WETH,
          0,
          decreaseSize,
          true // long
        );
        console.log(
          "realFeeUsd:",
          beforeCollateralAmountUsd - position.collateralAmount
        );
        console.log("feeUsd    :", feeUsd);
      }
    });

    it("USDC -> ETH (short)", async () => {
      await gmxV1.swap(WETH, USDC, depositAmount);
      await usdc.transfer(gmxV1.target, await usdc.balanceOf(user0.address));

      let position;

      console.log("\n`increasePosition`");
      {
        const collateralAmount = ethers.parseUnits("600", 6);
        await gmxV1.increasePosition(
          USDC,
          WETH,
          collateralAmount,
          size,
          false,
          {
            value: fee,
          }
        );
        await executeIncreasePosition();
        position = await gmxV1.getPosition(gmxV1.target, USDC, WETH, false);
        const { feeUsd, collateralAmountUsd } = await gmxV1.getFeeUsd(
          orderType.increasePosition,
          USDC,
          WETH,
          collateralAmount,
          size,
          false // short
        );
        console.log(`position  : ${position}`);
        console.log(
          "realFeeUsd:",
          collateralAmountUsd - position.collateralAmount
        );
        console.log("feeUsd    :", feeUsd);
      }

      console.log("\n`increaseCollateral`");
      {
        const beforeCollateralAmountUsd = position.collateralAmount;

        const collateralAmount = ethers.parseUnits("600", 6);
        await gmxV1.increaseCollateral(USDC, WETH, collateralAmount, false, {
          value: fee + collateralAmount,
        });
        await executeIncreasePosition();
        position = await gmxV1.getPosition(gmxV1.target, USDC, WETH, false);
        const collateralUsdDelta =
          position.collateralAmount - beforeCollateralAmountUsd;
        console.log(collateralUsdDelta);

        const { feeUsd, collateralAmountUsd } = await gmxV1.getFeeUsd(
          orderType.increaseCollateral,
          USDC,
          WETH,
          collateralAmount,
          0,
          false // short
        );
        console.log(`position  : ${position}`);
        console.log("realFeeUsd:", collateralAmountUsd - collateralUsdDelta);
        console.log("feeUsd    :", feeUsd);
      }

      console.log("\n`decreaseCollateral`");
      {
        const beforeCollateralAmountUsd = position.collateralAmount;

        const collateralAmount = ethers.parseUnits("200", 30);
        await gmxV1.decreaseCollateral(USDC, WETH, collateralAmount, false, {
          value: fee,
        });
        await executeDecreasePosition();
        position = await gmxV1.getPosition(gmxV1.target, USDC, WETH, false);

        const { feeUsd, collateralAmountUsd } = await gmxV1.getFeeUsd(
          orderType.decreaseCollateral,
          USDC,
          WETH,
          collateralAmount,
          0,
          false // long
        );
        console.log(`position  : ${position}`);
        console.log(
          "realFeeUsd:",
          beforeCollateralAmountUsd -
            collateralAmount -
            position.collateralAmount
        );
        console.log("feeUsd    :", feeUsd);
      }

      console.log("\n`decreasePosition`");
      {
        const decreaseSize = size / 2n;
        const beforeCollateralAmountUsd = position.collateralAmount;

        await gmxV1.decreasePosition(USDC, WETH, decreaseSize, false, {
          value: fee,
        });
        await executeDecreasePosition();
        position = await gmxV1.getPosition(gmxV1.target, USDC, WETH, false);

        const { feeUsd, collateralAmountUsd } = await gmxV1.getFeeUsd(
          orderType.decreasePosition,
          USDC,
          WETH,
          0,
          decreaseSize,
          false // short
        );
        console.log(
          "realFeeUsd:",
          beforeCollateralAmountUsd - position.collateralAmount
        );
        console.log("feeUsd    :", feeUsd);
      }
    });
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
          value: fee + collateralAmount,
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
            value: fee + collateralAmount,
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
        await gmxV1.increaseCollateral(
          collateral,
          index,
          collateralAmount,
          long,
          {
            value: fee + collateralAmount,
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

    const collateralAmount = ethers.parseUnits("600", 6);
    const size = ethers.parseUnits("6000", 30);

    beforeEach(async () => {
      const depositAmount = ethers.parseEther("10");
      await weth.deposit({ value: depositAmount });
      await weth.transfer(gmxV1.target, depositAmount);

      await gmxV1.swap(WETH, USDC, depositAmount);
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
