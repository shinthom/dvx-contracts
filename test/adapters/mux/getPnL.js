const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../../fixture/setup");

describe("mux: getPnL", () => {
  it("long: eth -> eth", async () => {
    const {
      mux,
      user,
      account,
      orderType,
      ETH,
      WETH,
      fillPositionOrder,
      fillWithdrawalOrder,
      replaceOracleReferenceAndSetPrice,
      checkBalance,
      printPosition,
    } = await loadFixture(deploy);

    var price = ethers.parseUnits("2000", 8);
    await replaceOracleReferenceAndSetPrice(WETH, price);

    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = true;

    {
      await account.deposit(ETH, collateralAmount, { value: collateralAmount });
      const positionOrder = await mux.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders(
        [mux.target],
        [
          {
            orderType: positionOrder.orderType,
            path: [...positionOrder.path],
            index: positionOrder.index,
            collateralAmount: positionOrder.collateralAmount,
            size: positionOrder.size,
            isLong: positionOrder.isLong,
          },
        ]
      );
      await fillPositionOrder();
      await checkBalance(account);
      await printPosition(mux.target, collateral, index, isLong);
    }
    var price = ethers.parseUnits("2200", 8);
    await replaceOracleReferenceAndSetPrice(WETH, price);
    {
      await account.deposit(ETH, collateralAmount, { value: collateralAmount });
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
      await checkBalance(account);
      await printPosition(mux.target, collateral, index, isLong);
    }
    {
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
      await checkBalance(account);
      await printPosition(mux.target, collateral, index, isLong);
    }
    {
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
      await fillPositionOrder();
      await checkBalance(account);
      await printPosition(mux.target, collateral, index, isLong);
    }
  });

  it("long: wbtc -> eth", async () => {
    const {
      mux,
      user,
      account,
      orderType,
      WETH,
      WBTC,
      wbtc,
      faucet,
      fillPositionOrder,
      fillWithdrawalOrder,
      replaceOracleReferenceAndSetPrice,
      checkBalance,
      printPosition,
    } = await loadFixture(deploy);

    var btcPrice = ethers.parseUnits("40000", 8);
    await replaceOracleReferenceAndSetPrice(WBTC, btcPrice);
    var ethPrice = ethers.parseUnits("2000", 8);
    await replaceOracleReferenceAndSetPrice(WETH, ethPrice);

    const collateral = WBTC;
    const index = WETH;
    const collateralAmount = ethers.parseUnits("0.1", 8);
    const size = ethers.parseEther("10");
    const isLong = true;

    {
      await faucet(WBTC, collateralAmount);
      await wbtc.connect(user).approve(account.target, collateralAmount);
      await account.connect(user).deposit(WBTC, collateralAmount);
      const positionOrder = await mux.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders(
        [mux.target],
        [
          {
            orderType: positionOrder.orderType,
            path: [...positionOrder.path],
            index: positionOrder.index,
            collateralAmount: positionOrder.collateralAmount,
            size: positionOrder.size,
            isLong: positionOrder.isLong,
          },
        ]
      );
      await fillPositionOrder();
      await checkBalance(account);
      await printPosition(mux.target, collateral, index, isLong);
    }
    var price = ethers.parseUnits("2200", 8);
    await replaceOracleReferenceAndSetPrice(WETH, price);
    {
      await faucet(WBTC, collateralAmount);
      await wbtc.connect(user).approve(account.target, collateralAmount);
      await account.connect(user).deposit(WBTC, collateralAmount);
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
      await checkBalance(account);
      await printPosition(mux.target, collateral, index, isLong);
    }
    {
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
      await checkBalance(account);
      await printPosition(mux.target, collateral, index, isLong);
    }
    {
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
      await fillPositionOrder();
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
      WETH,
      USDC,
      usdc,
      faucet,
      fillPositionOrder,
      fillWithdrawalOrder,
      replaceOracleReferenceAndSetPrice,
      checkBalance,
      printPosition,
    } = await loadFixture(deploy);

    var usdcPrice = ethers.parseUnits("1", 8);
    await replaceOracleReferenceAndSetPrice(USDC, usdcPrice);
    var ethPrice = ethers.parseUnits("2000", 8);
    await replaceOracleReferenceAndSetPrice(WETH, ethPrice);

    const collateral = USDC;
    const index = WETH;
    const collateralAmount = ethers.parseUnits("1000", 6);
    const size = ethers.parseEther("10");
    const isLong = false;

    {
      await faucet(USDC, collateralAmount);
      await usdc.connect(user).approve(account.target, collateralAmount);
      await account.connect(user).deposit(USDC, collateralAmount);
      const positionOrder = await mux.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders(
        [mux.target],
        [
          {
            orderType: positionOrder.orderType,
            path: [...positionOrder.path],
            index: positionOrder.index,
            collateralAmount: positionOrder.collateralAmount,
            size: positionOrder.size,
            isLong: positionOrder.isLong,
          },
        ]
      );
      await fillPositionOrder();
      await checkBalance(account);
      await printPosition(mux.target, collateral, index, isLong);
    }
    var ethPrice = ethers.parseUnits("1800", 8);
    await replaceOracleReferenceAndSetPrice(WETH, ethPrice);
    {
      await faucet(USDC, collateralAmount);
      await usdc.connect(user).approve(account.target, collateralAmount);
      await account.connect(user).deposit(USDC, collateralAmount);
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
      await checkBalance(account);
      await printPosition(mux.target, collateral, index, isLong);
    }
    {
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
      await checkBalance(account);
      await printPosition(mux.target, collateral, index, isLong);
    }
    {
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
      await fillPositionOrder();
      await checkBalance(account);
      await printPosition(mux.target, collateral, index, isLong);
    }
  });

  it("short: wbtc -> eth", async () => {
    const {
      mux,
      user,
      account,
      orderType,
      WETH,
      WBTC,
      wbtc,
      faucet,
      fillPositionOrder,
      fillWithdrawalOrder,
      replaceOracleReferenceAndSetPrice,
      checkBalance,
      printPosition,
    } = await loadFixture(deploy);

    var btcPrice = ethers.parseUnits("40000", 8);
    await replaceOracleReferenceAndSetPrice(WBTC, btcPrice);
    var ethPrice = ethers.parseUnits("2000", 8);
    await replaceOracleReferenceAndSetPrice(WETH, ethPrice);

    const collateral = WBTC;
    const index = WETH;
    const collateralAmount = ethers.parseUnits("0.1", 8);
    const size = ethers.parseEther("10");
    const isLong = false;

    {
      await faucet(WBTC, collateralAmount);
      await wbtc.connect(user).approve(account.target, collateralAmount);
      await account.connect(user).deposit(WBTC, collateralAmount);
      const positionOrder = await mux.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders(
        [mux.target],
        [
          {
            orderType: positionOrder.orderType,
            path: [...positionOrder.path],
            index: positionOrder.index,
            collateralAmount: positionOrder.collateralAmount,
            size: positionOrder.size,
            isLong: positionOrder.isLong,
          },
        ]
      );
      await fillPositionOrder();
      await checkBalance(account);
      await printPosition(mux.target, collateral, index, isLong);
    }
    var price = ethers.parseUnits("1800", 8);
    await replaceOracleReferenceAndSetPrice(WETH, price);
    {
      await faucet(WBTC, collateralAmount);
      await wbtc.connect(user).approve(account.target, collateralAmount);
      await account.connect(user).deposit(WBTC, collateralAmount);
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
      await checkBalance(account);
      await printPosition(mux.target, collateral, index, isLong);
    }
    {
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
      await checkBalance(account);
      await printPosition(mux.target, collateral, index, isLong);
    }
    {
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
      await fillPositionOrder();
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
      WETH,
      USDC,
      usdc,
      faucet,
      fillPositionOrder,
      fillWithdrawalOrder,
      replaceOracleReferenceAndSetPrice,
      checkBalance,
      printPosition,
    } = await loadFixture(deploy);

    var usdcPrice = ethers.parseUnits("1", 8);
    await replaceOracleReferenceAndSetPrice(USDC, usdcPrice);
    var ethPrice = ethers.parseUnits("2000", 8);
    await replaceOracleReferenceAndSetPrice(WETH, ethPrice);

    const collateral = USDC;
    const index = WETH;
    const collateralAmount = ethers.parseUnits("1000", 6);
    const size = ethers.parseEther("10");
    const isLong = false;

    {
      await faucet(USDC, collateralAmount);
      await usdc.connect(user).approve(account.target, collateralAmount);
      await account.connect(user).deposit(USDC, collateralAmount);
      const positionOrder = await mux.makePositionOrder(collateral, index, collateralAmount, size, isLong); // prettier-ignore
      await account.connect(user).createMarketOrders(
        [mux.target],
        [
          {
            orderType: positionOrder.orderType,
            path: [...positionOrder.path],
            index: positionOrder.index,
            collateralAmount: positionOrder.collateralAmount,
            size: positionOrder.size,
            isLong: positionOrder.isLong,
          },
        ]
      );
      await fillPositionOrder();
      await checkBalance(account);
      await printPosition(mux.target, collateral, index, isLong);
    }
    var price = ethers.parseUnits("1800", 8);
    await replaceOracleReferenceAndSetPrice(WETH, price);
    {
      await faucet(USDC, collateralAmount);
      await usdc.connect(user).approve(account.target, collateralAmount);
      await account.connect(user).deposit(USDC, collateralAmount);
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
      await checkBalance(account);
      await printPosition(mux.target, collateral, index, isLong);
    }
    {
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
      await checkBalance(account);
      await printPosition(mux.target, collateral, index, isLong);
    }
    {
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
      await fillPositionOrder();
      await checkBalance(account);
      await printPosition(mux.target, collateral, index, isLong);
    }
  });
});
