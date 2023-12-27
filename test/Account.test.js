const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("./fixture/setup");

// token contracts
const WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
const USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

describe("Account", async () => {
  describe("deposit", () => {
    it("eth", async () => {
      const { account } = await loadFixture(deploy);

      console.log(await account.getBalance(ethers.ZeroAddress));
      await account.deposit(ethers.ZeroAddress, ethers.parseEther("1"), {
        value: ethers.parseEther("1"),
      });
      console.log(await account.getBalance(ethers.ZeroAddress));
    });

    it("wbtc", async () => {
      const { user0, account, wbtc, faucet } = await loadFixture(deploy);
      await faucet(WBTC, ethers.parseEther("1"));

      console.log(await wbtc.balanceOf(account.target));
      await wbtc.approve(account.target, await wbtc.balanceOf(user0.address));
      await account.deposit(WBTC, await wbtc.balanceOf(user0.address));
      console.log(await wbtc.balanceOf(account.target));
    });

    it("usdc", async () => {
      const { user0, account, usdc, faucet } = await loadFixture(deploy);
      await faucet(USDC, ethers.parseEther("1"));

      console.log(await usdc.balanceOf(account.target));
      await usdc.approve(account.target, await usdc.balanceOf(user0.address));
      await account.deposit(USDC, await usdc.balanceOf(user0.address));
      console.log(await usdc.balanceOf(account.target));
    });
  });

  describe("swap", () => {
    it("eth -> wbtc", async () => {
      const { user0, account, wbtc } = await loadFixture(deploy);
      await account.deposit(ethers.ZeroAddress, ethers.parseEther("1"), {
        value: ethers.parseEther("1"),
      });

      const beforeBalance = await account.getBalance(wbtc.target);
      await account
        .connect(user0)
        .swap(ethers.ZeroAddress, WBTC, ethers.parseEther("1"));
      const afterBalance = await account.getBalance(wbtc.target);
      console.log(beforeBalance);
      console.log(afterBalance);
    });

    it("eth -> usdc", async () => {
      const { user0, account, usdc } = await loadFixture(deploy);
      await account.deposit(ethers.ZeroAddress, ethers.parseEther("1"), {
        value: ethers.parseEther("1"),
      });

      const beforeBalance = await account.getBalance(usdc.target);
      await account
        .connect(user0)
        .swap(ethers.ZeroAddress, USDC, ethers.parseEther("1"));
      const afterBalance = await account.getBalance(usdc.target);
      console.log(beforeBalance);
      console.log(afterBalance);
    });

    it("wbtc -> eth", async () => {
      const { user0, account, wbtc, faucet } = await loadFixture(deploy);
      await faucet(WBTC, ethers.parseEther("1"));
      const wbtcBalance = await wbtc.balanceOf(user0.address);
      await wbtc.approve(account.target, wbtcBalance);
      await account.deposit(WBTC, wbtcBalance);

      const beforeBalance = await account.getBalance(ethers.ZeroAddress);
      await account.swap(WBTC, WETH, wbtcBalance);
      const afterBalance = await account.getBalance(ethers.ZeroAddress);
      console.log(beforeBalance);
      console.log(afterBalance);
    });

    it("usdc -> eth", async () => {
      const { user0, account, usdc, faucet } = await loadFixture(deploy);
      await faucet(USDC, ethers.parseEther("1"));
      const usdcBalance = await usdc.balanceOf(user0.address);
      await usdc.approve(account.target, usdcBalance);
      await account.deposit(USDC, usdcBalance);

      const beforeBalance = await account.getBalance(ethers.ZeroAddress);
      await account.swap(USDC, WETH, usdcBalance);
      const afterBalance = await account.getBalance(ethers.ZeroAddress);
      console.log(beforeBalance);
      console.log(afterBalance);
    });
  });

  describe("order", () => {
    const orderType = {
      increasePosition: 0,
      decreasePosition: 1,
      increaseCollateral: 2,
      decreaseCollateral: 3,
    };
    const depositAmount = ethers.parseEther("1");
    const leverage = 10n;

    describe("gmxV1", () => {
      const minExecutionFee = BigInt("180000000000000");

      it("long: eth -> eth", async () => {
        const {
          account,
          gmxV1,
          weth,
          executeIncreasePosition,
          executeDecreasePosition,
        } = await loadFixture(deploy);

        {
          await account.deposit(ethers.ZeroAddress, depositAmount, {
            value: depositAmount,
          });
          const balance = await account.getBalance(ethers.ZeroAddress);
          expect(await account.getBalance(ethers.ZeroAddress)).to.equal(
            balance
          );

          const order = await gmxV1.makePositionOrder(
            weth.target,
            weth.target,
            balance,
            leverage,
            true,
            0,
            0
          );
          expect(order.path[0]).to.equal(weth.target);

          await account.createMarketOrders(
            [gmxV1.target],
            [
              {
                orderType: order.orderType,
                path: [order.path[0]],
                index: order.index,
                collateralAmount: order.collateralAmount,
                size: order.size,
                isLong: order.isLong,
              },
            ],
            {
              value: minExecutionFee,
            }
          );
          await executeIncreasePosition(account.target);
          const position = await account.getPosition(
            gmxV1.target,
            order.path[order.path.length - 1],
            order.index,
            order.isLong
          );
          expect(position.size).to.equal(order.size);
          console.log(`position: ${position}`);
        }
        {
          const collateralAmount = ethers.parseEther("0.1");
          await account.deposit(ethers.ZeroAddress, collateralAmount, {
            value: collateralAmount,
          });
          expect(await account.getBalance(ethers.ZeroAddress)).to.equal(
            collateralAmount
          );
          await account.createMarketOrders(
            [gmxV1.target],
            [
              {
                orderType: orderType.increaseCollateral,
                path: [weth.target],
                index: weth.target,
                collateralAmount: collateralAmount,
                size: 0,
                isLong: true,
              },
            ],
            {
              value: minExecutionFee,
            }
          );
          await executeIncreasePosition(account.target);
          const position = await account.getPosition(
            gmxV1.target,
            weth.target,
            weth.target,
            true
          );
          console.log(`position: ${position}`);
        }
        {
          const collateralAmount = ethers.parseUnits("1000", 30);
          await account.createMarketOrders(
            [gmxV1.target],
            [
              {
                orderType: orderType.decreaseCollateral,
                path: [weth.target],
                index: weth.target,
                collateralAmount: collateralAmount,
                size: 0,
                isLong: true,
              },
            ],
            {
              value: minExecutionFee,
            }
          );
          await executeDecreasePosition(account.target);
          const position = await account.getPosition(
            gmxV1.target,
            weth.target,
            weth.target,
            true
          );
          console.log(`position: ${position}`);
        }
        {
          let position = await account.getPosition(
            gmxV1.target,
            weth.target,
            weth.target,
            true
          );
          await account.createMarketOrders(
            [gmxV1.target],
            [
              {
                orderType: orderType.decreasePosition,
                path: [weth.target],
                index: weth.target,
                collateralAmount: 0,
                size: position.size,
                isLong: true,
              },
            ],
            {
              value: minExecutionFee,
            }
          );
          await executeDecreasePosition(account.target);
          position = await account.getPosition(
            gmxV1.target,
            weth.target,
            weth.target,
            true
          );
          console.log(`position: ${position}`);
        }
      });

      it("long: wbtc -> eth", async () => {
        const {
          user0,
          account,
          gmxV1,
          weth,
          wbtc,
          faucet,
          executeIncreasePosition,
          executeDecreasePosition,
        } = await loadFixture(deploy);

        {
          await faucet(wbtc.target, depositAmount);
          const balance = await wbtc.balanceOf(user0.address);
          await wbtc.approve(account.target, balance);
          await account.deposit(wbtc.target, balance);
          expect(await account.getBalance(wbtc.target)).to.equal(balance);

          const order = await gmxV1.makePositionOrder(
            wbtc.target,
            weth.target,
            balance,
            leverage,
            true,
            0,
            0
          );
          expect(order.path[0]).to.equal(wbtc.target);
          expect(order.path[1]).to.equal(weth.target);

          await account.createMarketOrders(
            [gmxV1.target],
            [
              {
                orderType: order.orderType,
                path: [...order.path],
                index: order.index,
                collateralAmount: order.collateralAmount,
                size: order.size,
                isLong: order.isLong,
              },
            ],
            {
              value: minExecutionFee,
            }
          );
          await executeIncreasePosition(account.target);
          const position = await account.getPosition(
            gmxV1.target,
            order.path[order.path.length - 1],
            order.index,
            order.isLong
          );
          expect(position.size).to.equal(order.size);
          console.log(`position: ${position}`);
        }
        {
          await faucet(wbtc.target, ethers.parseEther("1"));
          const wbtcBalance = await wbtc.balanceOf(user0.address);
          await wbtc.approve(account.target, wbtcBalance);
          await account.deposit(wbtc.target, wbtcBalance);
          expect(await account.getBalance(wbtc.target)).to.equal(wbtcBalance);

          await account.createMarketOrders(
            [gmxV1.target],
            [
              {
                orderType: orderType.increaseCollateral,
                path: [wbtc.target, weth.target],
                index: weth.target,
                collateralAmount: wbtcBalance,
                size: 0,
                isLong: true,
              },
            ],
            {
              value: minExecutionFee,
            }
          );
          await executeIncreasePosition(account.target);
          const position = await account.getPosition(
            gmxV1.target,
            weth.target,
            weth.target,
            true
          );
          console.log(`position: ${position}`);
        }
        {
          const collateralAmount = ethers.parseUnits("1000", 30);
          await account.createMarketOrders(
            [gmxV1.target],
            [
              {
                orderType: orderType.decreaseCollateral,
                path: [weth.target],
                index: weth.target,
                collateralAmount: collateralAmount,
                size: 0,
                isLong: true,
              },
            ],
            {
              value: minExecutionFee,
            }
          );
          await executeDecreasePosition(account.target);
          const position = await account.getPosition(
            gmxV1.target,
            weth.target,
            weth.target,
            true
          );
          console.log(`position: ${position}`);
        }
        {
          let position = await account.getPosition(
            gmxV1.target,
            weth.target,
            weth.target,
            true
          );
          await account.createMarketOrders(
            [gmxV1.target],
            [
              {
                orderType: orderType.decreasePosition,
                path: [weth.target],
                index: weth.target,
                collateralAmount: 0,
                size: position.size,
                isLong: true,
              },
            ],
            {
              value: minExecutionFee,
            }
          );
          await executeDecreasePosition(account.target);
          position = await account.getPosition(
            gmxV1.target,
            weth.target,
            weth.target,
            true
          );
          console.log(`position: ${position}`);
        }
      });

      it("short: usdc -> eth", async () => {
        const {
          user0,
          account,
          gmxV1,
          weth,
          usdc,
          faucet,
          executeIncreasePosition,
          executeDecreasePosition,
        } = await loadFixture(deploy);

        {
          await faucet(usdc.target, depositAmount);
          const balance = await usdc.balanceOf(user0.address);
          await usdc.approve(account.target, balance);
          await account.deposit(usdc.target, balance);
          expect(await account.getBalance(usdc.target)).to.equal(balance);

          const order = await gmxV1.makePositionOrder(
            usdc.target,
            weth.target,
            balance,
            leverage,
            false,
            0,
            0
          );
          expect(order.path[0]).to.equal(usdc.target);

          await account.createMarketOrders(
            [gmxV1.target],
            [
              {
                orderType: order.orderType,
                path: [...order.path],
                index: order.index,
                collateralAmount: order.collateralAmount,
                size: order.size,
                isLong: order.isLong,
              },
            ],
            {
              value: minExecutionFee,
            }
          );
          await executeIncreasePosition(account.target);
          const position = await account.getPosition(
            gmxV1.target,
            order.path[order.path.length - 1],
            order.index,
            order.isLong
          );
          expect(position.size).to.equal(order.size);
          console.log(`position: ${position}`);
        }
        {
          await faucet(usdc.target, depositAmount);
          const usdcBalance = await usdc.balanceOf(user0.address);
          await usdc.approve(account.target, usdcBalance);
          await account.deposit(usdc.target, usdcBalance);
          expect(await account.getBalance(usdc.target)).to.equal(usdcBalance);

          await account.createMarketOrders(
            [gmxV1.target],
            [
              {
                orderType: orderType.increaseCollateral,
                path: [usdc.target],
                index: weth.target,
                collateralAmount: usdcBalance,
                size: 0,
                isLong: false,
              },
            ],
            {
              value: minExecutionFee,
            }
          );
          await executeIncreasePosition(account.target);
          const position = await account.getPosition(
            gmxV1.target,
            usdc.target,
            weth.target,
            false
          );
          console.log(`position: ${position}`);
        }
        {
          const collateralAmount = ethers.parseUnits("1000", 30);
          await account.createMarketOrders(
            [gmxV1.target],
            [
              {
                orderType: orderType.decreaseCollateral,
                path: [usdc.target],
                index: weth.target,
                collateralAmount: collateralAmount,
                size: 0,
                isLong: false,
              },
            ],
            {
              value: minExecutionFee,
            }
          );
          await executeDecreasePosition(account.target);
          const position = await account.getPosition(
            gmxV1.target,
            usdc.target,
            weth.target,
            false
          );
          console.log(`position: ${position}`);
        }
        {
          let position = await account.getPosition(
            gmxV1.target,
            usdc.target,
            weth.target,
            false
          );
          await account.createMarketOrders(
            [gmxV1.target],
            [
              {
                orderType: orderType.decreasePosition,
                path: [usdc.target],
                index: weth.target,
                collateralAmount: 0,
                size: position.size,
                isLong: false,
              },
            ],
            {
              value: minExecutionFee,
            }
          );
          await executeDecreasePosition(account.target);
          position = await account.getPosition(
            gmxV1.target,
            usdc.target,
            weth.target,
            false
          );
          console.log(`position: ${position}`);
        }
      });

      it("short: wbtc -> eth", async () => {
        const {
          user0,
          account,
          gmxV1,
          weth,
          wbtc,
          usdc,
          faucet,
          executeIncreasePosition,
          executeDecreasePosition,
        } = await loadFixture(deploy);

        {
          await faucet(wbtc.target, depositAmount);
          const balance = await wbtc.balanceOf(user0.address);
          await wbtc.approve(account.target, balance);
          await account.deposit(wbtc.target, balance);
          expect(await account.getBalance(wbtc.target)).to.equal(balance);

          const order = await gmxV1.makePositionOrder(
            wbtc.target,
            weth.target,
            balance,
            leverage,
            false,
            0,
            0
          );
          expect(order.path[0]).to.equal(wbtc.target);
          expect(order.path[1]).to.equal(usdc.target);

          await account.createMarketOrders(
            [gmxV1.target],
            [
              {
                orderType: order.orderType,
                path: [...order.path],
                index: order.index,
                collateralAmount: order.collateralAmount,
                size: order.size,
                isLong: order.isLong,
              },
            ],
            {
              value: minExecutionFee,
            }
          );
          await executeIncreasePosition(account.target);
          const position = await account.getPosition(
            gmxV1.target,
            order.path[order.path.length - 1],
            order.index,
            order.isLong
          );
          expect(position.size).to.equal(order.size);
          console.log(`position: ${position}`);
        }
        {
          await faucet(wbtc.target, depositAmount);
          const balance = await wbtc.balanceOf(user0.address);
          await wbtc.approve(account.target, balance);
          await account.deposit(wbtc.target, balance);
          expect(await account.getBalance(wbtc.target)).to.equal(balance);

          await account.createMarketOrders(
            [gmxV1.target],
            [
              {
                orderType: orderType.increaseCollateral,
                path: [wbtc.target, usdc.target],
                index: weth.target,
                collateralAmount: balance,
                size: 0,
                isLong: false,
              },
            ],
            {
              value: minExecutionFee,
            }
          );
          await executeIncreasePosition(account.target);
          const position = await account.getPosition(
            gmxV1.target,
            usdc.target,
            weth.target,
            false
          );
          console.log(`position: ${position}`);
        }
        {
          const collateralAmount = ethers.parseUnits("1000", 30);
          await account.createMarketOrders(
            [gmxV1.target],
            [
              {
                orderType: orderType.decreaseCollateral,
                path: [usdc.target],
                index: weth.target,
                collateralAmount: collateralAmount,
                size: 0,
                isLong: false,
              },
            ],
            {
              value: minExecutionFee,
            }
          );
          await executeDecreasePosition(account.target);
          const position = await account.getPosition(
            gmxV1.target,
            usdc.target,
            weth.target,
            false
          );
          console.log(`position: ${position}`);
        }
        {
          let position = await account.getPosition(
            gmxV1.target,
            usdc.target,
            weth.target,
            false
          );
          await account.createMarketOrders(
            [gmxV1.target],
            [
              {
                orderType: orderType.decreasePosition,
                path: [usdc.target],
                index: weth.target,
                collateralAmount: 0,
                size: position.size,
                isLong: false,
              },
            ],
            {
              value: minExecutionFee,
            }
          );
          await executeDecreasePosition(account.target);
          position = await account.getPosition(
            gmxV1.target,
            usdc.target,
            weth.target,
            false
          );
          console.log(`position: ${position}`);
        }
      });
    });

    describe("mux", () => {
      const wethPrice = ethers.parseUnits("2000", 18);
      const wbtcPrice = ethers.parseUnits("40000", 18);
      const usdcPrice = ethers.parseUnits("1", 18);

      it("long: eth -> eth", async () => {
        const { account, mux, weth, fillPositionOrder, fillWithdrawalOrder } =
          await loadFixture(deploy);

        {
          await account.deposit(ethers.ZeroAddress, depositAmount, {
            value: depositAmount,
          });
          const balance = await account.getBalance(ethers.ZeroAddress);
          expect(await account.getBalance(ethers.ZeroAddress)).to.equal(
            balance
          );

          const positionOrder = await mux.makePositionOrder(
            weth.target,
            weth.target,
            balance,
            leverage,
            true,
            wethPrice,
            wethPrice
          );
          expect(positionOrder.path[0]).to.equal(weth.target);

          await account.createMarketOrders(
            [mux.target],
            [
              {
                orderType: positionOrder.orderType,
                path: [positionOrder.path[0]],
                index: positionOrder.index,
                collateralAmount: positionOrder.collateralAmount,
                size: positionOrder.size,
                isLong: positionOrder.isLong,
              },
            ]
          );
          await fillPositionOrder();
          const position = await account.getPosition(
            mux.target,
            positionOrder.path[positionOrder.path.length - 1],
            positionOrder.index,
            positionOrder.isLong
          );
          expect(position.size).to.equal(positionOrder.size);
          console.log(`position: ${position}`);
        }
        {
          const collateralAmount = ethers.parseEther("0.1");
          await account.deposit(ethers.ZeroAddress, collateralAmount, {
            value: collateralAmount,
          });
          expect(await account.getBalance(ethers.ZeroAddress)).to.equal(
            collateralAmount
          );
          await account.createMarketOrders(
            [mux.target],
            [
              {
                orderType: orderType.increaseCollateral,
                path: [weth.target],
                index: weth.target,
                collateralAmount: collateralAmount,
                size: 0,
                isLong: true,
              },
            ]
          );
          // await fillPositionOrder();
          const position = await account.getPosition(
            mux.target,
            weth.target,
            weth.target,
            true
          );
          console.log(`position: ${position}`);
        }
        {
          const collateralAmount = ethers.parseEther("0.1");
          await account.createMarketOrders(
            [mux.target],
            [
              {
                orderType: orderType.decreaseCollateral,
                path: [weth.target],
                index: weth.target,
                collateralAmount: collateralAmount,
                size: 0,
                isLong: true,
              },
            ]
          );
          await fillWithdrawalOrder();
          const position = await account.getPosition(
            mux.target,
            weth.target,
            weth.target,
            true
          );
          console.log(`position: ${position}`);
        }
        {
          let position = await account.getPosition(
            mux.target,
            weth.target,
            weth.target,
            true
          );
          await account.createMarketOrders(
            [mux.target],
            [
              {
                orderType: orderType.decreasePosition,
                path: [weth.target],
                index: weth.target,
                collateralAmount: 0,
                size: position.size,
                isLong: true,
              },
            ]
          );
          await fillPositionOrder();
          position = await account.getPosition(
            mux.target,
            weth.target,
            weth.target,
            true
          );
          console.log(`position: ${position}`);
        }
      });

      it("long: wbtc -> eth", async () => {
        const {
          user0,
          account,
          mux,
          weth,
          wbtc,
          faucet,
          fillPositionOrder,
          fillWithdrawalOrder,
        } = await loadFixture(deploy);

        {
          await faucet(wbtc.target, depositAmount);
          const balance = await wbtc.balanceOf(user0.address);
          await wbtc.approve(account.target, balance);
          await account.deposit(wbtc.target, balance);
          expect(await account.getBalance(wbtc.target)).to.equal(balance);

          const positionOrder = await mux.makePositionOrder(
            wbtc.target,
            weth.target,
            balance,
            leverage,
            true,
            wbtcPrice,
            wethPrice
          );
          expect(positionOrder.path[0]).to.equal(wbtc.target);

          await account.createMarketOrders(
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
          const position = await account.getPosition(
            mux.target,
            positionOrder.path[positionOrder.path.length - 1],
            positionOrder.index,
            positionOrder.isLong
          );
          expect(position.size).to.equal(positionOrder.size);
          console.log(`position: ${position}`);
        }
        {
          await faucet(wbtc.target, depositAmount);
          const wbtcBalance = await wbtc.balanceOf(user0.address);
          await wbtc.approve(account.target, wbtcBalance);
          await account.deposit(wbtc.target, wbtcBalance);
          expect(await account.getBalance(wbtc.target)).to.equal(wbtcBalance);

          await account.createMarketOrders(
            [mux.target],
            [
              {
                orderType: orderType.increaseCollateral,
                path: [wbtc.target],
                index: weth.target,
                collateralAmount: wbtcBalance,
                size: 0,
                isLong: true,
              },
            ]
          );
          // await fillPositionOrder();
          const position = await account.getPosition(
            mux.target,
            wbtc.target,
            weth.target,
            true
          );
          console.log(`position: ${position}`);
        }
        {
          await faucet(wbtc.target, depositAmount);
          const wbtcBalance = await wbtc.balanceOf(user0.address);

          await account.createMarketOrders(
            [mux.target],
            [
              {
                orderType: orderType.decreaseCollateral,
                path: [wbtc.target],
                index: weth.target,
                collateralAmount: wbtcBalance,
                size: 0,
                isLong: true,
              },
            ]
          );
          await fillWithdrawalOrder();
          const position = await account.getPosition(
            mux.target,
            wbtc.target,
            weth.target,
            true
          );
          console.log(`position: ${position}`);
        }
        {
          let position = await account.getPosition(
            mux.target,
            wbtc.target,
            weth.target,
            true
          );
          await account.createMarketOrders(
            [mux.target],
            [
              {
                orderType: orderType.decreasePosition,
                path: [wbtc.target],
                index: weth.target,
                collateralAmount: 0,
                size: position.size,
                isLong: true,
              },
            ]
          );
          await fillPositionOrder();
          position = await account.getPosition(
            mux.target,
            wbtc.target,
            weth.target,
            true
          );
          console.log(`position: ${position}`);
        }
      });

      it("short: usdc -> eth", async () => {
        const {
          user0,
          account,
          mux,
          weth,
          usdc,
          faucet,
          fillPositionOrder,
          fillWithdrawalOrder,
        } = await loadFixture(deploy);

        {
          await faucet(usdc.target, depositAmount);
          const balance = await usdc.balanceOf(user0.address);
          await usdc.approve(account.target, balance);
          await account.deposit(usdc.target, balance);
          expect(await account.getBalance(usdc.target)).to.equal(balance);

          const positionOrder = await mux.makePositionOrder(
            usdc.target,
            weth.target,
            balance,
            leverage,
            false,
            usdcPrice,
            wethPrice
          );
          expect(positionOrder.path[0]).to.equal(usdc.target);

          await account.createMarketOrders(
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
          const position = await account.getPosition(
            mux.target,
            positionOrder.path[positionOrder.path.length - 1],
            positionOrder.index,
            positionOrder.isLong
          );
          expect(position.size).to.equal(positionOrder.size);
          console.log(`position: ${position}`);
        }
        {
          await faucet(usdc.target, depositAmount);
          const usdcBalance = await usdc.balanceOf(user0.address);
          await usdc.approve(account.target, usdcBalance);
          await account.deposit(usdc.target, usdcBalance);
          expect(await account.getBalance(usdc.target)).to.equal(usdcBalance);

          await account.createMarketOrders(
            [mux.target],
            [
              {
                orderType: orderType.increaseCollateral,
                path: [usdc.target],
                index: weth.target,
                collateralAmount: usdcBalance,
                size: 0,
                isLong: false,
              },
            ]
          );
          // await fillPositionOrder();
          const position = await account.getPosition(
            mux.target,
            usdc.target,
            weth.target,
            false
          );
          console.log(`position: ${position}`);
        }
        {
          await faucet(usdc.target, depositAmount);
          const usdcBalance = await usdc.balanceOf(user0.address);

          await account.createMarketOrders(
            [mux.target],
            [
              {
                orderType: orderType.decreaseCollateral,
                path: [usdc.target],
                index: weth.target,
                collateralAmount: usdcBalance,
                size: 0,
                isLong: false,
              },
            ]
          );
          await fillWithdrawalOrder();
          const position = await account.getPosition(
            mux.target,
            usdc.target,
            weth.target,
            false
          );
          console.log(`position: ${position}`);
        }
        {
          let position = await account.getPosition(
            mux.target,
            usdc.target,
            weth.target,
            false
          );
          await account.createMarketOrders(
            [mux.target],
            [
              {
                orderType: orderType.decreasePosition,
                path: [usdc.target],
                index: weth.target,
                collateralAmount: 0,
                size: position.size,
                isLong: false,
              },
            ]
          );
          await fillPositionOrder();
          position = await account.getPosition(
            mux.target,
            usdc.target,
            weth.target,
            false
          );
          console.log(`position: ${position}`);
        }
      });

      it("short: wbtc -> eth", async () => {
        const {
          user0,
          account,
          mux,
          weth,
          wbtc,
          faucet,
          fillPositionOrder,
          fillWithdrawalOrder,
        } = await loadFixture(deploy);

        {
          await faucet(wbtc.target, depositAmount);
          const balance = await wbtc.balanceOf(user0.address);
          await wbtc.approve(account.target, balance);
          await account.deposit(wbtc.target, balance);
          expect(await account.getBalance(wbtc.target)).to.equal(balance);

          const positionOrder = await mux.makePositionOrder(
            wbtc.target,
            weth.target,
            balance,
            leverage,
            false,
            usdcPrice,
            wethPrice
          );
          expect(positionOrder.path[0]).to.equal(wbtc.target);

          await account.createMarketOrders(
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
          const position = await account.getPosition(
            mux.target,
            positionOrder.path[positionOrder.path.length - 1],
            positionOrder.index,
            positionOrder.isLong
          );
          expect(position.size).to.equal(positionOrder.size);
          console.log(`position: ${position}`);
        }
        {
          await faucet(wbtc.target, depositAmount);
          const wbtcBalance = await wbtc.balanceOf(user0.address);
          await wbtc.approve(account.target, wbtcBalance);
          await account.deposit(wbtc.target, wbtcBalance);
          expect(await account.getBalance(wbtc.target)).to.equal(wbtcBalance);

          await account.createMarketOrders(
            [mux.target],
            [
              {
                orderType: orderType.increaseCollateral,
                path: [wbtc.target],
                index: weth.target,
                collateralAmount: wbtcBalance,
                size: 0,
                isLong: false,
              },
            ]
          );
          // await fillPositionOrder();
          const position = await account.getPosition(
            mux.target,
            wbtc.target,
            weth.target,
            false
          );
          console.log(`position: ${position}`);
        }
        {
          await faucet(wbtc.target, depositAmount);
          const wbtcBalance = await wbtc.balanceOf(user0.address);

          await account.createMarketOrders(
            [mux.target],
            [
              {
                orderType: orderType.decreaseCollateral,
                path: [wbtc.target],
                index: weth.target,
                collateralAmount: wbtcBalance,
                size: 0,
                isLong: false,
              },
            ]
          );
          await fillWithdrawalOrder();
          const position = await account.getPosition(
            mux.target,
            wbtc.target,
            weth.target,
            false
          );
          console.log(`position: ${position}`);
        }
        {
          let position = await account.getPosition(
            mux.target,
            wbtc.target,
            weth.target,
            false
          );
          await account.createMarketOrders(
            [mux.target],
            [
              {
                orderType: orderType.decreasePosition,
                path: [wbtc.target],
                index: weth.target,
                collateralAmount: 0,
                size: position.size,
                isLong: false,
              },
            ]
          );
          await fillPositionOrder();
          position = await account.getPosition(
            mux.target,
            wbtc.target,
            weth.target,
            false
          );
          console.log(`position: ${position}`);
        }
      });
    });
  });
});
