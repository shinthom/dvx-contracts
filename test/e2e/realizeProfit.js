const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture");

describe("realizeProfit", () => {
  // it("change dynamically price", async () => {
  //   const {
  //     gmxV1Adapter,
  //     muxAdapter,
  //     quoter,
  //     account,
  //     WETH,
  //     WBTC,
  //     USDC,
  //     setPrice,
  //   } = await loadFixture(deploy);

  //   var ethPrice = ethers.parseUnits("2000", 30);
  //   var btcPrice = ethers.parseUnits("40000", 30);
  //   var usdcPrice = ethers.parseUnits("1", 30);
  //   await setPrice(gmxV1Adapter, WETH, ethPrice, ethPrice, false);
  //   await setPrice(gmxV1Adapter, WBTC, btcPrice, btcPrice, true);
  //   await setPrice(gmxV1Adapter, USDC, usdcPrice, usdcPrice, true);
  //   expect(await gmxV1Adapter.getPrice(WETH, true)).to.be.equal(ethPrice);
  //   expect(await gmxV1Adapter.getPrice(WBTC, true)).to.be.equal(btcPrice);
  //   expect(await gmxV1Adapter.getPrice(USDC, true)).to.be.equal(usdcPrice);

  //   var ethPrice = ethers.parseUnits("2200", 30);
  //   var btcPrice = ethers.parseUnits("44000", 30);
  //   await setPrice(gmxV1Adapter, WETH, ethPrice, ethPrice, true);
  //   await setPrice(gmxV1Adapter, WBTC, btcPrice, btcPrice, true);
  //   expect(await gmxV1Adapter.getPrice(WETH, true)).to.be.equal(ethPrice);
  //   expect(await gmxV1Adapter.getPrice(WBTC, true)).to.be.equal(btcPrice);
  //   expect(await gmxV1Adapter.getPrice(USDC, true)).to.be.equal(usdcPrice);

  //   var ethPrice = ethers.parseUnits("2000", 8);
  //   var btcPrice = ethers.parseUnits("40000", 8);
  //   var usdcPrice = ethers.parseUnits("1", 8);
  //   await setPrice(muxAdapter, WETH, ethPrice, ethPrice, false);
  //   await setPrice(muxAdapter, WBTC, btcPrice, btcPrice, true);
  //   await setPrice(muxAdapter, USDC, usdcPrice, usdcPrice, true);
  //   expect(await muxAdapter.getPrice(WETH, true)).to.be.equal(ethPrice * 10n ** 10n); // prettier-ignore
  //   expect(await muxAdapter.getPrice(WBTC, true)).to.be.equal(btcPrice * 10n ** 10n); // prettier-ignore
  //   expect(await muxAdapter.getPrice(USDC, true)).to.be.equal(usdcPrice * 10n ** 10n); // prettier-ignore

  //   var ethPrice = ethers.parseUnits("2200", 8);
  //   var btcPrice = ethers.parseUnits("44000", 8);
  //   await setPrice(muxAdapter, WETH, ethPrice, ethPrice, true);
  //   await setPrice(muxAdapter, WBTC, btcPrice, btcPrice, true);
  //   expect(await muxAdapter.getPrice(WETH, true)).to.be.equal(ethPrice * 10n ** 10n); // prettier-ignore
  //   expect(await muxAdapter.getPrice(WBTC, true)).to.be.equal(btcPrice * 10n ** 10n); // prettier-ignore
  //   expect(await muxAdapter.getPrice(USDC, true)).to.be.equal(usdcPrice * 10n ** 10n); // prettier-ignore
  // });

  // it("mux: long", async () => {
  //   const {
  //     account,
  //     muxAdapter,
  //     collateralList,
  //     indexList,
  //     checkBalance,
  //     setDummyPrice,
  //     setPrice,
  //     deposit,
  //     increasePosition,
  //     decreasePosition,
  //   } = await loadFixture(deploy);

  //   await setDummyPrice();

  //   for (var i = 0; i < indexList.length; i++) {
  //     for (var j = 0; j < collateralList.length; j++) {
  //       var snapshotId = await network.provider.send("evm_snapshot", []);

  //       console.log(
  //         `

  // ============================================================
  // collateral: ${collateralList[j].name}, index: ${indexList[i].name}
  //           `
  //       );

  //       var collateral = collateralList[j].address;
  //       var index = indexList[i].address;
  //       var collateralAmount = collateralList[j].amount;
  //       var size = indexList[i].size;
  //       var isLong = true;

  //       await deposit(collateral, collateralAmount);
  //       await checkBalance(account);

  //       await increasePosition(
  //         muxAdapter,
  //         collateral,
  //         index,
  //         collateralAmount,
  //         size,
  //         isLong,
  //         0
  //       );
  //       await checkBalance(account);

  //       const price = indexList[i].muxLongPrice;
  //       await setPrice(muxAdapter, index, price, price, true);

  //       await decreasePosition(muxAdapter, collateral, index, isLong, size, 0);
  //       await checkBalance(account);

  //       var profitTokenAddress = await muxAdapter.getProfitToken(
  //         collateral,
  //         index,
  //         isLong
  //       );
  //       var profitToken = await ethers.getContractAt("IERC20", profitTokenAddress);
  //       expect(await profitToken.balanceOf(account.target)).to.be.greaterThan(0);

  //       await network.provider.send("evm_revert", [snapshotId]);
  //     }
  //   }
  // });

  // it("mux: short", async () => {
  //   const {
  //     account,
  //     muxAdapter,
  //     collateralList,
  //     indexList,
  //     checkBalance,
  //     setDummyPrice,
  //     setPrice,
  //     deposit,
  //     increasePosition,
  //     decreasePosition,
  //   } = await loadFixture(deploy);

  //   await setDummyPrice();

  //   for (var i = 0; i < indexList.length; i++) {
  //     for (var j = 0; j < collateralList.length; j++) {
  //       var snapshotId = await network.provider.send("evm_snapshot", []);

  //       console.log(
  //         `

  // ============================================================
  // collateral: ${collateralList[j].name}, index: ${indexList[i].name}
  //           `
  //       );

  //       var collateral = collateralList[j].address;
  //       var index = indexList[i].address;
  //       var collateralAmount = collateralList[j].amount;
  //       var size = indexList[i].size;
  //       var isLong = false;

  //       await deposit(collateral, collateralAmount);
  //       await checkBalance(account);

  //       await increasePosition(
  //         muxAdapter,
  //         collateral,
  //         index,
  //         collateralAmount,
  //         size,
  //         isLong,
  //         0
  //       );
  //       await checkBalance(account);

  //       const price = indexList[i].muxShortPrice;
  //       await setPrice(muxAdapter, index, price, price, true);

  //       await decreasePosition(muxAdapter, collateral, index, isLong, size, 0);
  //       await checkBalance(account);

  //       var profitTokenAddress = await muxAdapter.getProfitToken(
  //         collateral,
  //         index,
  //         isLong
  //       );
  //       var profitToken = await ethers.getContractAt("IERC20", profitTokenAddress);
  //       expect(await profitToken.balanceOf(account.target)).to.be.greaterThan(0);

  //       await network.provider.send("evm_revert", [snapshotId]);
  //     }
  //   }
  // });

  // it("gmx: long", async () => {
  //   const {
  //     account,
  //     gmxV1Adapter,
  //     collateralList,
  //     indexList,
  //     checkBalance,
  //     setDummyPrice,
  //     setPrice,
  //     deposit,
  //     increasePosition,
  //     decreasePosition,
  //   } = await loadFixture(deploy);

  //   await setDummyPrice();

  //   for (var i = 0; i < 1; i++) {
  //     for (var j = 0; j < 1; j++) {
  //       var snapshotId = await network.provider.send("evm_snapshot", []);

  //       console.log(
  //         `

  // ============================================================
  // collateral: ${collateralList[j].name}, index: ${indexList[i].name}
  //           `
  //       );

  //       var collateral = collateralList[j].address;
  //       var index = indexList[i].address;
  //       var collateralAmount = collateralList[j].amount;
  //       var size = indexList[i].size;
  //       var isLong = true;

  //       await deposit(collateral, collateralAmount);
  //       await checkBalance(account);

  //       await increasePosition(
  //         gmxV1Adapter,
  //         collateral,
  //         index,
  //         collateralAmount,
  //         size,
  //         isLong,
  //         0
  //       );
  //       await checkBalance(account);

  //       const price = indexList[i].gmxLongPrice;
  //       await setPrice(gmxV1Adapter, index, price, price, true);

  //       await decreasePosition(gmxV1Adapter, index, index, isLong, size, 0);
  //       await checkBalance(account);

  //       var profitTokenAddress = await gmxV1Adapter.getProfitToken(
  //         collateral,
  //         index,
  //         isLong
  //       );
  //       var profitToken = await ethers.getContractAt(
  //         "IERC20",
  //         profitTokenAddress
  //       );
  //       expect(await profitToken.balanceOf(account.target)).to.be.greaterThan(
  //         0
  //       );

  //       await network.provider.send("evm_revert", [snapshotId]);
  //     }
  //   }
  // });

  // it("gmx: short", async () => {
  //   const {
  //     account,
  //     exchange,
  //     gmxV1Adapter,
  //     collateralList,
  //     indexList,
  //     checkBalance,
  //     setDummyPrice,
  //     setPrice,
  //     deposit,
  //     increasePosition,
  //     decreasePosition,
  //   } = await loadFixture(deploy);

  //   await setDummyPrice();

  //   for (var i = 0; i < indexList.length; i++) {
  //     for (var j = 0; j < collateralList.length; j++) {
  //       var snapshotId = await network.provider.send("evm_snapshot", []);

  //       console.log(
  //         `

  // ============================================================
  // collateral: ${collateralList[j].name}, index: ${indexList[i].name}
  //           `
  //       );

  //       var collateral = collateralList[j].address;
  //       var index = indexList[i].address;
  //       var collateralAmount = collateralList[j].amount;
  //       var size = indexList[i].size;
  //       var isLong = false;

  //       await deposit(collateral, collateralAmount);
  //       await checkBalance(account);

  //       await increasePosition(
  //         gmxV1Adapter,
  //         collateral,
  //         index,
  //         collateralAmount,
  //         size,
  //         isLong,
  //         0
  //       );
  //       await checkBalance(account);

  //       const price = indexList[i].muxShortPrice;
  //       await setPrice(gmxV1Adapter, index, price, price, true);

  //       var isStableToken = await exchange.isStableToken(collateral);
  //       var defaultStableToken = await exchange.defaultStableToken();
  //       await decreasePosition(
  //         gmxV1Adapter,
  //         isStableToken ? collateral : defaultStableToken,
  //       index,
  //         isLong,
  //         size,
  //         0
  //       );
  //       await checkBalance(account);

  //       var profitTokenAddress = await gmxV1Adapter.getProfitToken(
  //         collateral,
  //         index,
  //         isLong
  //       );
  //       var profitToken = await ethers.getContractAt("IERC20", profitTokenAddress);
  //       expect(await profitToken.balanceOf(account.target)).to.be.greaterThan(0);

  //       await network.provider.send("evm_revert", [snapshotId]);
  //     }
  //   }
  // });

  it("gmx: long - check pnl", async () => {
    const {
      account,
      gmxV1Adapter,
      collateralList,
      indexList,
      vault,
      WETH,
      checkBalance,
      setDummyPrice,
      setPrice,
      deposit,
      increasePosition,
      decreasePosition,
      decreaseCollateral,
    } = await loadFixture(deploy);

    var snapshotId = await network.provider.send("evm_snapshot", []);

    await setDummyPrice();

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;

    await deposit(collateral, collateralAmount);
    await checkBalance(account);

    await increasePosition(
      gmxV1Adapter,
      collateral,
      index,
      collateralAmount,
      size,
      isLong,
      0
    );
    await checkBalance(account);
    console.log(
      await gmxV1Adapter.getPosition(account.target, collateral, index, isLong)
    );

    const price = ethers.parseUnits("2200", 30);
    await setPrice(gmxV1Adapter, index, price, price, true);

    // await decreaseCollateral(
    //   gmxV1Adapter,
    //   collateral,
    //   index,
    //   isLong,
    //   collateralAmount / 2n,
    //   0
    // );
    // await checkBalance(account);
    // console.log(
    //   await gmxV1Adapter.getPosition(account.target, collateral, index, isLong)
    // );

    await decreasePosition(gmxV1Adapter, collateral, index, isLong, size, 0);
    await checkBalance(account);
    console.log(
      await gmxV1Adapter.getPosition(account.target, collateral, index, isLong)
    );
    await network.provider.send("evm_revert", [snapshotId]);
  });

  // it("mux: long - check pnl", async () => {
  //   const {
  //     account,
  //     muxAdapter,
  //     collateralList,
  //     indexList,
  //     WETH,
  //     WBTC,
  //     checkBalance,
  //     setDummyPrice,
  //     setPrice,
  //     deposit,
  //     increasePosition,
  //     decreasePosition,
  //     decreaseCollateral,
  //   } = await loadFixture(deploy);
  //   var snapshotId = await network.provider.send("evm_snapshot", []);

  //   await setDummyPrice();

  //   var collateral = WETH;
  //   var index = WBTC;
  //   var collateralAmount = ethers.parseEther("1");
  //   var size = ethers.parseUnits("0.1", 8);
  //   var isLong = true;

  //   await deposit(collateral, collateralAmount);
  //   await checkBalance(account);

  //   await increasePosition(
  //     muxAdapter,
  //     collateral,
  //     index,
  //     collateralAmount,
  //     size,
  //     isLong,
  //     0
  //   );
  //   await checkBalance(account);

  //   const price = ethers.parseUnits("44000", 8);
  //   await setPrice(muxAdapter, index, price, price, true);

  //   await decreaseCollateral(muxAdapter, collateral, index, isLong, 903120, 0);
  //   await checkBalance(account);

  //   // await decreasePosition(muxAdapter, collateral, index, isLong, size, 0);
  //   await network.provider.send("evm_revert", [snapshotId]);
  // });
});
