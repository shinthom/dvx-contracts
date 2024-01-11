const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../../fixture/setup");

describe("mux: marketOrder", () => {
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
      printPosition,
    } = await loadFixture(deploy);

    const price = ethers.parseUnits("2000", 8);
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
      await printPosition(mux.target, collateral, index, isLong);
    }
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
      await printPosition(mux.target, collateral, index, isLong);
    }
    {
      await account.connect(user).createMarketOrders(
        [mux.target],
        [
          {
            orderType: orderType.decreasePosition,
            path: [collateral],
            index: index,
            collateralAmount: 0,
            size: size,
            isLong: isLong,
          },
        ]
      );
      await fillPositionOrder();
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
      printPosition,
    } = await loadFixture(deploy);

    const usdcPrice = ethers.parseUnits("1", 8);
    await replaceOracleReferenceAndSetPrice(USDC, usdcPrice);
    const ethPrice = ethers.parseUnits("2000", 8);
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
      await printPosition(mux.target, collateral, index, isLong);
    }
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
      await printPosition(mux.target, collateral, index, isLong);
    }
    {
      await account.connect(user).createMarketOrders(
        [mux.target],
        [
          {
            orderType: orderType.decreasePosition,
            path: [collateral],
            index: index,
            collateralAmount: 0,
            size: size,
            isLong: isLong,
          },
        ]
      );
      await fillPositionOrder();
      await printPosition(mux.target, collateral, index, isLong);
    }
  });
});
