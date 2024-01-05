const { ethers } = require("hardhat");
const { expect, use } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy, deployAndDepositUSDC } = require("../../fixture/setup");

describe("GMXV1", () => {
  it("increasePosition (long: eth -> eth)", async () => {
    const {
      gmxV1,
      user,
      account,
      ETH,
      WETH,
      minExecutionFee,
      checkBalance,
      printPosition,
      executeIncreasePosition,
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

    var price = ethers.parseUnits("2000", 30);
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

    var price = ethers.parseUnits("1800", 30); // -10%
    await replaceFastPriceFeedAndSetPrice(WETH, price, price);
    await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: positionOrder.orderType, path: [...positionOrder.path], index: positionOrder.index, collateralAmount: positionOrder.collateralAmount, size: positionOrder.size, isLong: positionOrder.isLong }], { value: minExecutionFee }); // prettier-ignore
    await executeIncreasePosition(account.target);
    {
      console.log("`increase position`");
      await checkBalance(account);
      await printPosition(gmxV1.target, collateral, index, isLong);
    }
  });

  it("increaseCollateral (long: eth -> eth)", async () => {
    const {
      gmxV1,
      user,
      account,
      ETH,
      WETH,
      minExecutionFee,
      orderType,
      checkBalance,
      printPosition,
      executeIncreasePosition,
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

    var price = ethers.parseUnits("2000", 30);
    await replaceFastPriceFeedAndSetPrice(WETH, price, price);
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

    var price = ethers.parseUnits("1800", 30); // +10%
    await replaceFastPriceFeedAndSetPrice(WETH, price, price);
    await account.connect(user).createMarketOrders(
      [gmxV1.target],
      [
        {
          orderType: orderType.increaseCollateral,
          path: [WETH],
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
  });

  it("decreaseCollateral (long: eth -> eth)", async () => {
    const {
      gmxV1,
      user,
      account,
      ETH,
      WETH,
      minExecutionFee,
      orderType,
      checkBalance,
      printPosition,
      executeIncreasePosition,
      executeDecreasePosition,
      replaceFastPriceFeedAndSetPrice,
    } = await loadFixture(deploy);
    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("2");
    const isLong = true;

    await account.deposit(ETH, collateralAmount, { value: collateralAmount });
    {
      console.log("`deposit`");
      await checkBalance(account);
    }

    var price = ethers.parseUnits("2000", 30);
    await replaceFastPriceFeedAndSetPrice(WETH, price, price);
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
    {
      console.log("`increase position`");
      await checkBalance(account);
      await printPosition(gmxV1.target, collateral, index, isLong);
    }

    var price = ethers.parseUnits("1800", 30); // +10%
    await replaceFastPriceFeedAndSetPrice(WETH, price, price);
    await account.connect(user).createMarketOrders(
      [gmxV1.target],
      [
        {
          orderType: orderType.decreaseCollateral,
          path: [WETH],
          index: index,
          collateralAmount: collateralAmount / 2n,
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
  });

  it("decreasePosition(long: eth -> eth)", async () => {
    const {
      gmxV1,
      user,
      account,
      ETH,
      WETH,
      minExecutionFee,
      orderType,
      checkBalance,
      printPosition,
      executeIncreasePosition,
      executeDecreasePosition,
      replaceFastPriceFeedAndSetPrice,
    } = await loadFixture(deploy);
    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("2");
    const isLong = true;

    await account.deposit(ETH, collateralAmount, { value: collateralAmount });
    {
      console.log("`deposit`");
      await checkBalance(account);
    }

    var price = ethers.parseUnits("2000", 30);
    await replaceFastPriceFeedAndSetPrice(WETH, price, price);
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
    {
      console.log("`increase position`");
      await checkBalance(account);
      await printPosition(gmxV1.target, collateral, index, isLong);
    }

    var price = ethers.parseUnits("2200", 30); // +10%
    await replaceFastPriceFeedAndSetPrice(WETH, price, price);
    const position = await account.getPosition(gmxV1.target, collateral, index, isLong); // prettier-ignore
    await account.connect(user).createMarketOrders(
      [gmxV1.target],
      [
        {
          orderType: orderType.decreasePosition,
          path: [collateral],
          index: index,
          collateralAmount: 0,
          size: position.size / 2n,
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

  it("decreasePosition (long: eth -> eth)", async () => {
    const {
      gmxV1,
      user,
      account,
      ETH,
      WETH,
      USDC,
      minExecutionFee,
      orderType,
      checkBalance,
      printPosition,
      executeIncreasePosition,
      executeDecreasePosition,
      replaceFastPriceFeedAndSetPrice,
    } = await loadFixture(deployAndDepositUSDC);
    const collateral = USDC;
    const index = WETH;
    const collateralAmount = await account.getBalance(USDC);
    const size = ethers.parseEther("1");
    const isLong = false;
    {
      console.log("`deposit`");
      await checkBalance(account);
    }
    // todo: not working
    // var price = ethers.parseUnits("2000", 30);
    // await replaceFastPriceFeedAndSetPrice(WETH, price, price);
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
    {
      console.log("`increase position`");
      await checkBalance(account);
      await printPosition(gmxV1.target, collateral, index, isLong);
    }
    var price = ethers.parseUnits("2200", 30); // +10%
    await replaceFastPriceFeedAndSetPrice(WETH, price, price);
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
