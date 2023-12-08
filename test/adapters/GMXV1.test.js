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

  before(async () => {
    [user0] = await ethers.getSigners();
    impersonatedAdmin = await ethers.getImpersonatedSigner(
      "0xb4d2603b2494103c90b2c607261dd85484b49ef0" // gmx admin
    );

    positionRouter = await ethers.getContractAt(
      "IPositionRouter",
      PositionRouter
    );
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
    // execution reverted: delay
    await positionRouter.connect(impersonatedAdmin).setDelayValues(0, 0, 100);
  });

  describe("long", () => {
    const long = true;

    const collateral = WETH;
    const index = WETH;
    const amount = ethers.parseEther("0.1");
    const size = ethers.parseUnits("6000", 30);

    beforeEach(async () => {
      await weth.deposit({ value: amount });
      await weth.approve(gmxV1.target, amount);
    });

    it("increases position", async () => {
      await gmxV1.increasePosition(collateral, index, amount, size, long, fee, {
        value: fee,
      });

      const requestKey = await gmxV1.requestKey();
      await gmxV1.executeIncreasePosition(requestKey, user0.address);

      const position = await gmxV1.getPosition(WETH, WETH, long);
      // console.log(position);
    });

    describe("after increase position", () => {
      beforeEach(async () => {
        await gmxV1.increasePosition(
          collateral,
          index,
          amount,
          size,
          long,
          fee,
          {
            value: fee,
          }
        );

        const requestKey = await gmxV1.requestKey();
        await gmxV1.executeIncreasePosition(requestKey, user0.address);

        const position = await gmxV1.getPosition(WETH, WETH, long);
        // console.log(position);
      });

      it("decrease position (1/2)", async () => {
        await gmxV1.decreasePosition(collateral, index, size / 2n, long, fee, {
          value: fee,
        });

        const requestKey = await gmxV1.requestKey();
        await gmxV1.executeDecreasePosition(requestKey, user0.address);

        const position = await gmxV1.getPosition(WETH, WETH, long);
        // console.log(position);
      });

      it("decrease position (2/2)", async () => {
        await gmxV1.decreasePosition(collateral, index, size, long, fee, {
          value: fee,
        });

        const requestKey = await gmxV1.requestKey();
        await gmxV1.executeDecreasePosition(requestKey, user0.address);

        const position = await gmxV1.getPosition(WETH, WETH, long);
        // console.log(position);
      });

      it("increase collateral", async () => {
        await weth.deposit({ value: amount });
        await weth.approve(gmxV1.target, amount);

        await gmxV1.increaseCollateral(collateral, index, amount, long, fee, {
          value: fee,
        });

        const requestKey = await gmxV1.requestKey();
        await gmxV1.executeIncreasePosition(requestKey, user0.address);

        const position = await gmxV1.getPosition(WETH, WETH, long);
        // console.log(position);
      });

      it("decrease collateral (half)", async () => {
        const amountUsd = ethers.parseUnits("100", 30);
        await gmxV1.decreaseCollateral(
          collateral,
          index,
          amountUsd,
          long,
          fee,
          {
            value: fee,
          }
        );

        const requestKey = await gmxV1.requestKey();

        await gmxV1.executeDecreasePosition(requestKey, user0.address);

        const position = await gmxV1.getPosition(WETH, WETH, long);
        // console.log(position);
      });
    });
  });

  describe("short", () => {
    const short = false;

    const collateral = USDC;
    const index = WETH;

    const amount = ethers.parseUnits("600", 6);
    const size = ethers.parseUnits("6000", 30);

    beforeEach(async () => {
      const ethAmount = ethers.parseEther("1");

      await weth.deposit({ value: ethAmount });
      await weth.transfer(gmxV1.target, ethAmount);

      await gmxV1.swap(WETH, USDC, ethAmount);
      await usdc.approve(gmxV1.target, amount);
    });

    it("increases position", async () => {
      await gmxV1.increasePosition(
        collateral,
        index,
        amount,
        size,
        short,
        fee,
        {
          value: fee,
        }
      );

      const requestKey = await gmxV1.requestKey();
      await gmxV1.executeIncreasePosition(requestKey, user0.address);

      const position = await gmxV1.getPosition(USDC, WETH, short);
      // console.log(position);
    });

    describe("after increase position", () => {
      beforeEach(async () => {
        await gmxV1.increasePosition(
          collateral,
          index,
          amount,
          size,
          short,
          fee,
          {
            value: fee,
          }
        );

        const requestKey = await gmxV1.requestKey();
        await gmxV1.executeIncreasePosition(requestKey, user0.address);

        const position = await gmxV1.getPosition(USDC, WETH, short);
        // console.log(position);
      });

      it("decrease position (1/2)", async () => {
        await gmxV1.decreasePosition(collateral, index, size / 2n, short, fee, {
          value: fee,
        });

        const requestKey = await gmxV1.requestKey();
        await gmxV1.executeDecreasePosition(requestKey, user0.address);

        const position = await gmxV1.getPosition(USDC, WETH, short);
        // console.log(position);
      });

      it("decrease position (2/2)", async () => {
        await gmxV1.decreasePosition(collateral, index, size, short, fee, {
          value: fee,
        });

        const requestKey = await gmxV1.requestKey();
        await gmxV1.executeDecreasePosition(requestKey, user0.address);

        const position = await gmxV1.getPosition(USDC, WETH, short);
        // console.log(position);
      });

      it("increase collateral", async () => {
        await usdc.approve(gmxV1.target, amount);
        await gmxV1.increaseCollateral(collateral, index, amount, short, fee, {
          value: fee,
        });

        const requestKey = await gmxV1.requestKey();
        await gmxV1.executeIncreasePosition(requestKey, user0.address);

        const position = await gmxV1.getPosition(USDC, WETH, short);
        // console.log(position);
      });

      it("decrease collateral (half)", async () => {
        const amountUsd = ethers.parseUnits("100", 30);
        await gmxV1.decreaseCollateral(
          collateral,
          index,
          amountUsd,
          short,
          fee,
          {
            value: fee,
          }
        );

        const requestKey = await gmxV1.requestKey();
        await gmxV1.executeDecreasePosition(requestKey, user0.address);

        const position = await gmxV1.getPosition(USDC, WETH, short);
        // console.log(position);
      });
    });
  });
});
