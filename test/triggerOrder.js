const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("./fixture");

describe("createTriggerOrder, executeTriggerOrder", () => {
  it("relay executeLimitOrder", async () => {
    const {
      va,
      owner,
      account,
      WETH,
      orderKeeper,
      gmxV1Adapter,
      checkPosition,
      executeDecreasePosition,
      executeIncreasePosition,
      setDummyPrice,
      deposit,
    } = await loadFixture(deploy);

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;

    await setDummyPrice();
    var acceptablePrice = ethers.parseUnits("2000", 18);
    var triggerPrice = ethers.parseUnits("2000", 18);
    var networkFee = 0;
    var deadline = Math.ceil(Date.now() / 1000) + 60 * 60 * 3;

    await deposit(collateral, collateralAmount);
    await account
      .connect(owner)
      .increasePosition(
        gmxV1Adapter.target,
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        acceptablePrice,
        networkFee,
        deadline,
        "0x",
        { value: await gmxV1Adapter.getMinExecutionFee() }
      );
    await executeIncreasePosition(account.target);
    await checkPosition(gmxV1Adapter, account, collateral, index, isLong);

    var messageHash = ethers.solidityPackedKeccak256(
      [
        "address", // adapter
        "address", // collateral
        "address", // index
        "bool", // isLong
        "uint256", // size
        "uint8", // orderType
        "uint256", // triggerPrice
        "uint256", // acceptablePrice
        "uint256", // networkFee
        "uint256", // deadline
      ],
      [
        gmxV1Adapter.target,
        collateral,
        index,
        isLong,
        size,
        0, // 0: tp, 1: sl
        triggerPrice,
        acceptablePrice,
        networkFee,
        deadline,
      ]
    );
    var signature = await va.signMessage(ethers.getBytes(messageHash));

    await account.connect(orderKeeper).executeTriggerOrder(
      gmxV1Adapter.target,
      collateral,
      index,
      isLong,
      size,
      0, // tp
      triggerPrice,
      acceptablePrice,
      networkFee,
      deadline,
      signature,
      { value: await gmxV1Adapter.getMinExecutionFee() }
    );
    await executeDecreasePosition(account.target);
    await checkPosition(gmxV1Adapter, account, collateral, index, isLong);
  });
});
