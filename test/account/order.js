const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy, deployAndDepositUSDC } = require("../fixture/setup");

describe("marketOrder", () => {
  describe("gmxV1", () => {
    it("long: eth -> eth", async () => {
      const {
        gmxV1,
        user,
        account,
        orderType,
        minExecutionFee,
        ETH,
        WETH,
        checkBalance,
        printPosition,
        executeIncreasePosition,
        executeDecreasePosition,
        replaceFastPriceFeedAndSetPrice,
      } = await loadFixture(deploy);
      const collateral = WETH;
      const index = WETH;
      const collateralAmount = ethers.parseEther("1");
      const size = ethers.parseEther("10");
      const isLong = true;
      await account.deposit(ETH, collateralAmount, { value: collateralAmount });
      {
        console.log("`deposit`");
        await checkBalance(account);
      }
      const price = ethers.parseUnits("2000", 30);
      await replaceFastPriceFeedAndSetPrice(WETH, price, price);
      const positionOrder = await gmxV1.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeIncreasePosition(account.target);
      {
        console.log("`increase position`");
        await checkBalance(account);
        await printPosition(gmxV1.target, collateral, index, isLong);
      }
      await account.deposit(ETH, collateralAmount, { value: collateralAmount });
      {
        console.log("`deposit`");
        await checkBalance(account);
      }
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
      {
        console.log("`increase collateral`");
        await checkBalance(account);
        await printPosition(gmxV1.target, collateral, index, isLong);
      }
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
      {
        console.log("`decrease collateral`");
        await checkBalance(account);
        await printPosition(gmxV1.target, collateral, index, isLong);
      }
      const position = await account.getPosition(gmxV1.target, collateral, index, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders(
        [gmxV1.target],
        [
          {
            orderType: orderType.decreasePosition,
            path: [collateral],
            index: index,
            collateralAmount: 0,
            size: position.size,
            isLong: isLong,
          },
        ],
        { value: minExecutionFee }
      );
      await executeDecreasePosition(account.target);
      {
        console.log("`decrease position`");
        await checkBalance(account);
        await printPosition(gmxV1.target, collateral, index, isLong);
      }
    });

    it("short: usdc -> eth", async () => {
      const {
        gmxV1,
        user,
        account,
        orderType,
        minExecutionFee,
        ETH,
        WETH,
        USDC,
        checkBalance,
        printPosition,
        executeIncreasePosition,
        executeDecreasePosition,
        replaceFastPriceFeedAndSetPrice,
      } = await loadFixture(deployAndDepositUSDC);
      const collateral = USDC;
      const index = WETH;
      const collateralAmount = (await account.getBalance(USDC)) / 2n;
      const size = ethers.parseEther("10");
      const isLong = false;
      {
        console.log("`deposit`");
        await checkBalance(account);
      }
      // const price = ethers.parseUnits("2000", 30);
      // await replaceFastPriceFeedAndSetPrice(WETH, price, price);
      const positionOrder = await gmxV1.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeIncreasePosition(account.target);
      {
        console.log("`increase position`");
        await checkBalance(account);
        await printPosition(gmxV1.target, collateral, index, isLong);
      }
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
      {
        console.log("`increase collateral`");
        await checkBalance(account);
        await printPosition(gmxV1.target, collateral, index, isLong);
      }
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
      {
        console.log("`decrease collateral`");
        await checkBalance(account);
        await printPosition(gmxV1.target, collateral, index, isLong);
      }
      const position = await account.getPosition(gmxV1.target, collateral, index, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders(
        [gmxV1.target],
        [
          {
            orderType: orderType.decreasePosition,
            path: [collateral],
            index: index,
            collateralAmount: 0,
            size: position.size,
            isLong: isLong,
          },
        ],
        { value: minExecutionFee }
      );
      await executeDecreasePosition(account.target);
      {
        console.log("`decrease position`");
        await checkBalance(account);
        await printPosition(gmxV1.target, collateral, index, isLong);
      }
    });
  });

  describe("mux", () => {
    it("long: eth -> eth", async () => {
      const {
        mux,
        user,
        account,
        orderType,
        minExecutionFee,
        ETH,
        WETH,
        checkBalance,
        printPosition,
        fillPositionOrder,
        fillWithdrawalOrder,
        replaceOracleReferenceAndSetPrice,
      } = await loadFixture(deploy);
      const collateral = WETH;
      const index = WETH;
      const collateralAmount = ethers.parseEther("1");
      const size = ethers.parseEther("10");
      const isLong = true;
      await account.deposit(ETH, collateralAmount, { value: collateralAmount });
      {
        console.log("`deposit`");
        await checkBalance(account);
      }
      var price = ethers.parseUnits("2000", 8);
      await replaceOracleReferenceAndSetPrice(WETH, price);
      const positionOrder = await mux.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders([mux.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }]); // prettier-ignore
      await fillPositionOrder();
      {
        console.log("`increase position`");
        await checkBalance(account);
        await printPosition(mux.target, collateral, index, isLong);
      }
      await account.deposit(ETH, collateralAmount, { value: collateralAmount });
      {
        console.log("`deposit`");
        await checkBalance(account);
      }
      await account.connect(user).createMarketOrders(
        [mux.target],
        [
          {
            orderType: orderType.increaseCollateral,
            path: [collateral],
            index: index,
            collateralAmount: collateralAmount,
            size: 0,
            isLong: isLong,
          },
        ]
      );
      {
        console.log("`increase collateral`");
        await checkBalance(account);
        await printPosition(mux.target, collateral, index, isLong);
      }
      await account.connect(user).createMarketOrders(
        [mux.target],
        [
          {
            orderType: orderType.decreaseCollateral,
            path: [collateral],
            index: index,
            collateralAmount: collateralAmount,
            size: 0,
            isLong: isLong,
          },
        ]
      );
      await fillWithdrawalOrder();
      {
        console.log("`decrease collateral`");
        await checkBalance(account);
        await printPosition(mux.target, collateral, index, isLong);
      }
      const position = await account.getPosition(mux.target, collateral, index, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders(
        [mux.target],
        [
          {
            orderType: orderType.decreasePosition,
            path: [collateral],
            index: index,
            collateralAmount: 0,
            size: position.size,
            isLong: isLong,
          },
        ]
      );
      await fillPositionOrder(account.target);
      {
        console.log("`decrease position`");
        await checkBalance(account);
        await printPosition(mux.target, collateral, index, isLong);
      }
    });

    it("short: usdc -> eth", async () => {
      const {
        mux,
        user,
        account,
        orderType,
        minExecutionFee,
        ETH,
        WETH,
        USDC,
        checkBalance,
        printPosition,
        fillPositionOrder,
        fillWithdrawalOrder,
        replaceOracleReferenceAndSetPrice,
      } = await loadFixture(deployAndDepositUSDC);
      const collateral = USDC;
      const index = WETH;
      const collateralAmount = (await account.getBalance(USDC)) / 2n;
      const size = ethers.parseEther("10");
      const isLong = false;
      {
        console.log("`deposit`");
        await checkBalance(account);
      }
      var price = ethers.parseUnits("2000", 8);
      await replaceOracleReferenceAndSetPrice(WETH, price);
      const positionOrder = await mux.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders([mux.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }]); // prettier-ignore
      await fillPositionOrder();
      {
        console.log("`increase position`");
        await checkBalance(account);
        await printPosition(mux.target, collateral, index, isLong);
      }
      await account.connect(user).createMarketOrders(
        [mux.target],
        [
          {
            orderType: orderType.increaseCollateral,
            path: [collateral],
            index: index,
            collateralAmount: collateralAmount,
            size: 0,
            isLong: isLong,
          },
        ]
      );
      {
        console.log("`increase collateral`");
        await checkBalance(account);
        await printPosition(mux.target, collateral, index, isLong);
      }
      await account.connect(user).createMarketOrders(
        [mux.target],
        [
          {
            orderType: orderType.decreaseCollateral,
            path: [collateral],
            index: index,
            collateralAmount: collateralAmount,
            size: 0,
            isLong: isLong,
          },
        ]
      );
      await fillWithdrawalOrder();
      {
        console.log("`decrease collateral`");
        await checkBalance(account);
        await printPosition(mux.target, collateral, index, isLong);
      }
      const position = await account.getPosition(mux.target, collateral, index, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders(
        [mux.target],
        [
          {
            orderType: orderType.decreasePosition,
            path: [collateral],
            index: index,
            collateralAmount: 0,
            size: position.size,
            isLong: isLong,
          },
        ]
      );
      await fillPositionOrder(account.target);
      {
        console.log("`decrease position`");
        await checkBalance(account);
        await printPosition(mux.target, collateral, index, isLong);
      }
    });
  });
});
