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
  // {
  //   collateral: WETH,
  //   index: WETH,
  //   collateralName: "WETH",
  //   indexName: "WETH",
  //   collateralAmount: ethers.parseEther("1"),
  //   size: ethers.parseEther("10"),
  //   isLong: true,
  //   collateralPrice: ethers.parseUnits("2000", 8),
  //   indexPrice: ethers.parseUnits("2000", 8),
  //   indexPriceAfter: ethers.parseUnits("2200", 8),
  // },
  // {
  //   collateral: WBTC,
  //   index: WETH,
  //   collateralName: "WBTC",
  //   indexName: "WETH",
  //   collateralAmount: ethers.parseUnits("0.05", 8),
  //   size: ethers.parseEther("10"),
  //   isLong: true,
  //   collateralPrice: ethers.parseUnits("40000", 8),
  //   indexPrice: ethers.parseUnits("2000", 8),
  //   indexPriceAfter: ethers.parseUnits("2200", 8),
  // },
  // {
  //   collateral: USDC,
  //   index: WETH,
  //   collateralName: "USDC",
  //   indexName: "WETH",
  //   collateralAmount: ethers.parseUnits("2000", 6),
  //   size: ethers.parseEther("10"),
  //   isLong: true,
  //   collateralPrice: ethers.parseUnits("1", 8),
  //   indexPrice: ethers.parseUnits("2000", 8),
  //   indexPriceAfter: ethers.parseUnits("2200", 8),
  // },
  // {
  //   collateral: USDCe,
  //   index: WETH,
  //   collateralName: "USDCe",
  //   indexName: "WETH",
  //   collateralAmount: ethers.parseUnits("2000", 6),
  //   size: ethers.parseEther("10"),
  //   isLong: true,
  //   collateralPrice: ethers.parseUnits("1", 8),
  //   indexPrice: ethers.parseUnits("2000", 8),
  //   indexPriceAfter: ethers.parseUnits("2200", 8),
  // },
  // {
  //   collateral: USDT,
  //   index: WETH,
  //   collateralName: "USDT",
  //   indexName: "WETH",
  //   collateralAmount: ethers.parseUnits("2000", 6),
  //   size: ethers.parseEther("10"),
  //   isLong: true,
  //   collateralPrice: ethers.parseUnits("1", 8),
  //   indexPrice: ethers.parseUnits("2000", 8),
  //   indexPriceAfter: ethers.parseUnits("2200", 8),
  // },

  // {
  //   collateral: WETH,
  //   index: WBTC,
  //   collateralName: "WETH",
  //   indexName: "WBTC",
  //   collateralAmount: ethers.parseEther("1"),
  //   size: ethers.parseUnits("0.5", 8),
  //   isLong: true,
  //   collateralPrice: ethers.parseUnits("2000", 8),
  //   indexPrice: ethers.parseUnits("40000", 8),
  //   indexPriceAfter: ethers.parseUnits("44000", 8),
  // },
  // {
  //   collateral: WBTC,
  //   index: WBTC,
  //   collateralName: "WBTC",
  //   indexName: "WBTC",
  //   collateralAmount: ethers.parseUnits("0.05", 8),
  //   size: ethers.parseUnits("0.5", 8),
  //   isLong: true,
  //   collateralPrice: ethers.parseUnits("40000", 8),
  //   indexPrice: ethers.parseUnits("40000", 8),
  //   indexPriceAfter: ethers.parseUnits("44000", 8),
  // },
  // {
  //   collateral: USDC,
  //   index: WBTC,
  //   collateralName: "USDC",
  //   indexName: "WBTC",
  //   collateralAmount: ethers.parseUnits("2000", 6),
  //   size: ethers.parseUnits("0.5", 8),
  //   isLong: true,
  //   collateralPrice: ethers.parseUnits("1", 8),
  //   indexPrice: ethers.parseUnits("40000", 8),
  //   indexPriceAfter: ethers.parseUnits("44000", 8),
  // },
  // {
  //   collateral: USDCe,
  //   index: WBTC,
  //   collateralName: "USDCe",
  //   indexName: "WBTC",
  //   collateralAmount: ethers.parseUnits("2000", 6),
  //   size: ethers.parseUnits("0.5", 8),
  //   isLong: true,
  //   collateralPrice: ethers.parseUnits("1", 8),
  //   indexPrice: ethers.parseUnits("40000", 8),
  //   indexPriceAfter: ethers.parseUnits("44000", 8),
  // },
  {
    collateral: USDT,
    index: WBTC,
    collateralName: "USDT",
    indexName: "WBTC",
    collateralAmount: ethers.parseUnits("2000", 6),
    size: ethers.parseUnits("0.5", 8),
    isLong: true,
    collateralPrice: ethers.parseUnits("1", 8),
    indexPrice: ethers.parseUnits("40000", 8),
    indexPriceAfter: ethers.parseUnits("44000", 8),
  },
];

