const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture/setup");

describe("GMXV1", () => {
  // token contracts
  const WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
  const USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
  const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

  const minExecutionFee = BigInt("180000000000000");

  describe("values", () => {
    it("price", async () => {
      const { gmxV1 } = await loadFixture(deploy);
      console.log(await gmxV1.getPrice(WETH, 0, true));
      console.log(await gmxV1.getPrice(WETH, 0, false));
      console.log(await gmxV1.getPrice(WBTC, 0, true));
      console.log(await gmxV1.getPrice(WBTC, 0, false));
      console.log(await gmxV1.getPrice(USDC, 0, true));
      console.log(await gmxV1.getPrice(USDC, 0, false));
    });

    it("deposit fee", async () => {
      const { gmxV1, weth, executeIncreasePosition } = await loadFixture(
        deploy
      );
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
      const { gmxV1, weth, executeIncreasePosition } = await loadFixture(
        deploy
      );
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

  describe("increase/decrease position", () => {
    const orderType = {
      increasePosition: 0,
      decreasePosition: 1,
    };

    const checkBalance = async (account) => {
      console.log(`
  -  ETH: ${await account.getBalance(ethers.ZeroAddress)}
  - WETH: ${await account.getBalance(WETH)}
  - WBTC: ${await account.getBalance(WBTC)}
  - USDC: ${await account.getBalance(USDC)}
  `);
    };

    it("long: eth -> eth", async () => {
      const { gmxV1, user, account, executeIncreasePosition, executeDecreasePosition } = await loadFixture(deploy); // prettier-ignore

      const collateralAmount = ethers.parseEther("1"); // prettier-ignore
      await account.connect(user).deposit(ethers.ZeroAddress, collateralAmount, { value: collateralAmount }); // prettier-ignore
      await checkBalance(account);

      const order = await gmxV1.makePositionOrder(WETH, WETH, collateralAmount, 10n, true, 0, 0); // prettier-ignore
      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: order.orderType, path: [...order.path], index: order.index, collateralAmount: order.collateralAmount, size: order.size, isLong: order.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeIncreasePosition(account.target);
      const position0 = await gmxV1.getPosition(account.target, WETH, WETH, true); // prettier-ignore
      console.log(`- position: ${position0}`); // prettier-ignore
      await checkBalance(account);

      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: orderType.decreasePosition, path: [WETH], index: WETH, collateralAmount: 0, size: position0.size, isLong: position0.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeDecreasePosition(account.target);
      const position1 = await gmxV1.getPosition(account.target, WETH, WETH, true); // prettier-ignore
      console.log(`- position: ${position1}`); // prettier-ignore
      await checkBalance(account);
    });

    it("long: btc -> btc", async () => {
      const { user, account, wbtc, gmxV1, faucet, executeIncreasePosition, executeDecreasePosition } = await loadFixture(deploy); // prettier-ignore
      await faucet(WBTC, ethers.parseEther("1"));
      const collateralAmount = await wbtc.balanceOf(user.address);
      await wbtc.connect(user).approve(account.target, collateralAmount);
      await account.connect(user).deposit(WBTC, collateralAmount);
      await checkBalance(account);

      const order = await gmxV1.makePositionOrder(WBTC, WBTC, collateralAmount, 10n, true, 0, 0); // prettier-ignore
      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: order.orderType, path: [...order.path], index: order.index, collateralAmount: order.collateralAmount, size: order.size, isLong: order.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeIncreasePosition(account.target);
      const position0 = await gmxV1.getPosition(account.target, WBTC, WBTC, true); // prettier-ignore
      console.log(`- position: ${position0}`); // prettier-ignore
      await checkBalance(account);

      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: orderType.decreasePosition, path: [WBTC], index: WBTC, collateralAmount: 0, size: position0.size, isLong: position0.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeDecreasePosition(account.target);
      const position1 = await gmxV1.getPosition(account.target, WBTC, WBTC, true); // prettier-ignore
      console.log(`- position: ${position1}`); // prettier-ignore
      await checkBalance(account);
    });

    it("short: usdc -> eth", async () => {
      const { user, account, usdc, gmxV1, faucet, executeIncreasePosition, executeDecreasePosition } = await loadFixture(deploy); // prettier-ignore
      await faucet(USDC, ethers.parseEther("1"));
      const collateralAmount = await usdc.balanceOf(user.address);
      await usdc.connect(user).approve(account.target, collateralAmount);
      await account.connect(user).deposit(USDC, collateralAmount);
      await checkBalance(account);

      const order = await gmxV1.makePositionOrder(USDC, WETH, collateralAmount, 10n, false, 0, 0); // prettier-ignore
      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: order.orderType, path: [...order.path], index: order.index, collateralAmount: order.collateralAmount, size: order.size, isLong: order.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeIncreasePosition(account.target);
      const position0 = await gmxV1.getPosition(account.target, USDC, WETH, false); // prettier-ignore
      console.log(`- position: ${position0}`); // prettier-ignore
      await checkBalance(account);

      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: orderType.decreasePosition, path: [USDC], index: WETH, collateralAmount: 0, size: position0.size, isLong: position0.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeDecreasePosition(account.target);
      const position1 = await gmxV1.getPosition(account.target, USDC, WETH, false); // prettier-ignore
      console.log(`- position: ${position1}`); // prettier-ignore
      await checkBalance(account);
    });

    it("short: usdc -> btc", async () => {
      const { user, account, usdc, gmxV1, faucet, executeIncreasePosition, executeDecreasePosition } = await loadFixture(deploy); // prettier-ignore
      await faucet(USDC, ethers.parseEther("1"));
      const collateralAmount = await usdc.balanceOf(user.address);
      await usdc.connect(user).approve(account.target, collateralAmount);
      await account.connect(user).deposit(USDC, collateralAmount);
      await checkBalance(account);

      const order = await gmxV1.makePositionOrder(USDC, WBTC, collateralAmount, 10n, false, 0, 0); // prettier-ignore
      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: order.orderType, path: [...order.path], index: order.index, collateralAmount: order.collateralAmount, size: order.size, isLong: order.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeIncreasePosition(account.target);
      const position0 = await gmxV1.getPosition(account.target, USDC, WBTC, false); // prettier-ignore
      console.log(`- position: ${position0}`); // prettier-ignore
      await checkBalance(account);

      await account.connect(user).createMarketOrders([gmxV1.target], [{ orderType: orderType.decreasePosition, path: [USDC], index: WBTC, collateralAmount: 0, size: position0.size, isLong: position0.isLong }], { value: minExecutionFee }); // prettier-ignore
      await executeDecreasePosition(account.target);
      const position1 = await gmxV1.getPosition(account.target, USDC, WBTC, false); // prettier-ignore
      console.log(`- position: ${position1}`); // prettier-ignore
      await checkBalance(account);
    });
  });
});
