const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../../fixture/setup");

describe("gmxV1: marketOrder", () => {
  it("long: eth -> eth", async () => {
    const {
      gmxV1,
      user,
      account,
      orderType,
      ETH,
      WETH,
      minExecutionFee,
      executeIncreasePosition,
      executeDecreasePosition,
      replaceFastPriceFeedAndSetPrice,
      printPosition,
    } = await loadFixture(deploy);

    const minPrice = ethers.parseUnits("2000", 30);
    const maxPrice = ethers.parseUnits("2000", 30);
    await replaceFastPriceFeedAndSetPrice(WETH, minPrice, maxPrice);

    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = true;

    {
      await account.deposit(ETH, collateralAmount, { value: collateralAmount });
      const positionOrder = await gmxV1.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders(
        [gmxV1.target],
        [
          {
            orderType: positionOrder.orderType,
            path: [...positionOrder.path],
            index: positionOrder.index,
            collateralAmount: positionOrder.collateralAmount,
            size: positionOrder.size,
            isLong: positionOrder.isLong,
          },
        ],
        { value: minExecutionFee }
      );
      await executeIncreasePosition(account.target);
      await printPosition(gmxV1.target, collateral, index, isLong);
    }
    {
      await account.deposit(ETH, collateralAmount, { value: collateralAmount });
      await account.connect(user).createMarketOrders(
        [gmxV1.target],
        [
          {
            orderType: orderType.increaseCollateral,
            path: [collateral],
            index: index,
            collateralAmount: collateralAmount,
            size: 0,
            isLong: isLong,
          },
        ],
        { value: minExecutionFee }
      );
      await executeIncreasePosition(account.target);
      await printPosition(gmxV1.target, collateral, index, isLong);
    }
    {
      await account.connect(user).createMarketOrders(
        [gmxV1.target],
        [
          {
            orderType: orderType.decreaseCollateral,
            path: [collateral],
            index: index,
            collateralAmount: collateralAmount,
            size: 0,
            isLong: isLong,
          },
        ],
        { value: minExecutionFee }
      );
      await executeDecreasePosition(account.target);
      await printPosition(gmxV1.target, collateral, index, isLong);
    }
    {
      await account.connect(user).createMarketOrders(
        [gmxV1.target],
        [
          {
            orderType: orderType.decreasePosition,
            path: [collateral],
            index: index,
            collateralAmount: 0,
            size: (size * 99n) / 100n,
            isLong: isLong,
          },
        ],
        { value: minExecutionFee }
      );
      await executeDecreasePosition(account.target);
      await printPosition(gmxV1.target, collateral, index, isLong);
    }
  });

  it("short: usdc -> eth", async () => {
    const {
      gmxV1,
      user,
      account,
      orderType,
      ETH,
      WETH,
      USDC,
      usdc,
      vault,
      minExecutionFee,
      faucet,
      executeIncreasePosition,
      executeDecreasePosition,
      replaceFastPriceFeedAndSetPrice,
      setPrice,
      printPosition,
    } = await loadFixture(deploy);

    const ethMinPrice = ethers.parseUnits("2000", 30);
    const ethMaxPrice = ethers.parseUnits("2000", 30);
    await replaceFastPriceFeedAndSetPrice(WETH, ethMinPrice, ethMaxPrice);
    const usdcPrice = ethers.parseUnits("1", 30);
    await setPrice(USDC, usdcPrice, usdcPrice);

    const collateral = USDC;
    const index = WETH;
    const collateralAmount = ethers.parseUnits("1000", 6);
    const size = ethers.parseEther("10");
    const isLong = false;

    {
      await faucet(USDC, collateralAmount);
      await usdc.connect(user).approve(account.target, collateralAmount);
      await account.connect(user).deposit(USDC, collateralAmount);
      const positionOrder = await gmxV1.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders(
        [gmxV1.target],
        [
          {
            orderType: positionOrder.orderType,
            path: [...positionOrder.path],
            index: positionOrder.index,
            collateralAmount: positionOrder.collateralAmount,
            size: positionOrder.size,
            isLong: positionOrder.isLong,
          },
        ],
        { value: minExecutionFee }
      );
      await executeIncreasePosition(account.target);
      await printPosition(gmxV1.target, collateral, index, isLong);
    }
    {
      await faucet(USDC, collateralAmount);
      await usdc.connect(user).approve(account.target, collateralAmount);
      await account.connect(user).deposit(USDC, collateralAmount);
      await account.connect(user).createMarketOrders(
        [gmxV1.target],
        [
          {
            orderType: orderType.increaseCollateral,
            path: [collateral],
            index: index,
            collateralAmount: collateralAmount,
            size: 0,
            isLong: isLong,
          },
        ],
        { value: minExecutionFee }
      );
      await executeIncreasePosition(account.target);
      await printPosition(gmxV1.target, collateral, index, isLong);
    }
    {
      await account.connect(user).createMarketOrders(
        [gmxV1.target],
        [
          {
            orderType: orderType.decreaseCollateral,
            path: [collateral],
            index: index,
            collateralAmount: collateralAmount,
            size: 0,
            isLong: isLong,
          },
        ],
        { value: minExecutionFee }
      );
      await executeDecreasePosition(account.target);
      await printPosition(gmxV1.target, collateral, index, isLong);
    }
    {
      await account.connect(user).createMarketOrders(
        [gmxV1.target],
        [
          {
            orderType: orderType.decreasePosition,
            path: [collateral],
            index: index,
            collateralAmount: 0,
            size: size,
            isLong: isLong,
          },
        ],
        { value: minExecutionFee }
      );
      await executeDecreasePosition(account.target);
      await printPosition(gmxV1.target, collateral, index, isLong);
    }
  });
});