const shortParams = [
  {
    collateral: WETH,
    index: WETH,
    collateralName: "WETH",
    indexName: "WETH",
    collateralAmount: ethers.parseEther("1"),
    size: ethers.parseEther("10"),
    isLong: false,
    collateralPrice: ethers.parseUnits("2000", 8),
    indexPrice: ethers.parseUnits("2000", 8),
    indexPriceAfter: ethers.parseUnits("1800", 8),
  },
  {
    collateral: WBTC,
    index: WETH,
    collateralName: "WBTC",
    indexName: "WETH",
    collateralAmount: ethers.parseUnits("0.05", 8),
    size: ethers.parseEther("10"),
    isLong: false,
    collateralPrice: ethers.parseUnits("40000", 8),
    indexPrice: ethers.parseUnits("2000", 8),
    indexPriceAfter: ethers.parseUnits("1800", 8),
  },
  {
    collateral: USDC,
    index: WETH,
    collateralName: "USDC",
    indexName: "WETH",
    collateralAmount: ethers.parseUnits("2000", 6),
    size: ethers.parseEther("10"),
    isLong: false,
    collateralPrice: ethers.parseUnits("1", 8),
    indexPrice: ethers.parseUnits("2000", 8),
    indexPriceAfter: ethers.parseUnits("1800", 8),
  },
  {
    collateral: USDCe,
    index: WETH,
    collateralName: "USDCe",
    indexName: "WETH",
    collateralAmount: ethers.parseUnits("2000", 6),
    size: ethers.parseEther("10"),
    isLong: false,
    collateralPrice: ethers.parseUnits("1", 8),
    indexPrice: ethers.parseUnits("2000", 8),
    indexPriceAfter: ethers.parseUnits("1800", 8),
  },
  {
    collateral: USDT,
    index: WETH,
    collateralName: "USDT",
    indexName: "WETH",
    collateralAmount: ethers.parseUnits("2000", 6),
    size: ethers.parseEther("10"),
    isLong: false,
    collateralPrice: ethers.parseUnits("1", 8),
    indexPrice: ethers.parseUnits("2000", 8),
    indexPriceAfter: ethers.parseUnits("1800", 8),
  },

  {
    collateral: WETH,
    index: WBTC,
    collateralName: "WETH",
    indexName: "WBTC",
    collateralAmount: ethers.parseEther("1"),
    size: ethers.parseUnits("0.5", 8),
    isLong: false,
    collateralPrice: ethers.parseUnits("2000", 8),
    indexPrice: ethers.parseUnits("40000", 8),
    indexPriceAfter: ethers.parseUnits("36000", 8),
  },
  {
    collateral: WBTC,
    index: WBTC,
    collateralName: "WBTC",
    indexName: "WBTC",
    collateralAmount: ethers.parseUnits("0.05", 8),
    size: ethers.parseUnits("0.5", 8),
    isLong: false,
    collateralPrice: ethers.parseUnits("40000", 8),
    indexPrice: ethers.parseUnits("40000", 8),
    indexPriceAfter: ethers.parseUnits("36000", 8),
  },
  {
    collateral: USDC,
    index: WBTC,
    collateralName: "USDC",
    indexName: "WBTC",
    collateralAmount: ethers.parseUnits("2000", 6),
    size: ethers.parseUnits("0.5", 8),
    isLong: false,
    collateralPrice: ethers.parseUnits("1", 8),
    indexPrice: ethers.parseUnits("40000", 8),
    indexPriceAfter: ethers.parseUnits("36000", 8),
  },
  {
    collateral: USDCe,
    index: WBTC,
    collateralName: "USDCe",
    indexName: "WBTC",
    collateralAmount: ethers.parseUnits("2000", 6),
    size: ethers.parseUnits("0.5", 8),
    isLong: false,
    collateralPrice: ethers.parseUnits("1", 8),
    indexPrice: ethers.parseUnits("40000", 8),
    indexPriceAfter: ethers.parseUnits("36000", 8),
  },
  {
    collateral: USDT,
    index: WBTC,
    collateralName: "USDT",
    indexName: "WBTC",
    collateralAmount: ethers.parseUnits("2000", 6),
    size: ethers.parseUnits("0.5", 8),
    isLong: false,
    collateralPrice: ethers.parseUnits("1", 8),
    indexPrice: ethers.parseUnits("40000", 8),
    indexPriceAfter: ethers.parseUnits("36000", 8),
  },
];

