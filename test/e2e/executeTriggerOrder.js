const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { deploy } = require("../fixture");

const orderType = {
  tp: 0,
  sl: 1,
};
const deadline = Math.ceil(Date.now() / 1000) + 60 * 60 * 3;

describe("executeTriggerOrder", () => {
  it("gmx v1", async () => {
    const {
      va,
      account,
      orderKeeper,
      gmxV1Adapter,
      WETH,
      checkPosition,
      setDummyPrice,
      deposit,
      increasePosition,
      executeDecreasePosition,
    } = await loadFixture(deploy);
    await setDummyPrice();

    var collateral = WETH;
    var index = WETH;
    var collateralAmount = ethers.parseEther("1");
    var size = ethers.parseEther("10");
    var isLong = true;
    await deposit(collateral, collateralAmount, "0x");
    await increasePosition(gmxV1Adapter, collateral, index, collateralAmount, size, acceptablePrice, isLong); // prettier-ignore
    await checkPosition(gmxV1Adapter, account, collateral, index, isLong);

    var executionFee = 0;
    var triggerPrice = ethers.parseUnits("2000", 18);
    var acceptablePrice = ethers.parseUnits("2000", 18);

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
        "uint256", // executionFee
        "uint256", // deadline
      ],
      [
        gmxV1Adapter.target,
        collateral,
        index,
        isLong,
        size,
        orderType.tp,
        triggerPrice,
        acceptablePrice,
        executionFee,
        deadline,
      ]
    );
    var signature = await va.signMessage(ethers.getBytes(messageHash));
    var adapterFee = await gmxV1Adapter.getMinExecutionFee();
    await account
      .connect(orderKeeper)
      .executeTriggerOrder(
        gmxV1Adapter.target,
        collateral,
        index,
        isLong,
        size,
        orderType.tp,
        triggerPrice,
        acceptablePrice,
        executionFee,
        deadline,
        signature,
        { value: adapterFee }
      );
    await executeDecreasePosition(account.target);
    await checkPosition(gmxV1Adapter, account, collateral, index, isLong);
  });
});
