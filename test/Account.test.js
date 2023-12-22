const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const { deploy } = require("./fixture/setup");

// token contracts
const WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
const USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

const orderType = {
  increasePosition: 0,
  decreasePosition: 1,
  increaseCollateral: 2,
  decreaseCollateral: 3,
};

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
    it("gmx-v1", async () => {
      const {
        account,
        gmxV1,
        executeIncreasePosition,
        executeDecreasePosition,
      } = await loadFixture(deploy);

      const collateralAmount = ethers.parseEther("1");
      await account.deposit(ethers.ZeroAddress, collateralAmount, {
        value: collateralAmount,
      });
      console.log(await account.getBalance(ethers.ZeroAddress));

      const gmxOrder = await gmxV1.makeOrder(
        WETH,
        WETH,
        collateralAmount,
        10n,
        true
      );
      await account.createOrders(
        [gmxV1.target],
        [
          {
            orderType: gmxOrder.orderType,
            collateral: gmxOrder.collateral,
            index: gmxOrder.index,
            collateralAmount: gmxOrder.collateralAmount,
            size: gmxOrder.size,
            isLong: gmxOrder.isLong,
          },
        ],
        {
          value: BigInt("180000000000000"),
        }
      );
      await executeIncreasePosition();
      console.log(await account.getPosition(gmxV1.target, WETH, WETH, true));

      await account.deposit(ethers.ZeroAddress, collateralAmount, {
        value: collateralAmount,
      });
      await account.createOrders(
        [gmxV1.target],
        [
          {
            orderType: orderType.increaseCollateral,
            collateral: WETH,
            index: WETH,
            collateralAmount: collateralAmount,
            size: 0,
            isLong: true,
          },
        ],
        {
          value: BigInt("180000000000000"),
        }
      );
      await executeIncreasePosition();
      console.log(await account.getPosition(gmxV1.target, WETH, WETH, true));

      await account.createOrders(
        [gmxV1.target],
        [
          {
            orderType: orderType.decreaseCollateral,
            collateral: WETH,
            index: WETH,
            collateralAmount: ethers.parseUnits("1000", 30),
            size: 0,
            isLong: true,
          },
        ],
        {
          value: BigInt("180000000000000"),
        }
      );
      await executeDecreasePosition();
      console.log(await account.getPosition(gmxV1.target, WETH, WETH, true));

      const position = await account.getPosition(
        gmxV1.target,
        WETH,
        WETH,
        true
      );
      await account.createOrders(
        [gmxV1.target],
        [
          {
            orderType: orderType.decreasePosition,
            collateral: WETH,
            index: WETH,
            collateralAmount: 0,
            size: position.size,
            isLong: true,
          },
        ],
        {
          value: BigInt("180000000000000"),
        }
      );
      await executeDecreasePosition();
      console.log(await account.getPosition(gmxV1.target, WETH, WETH, true));
    });

    it("mux", async () => {
      const { account, mux, fillPositionOrder, fillWithdrawalOrder } =
        await loadFixture(deploy);

      const collateralAmount = ethers.parseEther("1");
      await account.deposit(ethers.ZeroAddress, collateralAmount, {
        value: collateralAmount,
      });
      console.log(await account.getBalance(ethers.ZeroAddress));

      const muxOrder = await mux.makeOrder(
        WETH,
        WETH,
        collateralAmount,
        10n,
        true
      );
      await account.createOrders(
        [mux.target],
        [
          {
            orderType: muxOrder.orderType,
            collateral: muxOrder.collateral,
            index: muxOrder.index,
            collateralAmount: muxOrder.collateralAmount,
            size: muxOrder.size,
            isLong: muxOrder.isLong,
          },
        ]
      );
      await fillPositionOrder();
      console.log(await account.getPosition(mux.target, WETH, WETH, true));

      await account.deposit(ethers.ZeroAddress, collateralAmount, {
        value: collateralAmount,
      });
      await account.createOrders(
        [mux.target],
        [
          {
            orderType: orderType.increaseCollateral,
            collateral: WETH,
            index: WETH,
            collateralAmount: collateralAmount,
            size: 0,
            isLong: true,
          },
        ]
      );
      console.log(await account.getPosition(mux.target, WETH, WETH, true));

      await account.createOrders(
        [mux.target],
        [
          {
            orderType: orderType.decreaseCollateral,
            collateral: WETH,
            index: WETH,
            collateralAmount: collateralAmount,
            size: 0,
            isLong: true,
          },
        ]
      );
      await fillWithdrawalOrder();
      console.log(await account.getPosition(mux.target, WETH, WETH, true));

      const position = await account.getPosition(mux.target, WETH, WETH, true);
      await account.createOrders(
        [mux.target],
        [
          {
            orderType: orderType.decreasePosition,
            collateral: WETH,
            index: WETH,
            collateralAmount: 0,
            size: position.size,
            isLong: true,
          },
        ]
      );
      await fillPositionOrder();
      console.log(await account.getPosition(mux.target, WETH, WETH, true));
    });
  });
});