describe("mux: getPnL", () => {
  for (let i = 0; i < longParams.length; i++) {
    it(`long: ${longParams[i].collateralName} -> ${longParams[i].indexName}`, async () => {
      const {
        mux,
        account,
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
      const minExecutionFee = 0;

      await setPrice(mux, collateral, collateralPrice, collateralPrice, false);
      await setPrice(mux, index, indexPrice, indexPrice, true);

      await deposit(collateral, collateralAmount);
      await increasePosition(
        mux,
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        minExecutionFee
      );
      await checkBalance(account);
      await printWrapPosition(mux.target, collateral, index, isLong);

      await setPrice(mux, index, indexPriceAfter, indexPriceAfter, true);

      await deposit(collateral, collateralAmount);
      await increaseCollateral(
        mux,
        collateral,
        index,
        collateralAmount,
        isLong,
        minExecutionFee
      );
      await checkBalance(account);
      await printWrapPosition(mux.target, collateral, index, isLong);

      await decreaseCollateral(
        mux,
        collateral,
        index,
        collateralAmount,
        isLong,
        minExecutionFee
      );
      await checkBalance(account);
      await printWrapPosition(mux.target, collateral, index, isLong);

      await decreasePosition(
        mux,
        collateral,
        index,
        size,
        isLong,
        minExecutionFee
      );
      await checkBalance(account);
      await printWrapPosition(mux.target, collateral, index, isLong);
    });
  }

  // for (let i = 0; i < shortParams.length; i++) {
  //   it(`short: ${shortParams[i].collateralName} -> ${shortParams[i].indexName}`, async () => {
  //     const {
  //       mux,
  //       account,
  //       deposit,
  //       increasePosition,
  //       increaseCollateral,
  //       decreaseCollateral,
  //       decreasePosition,
  //       setPrice,
  //       checkBalance,
  //       printWrapPosition,
  //     } = await loadFixture(deploy);

  //     const minExecutionFee = 0;

  //     const {
  //       collateral,
  //       index,
  //       collateralAmount,
  //       size,
  //       isLong,
  //       collateralPrice,
  //       indexPrice,
  //       indexPriceAfter,
  //     } = shortParams[i];

  //     await setPrice(mux, collateral, collateralPrice, collateralPrice, false);
  //     await setPrice(mux, index, indexPrice, indexPrice, true);
  //     {
  //       await deposit(collateral, collateralAmount);
  //       await increasePosition(
  //         mux,
  //         collateral,
  //         index,
  //         collateralAmount,
  //         size,
  //         isLong,
  //         minExecutionFee
  //       );
  //       await checkBalance(account);
  //       await printWrapPosition(mux.target, collateral, index, isLong);
  //     }
  //     await setPrice(mux, index, indexPriceAfter, indexPriceAfter, true);
  //     {
  //       await deposit(collateral, collateralAmount);
  //       await increaseCollateral(
  //         mux,
  //         collateral,
  //         index,
  //         collateralAmount,
  //         isLong,
  //         minExecutionFee
  //       );
  //       await checkBalance(account);
  //       await printWrapPosition(mux.target, collateral, index, isLong);
  //     }
  //     {
  //       await decreaseCollateral(
  //         mux,
  //         collateral,
  //         index,
  //         collateralAmount,
  //         isLong,
  //         minExecutionFee
  //       );
  //       await checkBalance(account);
  //       await printWrapPosition(mux.target, collateral, index, isLong);
  //     }
  //     {
  //       console.log(await mux.getPrice(index, isLong));
  //       await decreasePosition(
  //         mux,
  //         collateral,
  //         index,
  //         size,
  //         isLong,
  //         minExecutionFee
  //       );
  //       await checkBalance(account);
  //       await printWrapPosition(mux.target, collateral, index, isLong);
  //     }
  //   });
  // }
});
