const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {
  deploy,
  deployAndDepositETH,
  deployAndDepositUSDC,
  deployAndDepositWBTC,
} = require("../fixture/setup");

describe("GMXV1", () => {
  describe("increase/decrease", () => {
    it("long: eth -> eth", async () => {
      const { gmxV1, user, account, orderType, ETH, WETH, minExecutionFee, checkBalance, executeIncreasePosition, executeDecreasePosition } = await loadFixture(deployAndDepositETH); // prettier-ignore
      const collateralAmount = (await account.getBalance(ETH)) / 2n;
      await checkBalance(account);

      const order = await gmxV1.makePositionOrder(WETH, WETH, collateralAmount, 10n, true, 0, 0); // prettier-ignore
      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: order.orderType, path: [...order.path], index: order.index, collateralAmount: order.collateralAmount, size: order.size, isLong: order.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeIncreasePosition(account.target);
      const position = await gmxV1.getPosition(account.target, WETH, WETH, true); // prettier-ignore
      await checkBalance(account);
      console.log(`- position: ${await gmxV1.getPosition(account.target, WETH, WETH, true)}`); // prettier-ignore

      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: orderType.increaseCollateral, path: [WETH], index: WETH, collateralAmount: collateralAmount, size: 0, isLong: position.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeIncreasePosition(account.target);
      await checkBalance(account);
      console.log(`- position: ${await gmxV1.getPosition(account.target, WETH, WETH, true)}`); // prettier-ignore

      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: orderType.decreaseCollateral, path: [WETH], index: WETH, collateralAmount: collateralAmount, size: 0, isLong: position.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeDecreasePosition(account.target);
      await checkBalance(account);
      console.log(`- position: ${await gmxV1.getPosition(account.target, WETH, WETH, true)}`); // prettier-ignore

      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: orderType.decreasePosition, path: [WETH], index: WETH, collateralAmount: 0, size: position.size, isLong: position.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeDecreasePosition(account.target);
      await checkBalance(account);
      console.log(`- position: ${await gmxV1.getPosition(account.target, WETH, WETH, true)}`); // prettier-ignore
    });

    it("long: wbtc -> wbtc", async () => {
      const { user, account, gmxV1, orderType, WBTC, minExecutionFee, checkBalance, faucet, executeIncreasePosition, executeDecreasePosition } = await loadFixture(deployAndDepositWBTC); // prettier-ignore
      const collateralAmount = (await account.getBalance(WBTC)) / 2n;
      await checkBalance(account);

      const order = await gmxV1.makePositionOrder(WBTC, WBTC, collateralAmount, 10n, true, 0, 0); // prettier-ignore
      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: order.orderType, path: [...order.path], index: order.index, collateralAmount: order.collateralAmount, size: order.size, isLong: order.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeIncreasePosition(account.target);
      await checkBalance(account);
      const position = await gmxV1.getPosition(account.target, WBTC, WBTC, true); // prettier-ignore
      console.log(`- position: ${position}`); // prettier-ignore

      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: orderType.increaseCollateral, path: [WBTC], index: WBTC, collateralAmount: collateralAmount, size: 0, isLong: position.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeIncreasePosition(account.target);
      await checkBalance(account);
      console.log(`- position: ${await gmxV1.getPosition(account.target, WBTC, WBTC, true)}`); // prettier-ignore

      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: orderType.decreaseCollateral, path: [WBTC], index: WBTC, collateralAmount: collateralAmount, size: 0, isLong: position.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeDecreasePosition(account.target);
      await checkBalance(account);
      console.log(`- position: ${await gmxV1.getPosition(account.target, WBTC, WBTC, true)}`); // prettier-ignore

      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: orderType.decreasePosition, path: [WBTC], index: WBTC, collateralAmount: 0, size: position.size, isLong: position.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeDecreasePosition(account.target);
      await checkBalance(account);
      console.log(`- position: ${await gmxV1.getPosition(account.target, WBTC, WBTC, true)}`); // prettier-ignore
    });

    it("short: usdc -> eth", async () => {
      const { user, account, gmxV1, orderType, WETH, USDC, minExecutionFee, checkBalance, faucet, executeIncreasePosition, executeDecreasePosition } = await loadFixture(deployAndDepositUSDC); // prettier-ignore
      const collateralAmount = (await account.getBalance(USDC)) / 2n;
      await checkBalance(account);

      const order = await gmxV1.makePositionOrder(USDC, WETH, collateralAmount, 10n, false, 0, 0); // prettier-ignore
      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: order.orderType, path: [...order.path], index: order.index, collateralAmount: order.collateralAmount, size: order.size, isLong: order.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeIncreasePosition(account.target);
      await checkBalance(account);
      const position = await gmxV1.getPosition(account.target, USDC, WETH, false); // prettier-ignore
      console.log(`- position: ${position}`); // prettier-ignore

      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: orderType.increaseCollateral, path: [USDC], index: WETH, collateralAmount: collateralAmount, size: 0, isLong: position.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeIncreasePosition(account.target);
      await checkBalance(account);
      console.log(`- position: ${await gmxV1.getPosition(account.target, USDC, WETH, false)}`); // prettier-ignore

      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: orderType.decreaseCollateral, path: [USDC], index: WETH, collateralAmount: collateralAmount, size: 0, isLong: position.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeDecreasePosition(account.target);
      await checkBalance(account);
      console.log(`- position: ${await gmxV1.getPosition(account.target, USDC, WETH, false)}`); // prettier-ignore

      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: orderType.decreasePosition, path: [USDC], index: WETH, collateralAmount: 0, size: position.size, isLong: position.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeDecreasePosition(account.target);
      await checkBalance(account);
      console.log(`- position: ${await gmxV1.getPosition(account.target, USDC, WETH, false)}`); // prettier-ignore
    });

    it("short: usdc -> wbtc", async () => {
      const { user, account, gmxV1, orderType, WBTC, USDC, minExecutionFee, checkBalance, faucet, executeIncreasePosition, executeDecreasePosition } = await loadFixture(deployAndDepositUSDC); // prettier-ignore
      const collateralAmount = (await account.getBalance(USDC)) / 2n;
      await checkBalance(account);

      const order = await gmxV1.makePositionOrder(USDC, WBTC, collateralAmount, 10n, false, 0, 0); // prettier-ignore
      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: order.orderType, path: [...order.path], index: order.index, collateralAmount: order.collateralAmount, size: order.size, isLong: order.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeIncreasePosition(account.target);
      await checkBalance(account);
      const position = await gmxV1.getPosition(account.target, USDC, WBTC, false); // prettier-ignore
      console.log(`- position: ${position}`); // prettier-ignore

      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: orderType.increaseCollateral, path: [USDC], index: WBTC, collateralAmount: collateralAmount, size: 0, isLong: position.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeIncreasePosition(account.target);
      await checkBalance(account);
      console.log(`- position: ${await gmxV1.getPosition(account.target, USDC, WBTC, false)}`); // prettier-ignore

      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: orderType.decreaseCollateral, path: [USDC], index: WBTC, collateralAmount: collateralAmount, size: 0, isLong: position.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeDecreasePosition(account.target);
      await checkBalance(account);
      console.log(`- position: ${await gmxV1.getPosition(account.target, USDC, WBTC, false)}`); // prettier-ignore

      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: orderType.decreasePosition, path: [USDC], index: WBTC, collateralAmount: 0, size: position.size, isLong: position.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeDecreasePosition(account.target);
      await checkBalance(account);
      console.log(`- position: ${await gmxV1.getPosition(account.target, USDC, WBTC, false)}`); // prettier-ignore
    });
  });

  describe("values", () => {
    it("price", async () => {
      const { gmxV1, WETH, WBTC, USDC } = await loadFixture(deploy);
      console.log(await gmxV1.getPrice(WETH, 0, true));
      console.log(await gmxV1.getPrice(WETH, 0, false));
      console.log(await gmxV1.getPrice(WBTC, 0, true));
      console.log(await gmxV1.getPrice(WBTC, 0, false));
      console.log(await gmxV1.getPrice(USDC, 0, true));
      console.log(await gmxV1.getPrice(USDC, 0, false));
    });

    it("deposit fee", async () => {
      const { gmxV1, weth, minExecutionFee, executeIncreasePosition } =
        await loadFixture(deploy);
      const positionOrder = await gmxV1.makePositionOrder(
        weth.target,
        weth.target,
        ethers.parseEther("1"),
        10n,
        true,
        0,
        0
      );
      {
        expect(
          await gmxV1.getDepositFee(gmxV1.target, {
            orderType: positionOrder.orderType,
            path: [...positionOrder.path],
            index: positionOrder.index,
            collateralAmount: positionOrder.collateralAmount,
            size: positionOrder.size,
            isLong: positionOrder.isLong,
          })
        ).to.be.equal(0);
      }
      await gmxV1.increasePosition(
        [...positionOrder.path],
        positionOrder.index,
        positionOrder.collateralAmount,
        positionOrder.size,
        positionOrder.isLong,
        {
          value: positionOrder.collateralAmount + minExecutionFee,
        }
      );
      await executeIncreasePosition(gmxV1.target);
      {
        expect(
          await gmxV1.getDepositFee(gmxV1.target, {
            orderType: positionOrder.orderType,
            path: [...positionOrder.path],
            index: positionOrder.index,
            collateralAmount: positionOrder.collateralAmount,
            size: positionOrder.size,
            isLong: positionOrder.isLong,
          })
        ).to.be.equal(0);
      }
      {
        const collateralAmount = positionOrder.collateralAmount * 2n;
        expect(
          await gmxV1.getDepositFee(gmxV1.target, {
            orderType: positionOrder.orderType,
            path: [...positionOrder.path],
            index: positionOrder.index,
            collateralAmount: collateralAmount,
            size: positionOrder.size,
            isLong: positionOrder.isLong,
          })
        ).to.be.gt(0n);
      }
    });

    it("position fee", async () => {
      const { gmxV1, weth, minExecutionFee, executeIncreasePosition } =
        await loadFixture(deploy);
      const positionOrder = await gmxV1.makePositionOrder(
        weth.target,
        weth.target,
        ethers.parseEther("1"),
        10n,
        true,
        0,
        0
      );
      await gmxV1.increasePosition(
        [...positionOrder.path],
        positionOrder.index,
        positionOrder.collateralAmount,
        positionOrder.size,
        positionOrder.isLong,
        {
          value: positionOrder.collateralAmount + minExecutionFee,
        }
      );
      await executeIncreasePosition(gmxV1.target);

      const position = await gmxV1.getPosition(
        gmxV1.target,
        weth.target,
        weth.target,
        true
      );

      const price = await gmxV1.getPrice(weth.target, 0, false);
      const collateralAmountUsd =
        (price * positionOrder.collateralAmount) / 10n ** 18n;
      const positionFee = await gmxV1.getPositionFee(
        ethers.ZeroAddress,
        0,
        positionOrder.size
      );
      console.log(`positionOrder.size: ${positionOrder.size}`);
      console.log(`collateralAmountUsd - position.collateralAmount: ${collateralAmountUsd - position.collateralAmount}`); // prettier-ignore
      console.log(`positionFee: ${positionFee}`);
    });

    it("funding fee", async () => {
      const {
        user,
        vault,
        gmxV1,
        minExecutionFee,
        weth,
        usdc,
        faucet,
        executeIncreasePosition,
        updateCumulativeFundingRate,
      } = await loadFixture(deploy);
      {
        const beforePoolAmount = await vault.poolAmounts(weth.target);
        const positionOrder = await gmxV1.makePositionOrder(
          weth.target,
          weth.target,
          ethers.parseEther("1"),
          5n,
          true,
          0,
          0
        );
        await gmxV1
          .connect(user)
          .increasePosition(
            [...positionOrder.path],
            positionOrder.index,
            positionOrder.collateralAmount,
            positionOrder.size,
            positionOrder.isLong,
            {
              value: positionOrder.collateralAmount + minExecutionFee,
            }
          );
        await executeIncreasePosition(gmxV1.target);
        const position = await gmxV1.getPosition(
          gmxV1.target,
          weth.target,
          weth.target,
          true
        );
        console.log(`position: ${position}`);
        const afterPoolAmount = await vault.poolAmounts(weth.target);
        expect(afterPoolAmount).to.be.gt(beforePoolAmount);

        expect(
          await gmxV1.getFundingFee(
            weth.target,
            ethers.ZeroAddress,
            position.size,
            position.fundingRate,
            true,
            0
          )
        ).to.be.equal(0n);

        await updateCumulativeFundingRate(weth.target);
        expect(
          await gmxV1.getFundingFee(
            weth.target,
            ethers.ZeroAddress,
            position.size,
            position.fundingRate,
            true,
            0
          )
        ).to.be.gt(0n);
      }
      {
        await faucet(usdc.target, ethers.parseEther("10"));
        await usdc
          .connect(user)
          .transfer(gmxV1.target, ethers.parseUnits("100", 6));
        const beforePoolAmount = await vault.poolAmounts(usdc.target);
        const positionOrder = await gmxV1.makePositionOrder(
          usdc.target,
          weth.target,
          ethers.parseUnits("100", 6),
          5n,
          false,
          0,
          0
        );
        await gmxV1
          .connect(user)
          .increasePosition(
            [...positionOrder.path],
            positionOrder.index,
            positionOrder.collateralAmount,
            positionOrder.size,
            positionOrder.isLong,
            {
              value: minExecutionFee,
            }
          );
        await executeIncreasePosition(gmxV1.target);
        const position = await gmxV1.getPosition(
          gmxV1.target,
          usdc.target,
          weth.target,
          false
        );
        console.log(`position: ${position}`);
        const afterPoolAmount = await vault.poolAmounts(usdc.target);
        expect(afterPoolAmount).to.be.equal(beforePoolAmount);

        expect(
          await gmxV1.getFundingFee(
            usdc.target,
            ethers.ZeroAddress,
            position.size,
            position.fundingRate,
            false,
            0
          )
        ).to.be.equal(0n);
        await updateCumulativeFundingRate(usdc.target);
        const fundingFee = await gmxV1.getFundingFee(
          usdc.target,
          ethers.ZeroAddress,
          position.size,
          position.fundingRate,
          false,
          0
        );
        expect(
          await gmxV1.getFundingFee(
            usdc.target,
            ethers.ZeroAddress,
            position.size,
            position.fundingRate,
            false,
            0
          )
        ).to.be.gt(0n);
      }
    });
  });
});
