const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../../fixture/setup");

const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";
// stable tokens
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const USDCe = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";
const USDT = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";

const longParams = [
  {
    collateral: WETH,
    index: WETH,
    collateralName: "WETH",
    indexName: "WETH",
    collateralAmount: ethers.parseEther("1"),
    size: ethers.parseEther("10"),
    isLong: true,
    collateralPrice: ethers.parseUnits("2000", 30),
    indexPrice: ethers.parseUnits("2000", 30),
    indexPriceAfter: ethers.parseUnits("2200", 30),
  },
  {
    collateral: WBTC,
    index: WBTC,
    collateralName: "WBTC",
    indexName: "WBTC",
    collateralAmount: ethers.parseUnits("0.05", 8),
    size: ethers.parseUnits("0.5", 8),
    isLong: true,
    collateralPrice: ethers.parseUnits("40000", 30),
    indexPrice: ethers.parseUnits("40000", 30),
    indexPriceAfter: ethers.parseUnits("44000", 30),
  },
];

const shortParams = [
  {
    collateral: USDC,
    index: WETH,
    collateralName: "USDC",
    indexName: "WETH",
    collateralAmount: ethers.parseUnits("2000", 6),
    size: ethers.parseEther("10"),
    isLong: false,
    collateralPrice: ethers.parseUnits("1", 30),
    indexPrice: ethers.parseUnits("2000", 30),
    indexPriceAfter: ethers.parseUnits("1800", 30),
  },
  {
    collateral: USDCe,
    index: WETH,
    collateralName: "USDCe",
    indexName: "WETH",
    collateralAmount: ethers.parseUnits("2000", 6),
    size: ethers.parseEther("10"),
    isLong: false,
    collateralPrice: ethers.parseUnits("1", 30),
    indexPrice: ethers.parseUnits("2000", 30),
    indexPriceAfter: ethers.parseUnits("1800", 30),
  },
  {
    collateral: USDT,
    index: WETH,
    collateralName: "USDT",
    indexName: "WETH",
    collateralAmount: ethers.parseUnits("2000", 6),
    size: ethers.parseEther("10"),
    isLong: false,
    collateralPrice: ethers.parseUnits("1", 30),
    indexPrice: ethers.parseUnits("2000", 30),
    indexPriceAfter: ethers.parseUnits("1800", 30),
  },
  {
    collateral: USDC,
    index: WBTC,
    collateralName: "USDC",
    indexName: "WBTC",
    collateralAmount: ethers.parseUnits("2000", 6),
    size: ethers.parseUnits("0.5", 8),
    isLong: false,
    collateralPrice: ethers.parseUnits("1", 30),
    indexPrice: ethers.parseUnits("40000", 30),
    indexPriceAfter: ethers.parseUnits("36000", 30),
  },
  {
    collateral: USDCe,
    index: WBTC,
    collateralName: "USDCe",
    indexName: "WBTC",
    collateralAmount: ethers.parseUnits("2000", 6),
    size: ethers.parseUnits("0.5", 8),
    isLong: false,
    collateralPrice: ethers.parseUnits("1", 30),
    indexPrice: ethers.parseUnits("40000", 30),
    indexPriceAfter: ethers.parseUnits("36000", 30),
  },
  {
    collateral: USDT,
    index: WBTC,
    collateralName: "USDT",
    indexName: "WBTC",
    collateralAmount: ethers.parseUnits("2000", 6),
    size: ethers.parseUnits("0.5", 8),
    isLong: false,
    collateralPrice: ethers.parseUnits("1", 30),
    indexPrice: ethers.parseUnits("40000", 30),
    indexPriceAfter: ethers.parseUnits("36000", 30),
  },
];

describe("gmxV1: getPnL", () => {
  for (let i = 0; i < longParams.length; i++) {
    it(`long: ${longParams[i].collateralName} -> ${longParams[i].indexName}`, async () => {
      const {
        gmxV1,
        account,
        minExecutionFee,
        deposit,
        increasePosition,
        increaseCollateral,
        decreaseCollateral,
        decreasePosition,
        setPrice,
        checkBalance,
        printWrapPosition,
      } = await loadFixture(deploy);

      const {
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        collateralPrice,
        indexPrice,
        indexPriceAfter,
      } = longParams[i];

      await setPrice(
        gmxV1,
        collateral,
        collateralPrice,
        collateralPrice,
        false
      );
      await setPrice(gmxV1, index, indexPrice, indexPrice, true);
      {
        await deposit(collateral, collateralAmount);
        await increasePosition(
          gmxV1,
          collateral,
          index,
          collateralAmount,
          size,
          isLong,
          minExecutionFee
        );
        await checkBalance(account);
        await printWrapPosition(gmxV1.target, collateral, index, isLong);
      }
      await setPrice(gmxV1, index, indexPriceAfter, indexPriceAfter, true);
      {
        await deposit(collateral, collateralAmount);
        await increaseCollateral(
          gmxV1,
          collateral,
          index,
          collateralAmount,
          isLong,
          minExecutionFee
        );
        await checkBalance(account);
        await printWrapPosition(gmxV1.target, collateral, index, isLong);
      }
      {
        await decreaseCollateral(
          gmxV1,
          collateral,
          index,
          collateralAmount,
          isLong,
          minExecutionFee
        );
        await checkBalance(account);
        await printWrapPosition(gmxV1.target, collateral, index, isLong);
      }
      {
        await decreasePosition(
          gmxV1,
          collateral,
          index,
          collateralAmount,
          size,
          isLong,
          minExecutionFee
        );
        await checkBalance(account);
        await printWrapPosition(gmxV1.target, collateral, index, isLong);
      }
    });
  }

  for (let i = 0; i < shortParams.length; i++) {
    it(`short: ${shortParams[i].collateralName} -> ${shortParams[i].indexName}`, async () => {
      const {
        gmxV1,
        account,
        minExecutionFee,
        deposit,
        increasePosition,
        increaseCollateral,
        decreaseCollateral,
        decreasePosition,
        setPrice,
        checkBalance,
        printWrapPosition,
      } = await loadFixture(deploy);

      const {
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        collateralPrice,
        indexPrice,
        indexPriceAfter,
      } = shortParams[i];

      await setPrice(
        gmxV1,
        collateral,
        collateralPrice,
        collateralPrice,
        false
      );
      await setPrice(gmxV1, index, indexPrice, indexPrice, true);
      {
        await deposit(collateral, collateralAmount);
        await increasePosition(
          gmxV1,
          collateral,
          index,
          collateralAmount,
          size,
          isLong,
          minExecutionFee
        );
        await checkBalance(account);
        await printWrapPosition(gmxV1.target, collateral, index, isLong);
      }
      await setPrice(gmxV1, index, indexPriceAfter, indexPriceAfter, true);
      {
        await deposit(collateral, collateralAmount);
        await increaseCollateral(
          gmxV1,
          collateral,
          index,
          collateralAmount,
          isLong,
          minExecutionFee
        );
        await checkBalance(account);
        await printWrapPosition(gmxV1.target, collateral, index, isLong);
      }
      {
        await decreaseCollateral(
          gmxV1,
          collateral,
          index,
          collateralAmount,
          isLong,
          minExecutionFee
        );
        await checkBalance(account);
        await printWrapPosition(gmxV1.target, collateral, index, isLong);
      }
      {
        await decreasePosition(
          gmxV1,
          collateral,
          index,
          collateralAmount,
          size,
          isLong,
          minExecutionFee
        );
        await checkBalance(account);
        await printWrapPosition(gmxV1.target, collateral, index, isLong);
      }
    });
  }
});
