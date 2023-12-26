const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture/setup");

describe("GMXV1", () => {
  // token contracts
  const WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
  const USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
  const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

  const fee = BigInt("180000000000000");

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
          value: positionOrder.collateralAmount + fee,
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
          value: positionOrder.collateralAmount + fee,
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
        vault,
        gmxV1,
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
        await gmxV1.increasePosition(
          [...positionOrder.path],
          positionOrder.index,
          positionOrder.collateralAmount,
          positionOrder.size,
          positionOrder.isLong,
          {
            value: positionOrder.collateralAmount + fee,
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
        await usdc.transfer(gmxV1.target, ethers.parseUnits("100", 6));
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
        await gmxV1.increasePosition(
          [...positionOrder.path],
          positionOrder.index,
          positionOrder.collateralAmount,
          positionOrder.size,
          positionOrder.isLong,
          {
            value: fee,
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

  describe("make order", () => {
    it("eth -> eth", async () => {
      const { gmxV1 } = await loadFixture(deploy);
      const order = await gmxV1.makePositionOrder(
        WETH,
        WETH,
        ethers.parseEther("1"),
        10n,
        true,
        0,
        0
      );
      console.log(order);
    });

    it("usdc -> eth", async () => {
      const { gmxV1 } = await loadFixture(deploy);
      const order = await gmxV1.makePositionOrder(
        USDC,
        WETH,
        ethers.parseUnits("100", 6),
        10n,
        true,
        0,
        0
      );
      console.log(order);
    });

    it("wbtc -> eth", async () => {
      const { gmxV1 } = await loadFixture(deploy);
      const order = await gmxV1.makePositionOrder(
        WBTC,
        WETH,
        ethers.parseUnits("1", 8),
        10n,
        true,
        0,
        0
      );
      console.log(order);
    });

    it("eth -> wbtc", async () => {
      const { gmxV1 } = await loadFixture(deploy);
      const order = await gmxV1.makePositionOrder(
        WETH,
        WBTC,
        ethers.parseEther("1"),
        10n,
        true,
        0,
        0
      );
      console.log(order);
    });

    it("usdc -> wbtc", async () => {
      const { gmxV1 } = await loadFixture(deploy);
      const order = await gmxV1.makePositionOrder(
        USDC,
        WBTC,
        ethers.parseUnits("100", 6),
        10n,
        true,
        0,
        0
      );
      console.log(order);
    });

    it("wbtc -> wbtc", async () => {
      const { gmxV1 } = await loadFixture(deploy);
      const order = await gmxV1.makePositionOrder(
        WBTC,
        WETH,
        ethers.parseUnits("1", 8),
        10n,
        true,
        0,
        0
      );
      console.log(order);
    });
  });
});
