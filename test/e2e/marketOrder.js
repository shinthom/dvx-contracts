const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture");

describe("marketOrder", () => {
  describe("gmxV1 - long", () => {
    it("directly from EOA", async () => {
      const {
        owner,
        account,
        gmxV1Adapter,
        WETH,
        setDummyPrice,
        deposit,
        executeIncreasePosition,
        executeDecreasePosition,
      } = await loadFixture(deploy);
      await setDummyPrice();

      const collateral = WETH;
      const index = WETH;
      const collateralAmount = ethers.parseEther("1");
      const size = ethers.parseEther("10");
      const isLong = true;

      const acceptablePrice = ethers.parseUnits("2000", 18);
      const executionFee = 0;
      const adapterFee = await gmxV1Adapter.getMinExecutionFee();

      // deposit
      await deposit(collateral, collateralAmount, "0x");

      // increasePosition
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
          executionFee,
          "0x",
          { value: adapterFee }
        );
      await executeIncreasePosition(account.target);
      var wrapPosition = await gmxV1Adapter.getWrapPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(wrapPosition);
      var position = await gmxV1Adapter.getPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(position);

      // deposit to add collateral
      await deposit(collateral, collateralAmount, "0x");

      // increaseCollateral
      await account.connect(owner).increaseCollateral(
        gmxV1Adapter.target,
        collateral,
        index,
        isLong,
        collateral, // tokenIn
        collateralAmount, // amountIn
        executionFee,
        "0x",
        { value: adapterFee }
      );
      await executeIncreasePosition(account.target);
      var wrapPosition = await gmxV1Adapter.getWrapPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(wrapPosition);
      var position = await gmxV1Adapter.getPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(position);

      // decreaseCollateral
      await account
        .connect(owner)
        .decreaseCollateral(
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          collateralAmount,
          executionFee,
          "0x",
          { value: adapterFee }
        );
      await executeDecreasePosition(account.target);
      var wrapPosition = await gmxV1Adapter.getWrapPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(wrapPosition);
      var position = await gmxV1Adapter.getPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(position);

      // decreasePosition
      await account
        .connect(owner)
        .decreasePosition(
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          size,
          executionFee,
          "0x",
          { value: adapterFee }
        );
      await executeDecreasePosition(account.target);
      var wrapPosition = await gmxV1Adapter.getWrapPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(wrapPosition);
      var position = await gmxV1Adapter.getPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(position);
    });

    it("relayed from relayer", async () => {
      const {
        va,
        relayer,
        account,
        gmxV1Adapter,
        WETH,
        setDummyPrice,
        deposit,
        executeIncreasePosition,
        executeDecreasePosition,
      } = await loadFixture(deploy);
      await setDummyPrice();

      const collateral = WETH;
      const index = WETH;
      const collateralAmount = ethers.parseEther("1");
      const size = ethers.parseEther("10");
      const isLong = true;

      const acceptablePrice = ethers.parseUnits("2000", 18);
      const executionFee = 0;
      const adapterFee = await gmxV1Adapter.getMinExecutionFee();

      // deposit
      await deposit(collateral, collateralAmount, "0x");

      // make signature from relayer
      var messageHash = ethers.solidityPackedKeccak256(
        [
          "address", // adapter
          "address", // collateral
          "address", // index
          "uint256", // collateralAmount
          "uint256", // size
          "bool", // isLong
          "uint256", // acceptablePrice
          "uint256", // executionFee
        ],
        [
          gmxV1Adapter.target,
          collateral,
          index,
          collateralAmount,
          size,
          isLong,
          acceptablePrice,
          executionFee,
        ]
      );
      var signature = await va.signMessage(ethers.getBytes(messageHash));

      // increasePosition
      await account
        .connect(relayer)
        .increasePosition(
          gmxV1Adapter.target,
          collateral,
          index,
          collateralAmount,
          size,
          isLong,
          acceptablePrice,
          executionFee,
          signature,
          { value: adapterFee }
        );
      await executeIncreasePosition(account.target);
      var wrapPosition = await gmxV1Adapter.getWrapPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(wrapPosition);
      var position = await gmxV1Adapter.getPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(position);

      // deposit to add collateral
      await deposit(collateral, collateralAmount, "0x");

      // make signature from relayer
      var messageHash = ethers.solidityPackedKeccak256(
        [
          "address", // adapter
          "address", // collateral
          "address", // index
          "bool", // isLong
          "address", // tokenIn
          "uint256", // amountIn
          "uint256", // executionFee
        ],
        [
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          collateral, // tokenIn
          collateralAmount, // amountIn
          executionFee,
        ]
      );
      var signature = await va.signMessage(ethers.getBytes(messageHash));

      // increaseCollateral
      await account.connect(relayer).increaseCollateral(
        gmxV1Adapter.target,
        collateral,
        index,
        isLong,
        collateral, // tokenIn
        collateralAmount, // amountIn
        executionFee,
        signature,
        { value: adapterFee }
      );
      await executeIncreasePosition(account.target);
      var wrapPosition = await gmxV1Adapter.getWrapPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(wrapPosition);
      var position = await gmxV1Adapter.getPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(position);

      // make signature from relayer
      var messageHash = ethers.solidityPackedKeccak256(
        [
          "address", // adapter
          "address", // collateral
          "address", // index
          "bool", // isLong
          "uint256", // collateralAmount
          "uint256", // executionFee
        ],
        [
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          collateralAmount,
          executionFee,
        ]
      );
      var signature = await va.signMessage(ethers.getBytes(messageHash));

      // decreaseCollateral
      await account
        .connect(relayer)
        .decreaseCollateral(
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          collateralAmount,
          executionFee,
          signature,
          { value: adapterFee }
        );
      await executeDecreasePosition(account.target);
      var wrapPosition = await gmxV1Adapter.getWrapPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(wrapPosition);
      var position = await gmxV1Adapter.getPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(position);

      // make signature from relayer
      var messageHash = ethers.solidityPackedKeccak256(
        [
          "address", // adapter
          "address", // collateral
          "address", // index
          "bool", // isLong
          "uint256", // size
          "uint256", // executionFee
        ],
        [gmxV1Adapter.target, collateral, index, isLong, size, executionFee]
      );
      var signature = await va.signMessage(ethers.getBytes(messageHash));

      // decreasePosition
      await account
        .connect(relayer)
        .decreasePosition(
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          size,
          executionFee,
          signature,
          { value: adapterFee }
        );
      await executeDecreasePosition(account.target);
      var wrapPosition = await gmxV1Adapter.getWrapPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(wrapPosition);
      var position = await gmxV1Adapter.getPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(position);
    });
  });

  describe("mux", () => {
    it("directly from EOA", async () => {
      const {
        owner,
        account,
        muxAdapter,
        WETH,
        setDummyPrice,
        deposit,
        fillPositionOrder,
        fillWithdrawalOrder,
      } = await loadFixture(deploy);
      await setDummyPrice();

      const collateral = WETH;
      const index = WETH;
      const collateralAmount = ethers.parseEther("1");
      const size = ethers.parseEther("10");
      const isLong = true;

      const acceptablePrice = ethers.parseUnits("2000", 18);
      const executionFee = 0;
      const adapterFee = await muxAdapter.getMinExecutionFee();

      // deposit
      await deposit(collateral, collateralAmount, "0x");

      // increasePosition
      await account
        .connect(owner)
        .increasePosition(
          muxAdapter.target,
          collateral,
          index,
          collateralAmount,
          size,
          isLong,
          acceptablePrice,
          executionFee,
          "0x",
          { value: adapterFee }
        );
      await fillPositionOrder();
      var wrapPosition = await muxAdapter.getWrapPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(wrapPosition);
      var position = await muxAdapter.getPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(position);

      // deposit to add collateral
      await deposit(collateral, collateralAmount, "0x");

      // increaseCollateral
      await account.connect(owner).increaseCollateral(
        muxAdapter.target,
        collateral,
        index,
        isLong,
        collateral, // tokenIn
        collateralAmount, // amountIn
        executionFee,
        "0x",
        { value: adapterFee }
      );
      var wrapPosition = await muxAdapter.getWrapPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(wrapPosition);
      var position = await muxAdapter.getPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(position);

      // decreaseCollateral
      await account
        .connect(owner)
        .decreaseCollateral(
          muxAdapter.target,
          collateral,
          index,
          isLong,
          collateralAmount,
          executionFee,
          "0x",
          { value: adapterFee }
        );
      await fillWithdrawalOrder();
      var wrapPosition = await muxAdapter.getWrapPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(wrapPosition);
      var position = await muxAdapter.getPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(position);

      // decreasePosition
      await account
        .connect(owner)
        .decreasePosition(
          muxAdapter.target,
          collateral,
          index,
          isLong,
          size,
          executionFee,
          "0x",
          { value: adapterFee }
        );
      await fillPositionOrder();
      var wrapPosition = await muxAdapter.getWrapPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(wrapPosition);
      var position = await muxAdapter.getPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(position);
    });

    it("relayed from relayer", async () => {
      const {
        va,
        relayer,
        account,
        muxAdapter,
        WETH,
        setDummyPrice,
        deposit,
        fillPositionOrder,
        fillWithdrawalOrder,
      } = await loadFixture(deploy);
      await setDummyPrice();

      const collateral = WETH;
      const index = WETH;
      const collateralAmount = ethers.parseEther("1");
      const size = ethers.parseEther("10");
      const isLong = true;

      const acceptablePrice = ethers.parseUnits("2000", 18);
      const executionFee = 0;
      const adapterFee = await muxAdapter.getMinExecutionFee();

      // deposit
      await deposit(collateral, collateralAmount, "0x");

      // make signature from relayer
      var messageHash = ethers.solidityPackedKeccak256(
        [
          "address", // adapter
          "address", // collateral
          "address", // index
          "uint256", // collateralAmount
          "uint256", // size
          "bool", // isLong
          "uint256", // acceptablePrice
          "uint256", // executionFee
        ],
        [
          muxAdapter.target,
          collateral,
          index,
          collateralAmount,
          size,
          isLong,
          acceptablePrice,
          executionFee,
        ]
      );
      var signature = await va.signMessage(ethers.getBytes(messageHash));

      // increasePosition
      await account
        .connect(relayer)
        .increasePosition(
          muxAdapter.target,
          collateral,
          index,
          collateralAmount,
          size,
          isLong,
          acceptablePrice,
          executionFee,
          signature,
          { value: adapterFee }
        );
      await fillPositionOrder();
      var wrapPosition = await muxAdapter.getWrapPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(wrapPosition);
      var position = await muxAdapter.getPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(position);

      // deposit to add collateral
      await deposit(collateral, collateralAmount, "0x");

      // make signature from relayer
      var messageHash = ethers.solidityPackedKeccak256(
        [
          "address", // adapter
          "address", // collateral
          "address", // index
          "bool", // isLong
          "address", // tokenIn
          "uint256", // amountIn
          "uint256", // executionFee
        ],
        [
          muxAdapter.target,
          collateral,
          index,
          isLong,
          collateral, // tokenIn
          collateralAmount, // amountIn
          executionFee,
        ]
      );
      var signature = await va.signMessage(ethers.getBytes(messageHash));

      // increaseCollateral
      await account.connect(relayer).increaseCollateral(
        muxAdapter.target,
        collateral,
        index,
        isLong,
        collateral, // tokenIn
        collateralAmount, // amountIn
        executionFee,
        signature,
        { value: adapterFee }
      );
      var wrapPosition = await muxAdapter.getWrapPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(wrapPosition);
      var position = await muxAdapter.getPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(position);

      // make signature from relayer
      var messageHash = ethers.solidityPackedKeccak256(
        [
          "address", // adapter
          "address", // collateral
          "address", // index
          "bool", // isLong
          "uint256", // collateralAmount
          "uint256", // executionFee
        ],
        [
          muxAdapter.target,
          collateral,
          index,
          isLong,
          collateralAmount,
          executionFee,
        ]
      );
      var signature = await va.signMessage(ethers.getBytes(messageHash));

      // decreaseCollateral
      await account
        .connect(relayer)
        .decreaseCollateral(
          muxAdapter.target,
          collateral,
          index,
          isLong,
          collateralAmount,
          executionFee,
          signature,
          { value: adapterFee }
        );
      await fillWithdrawalOrder();
      var wrapPosition = await muxAdapter.getWrapPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(wrapPosition);
      var position = await muxAdapter.getPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(position);

      // make signature from relayer
      var messageHash = ethers.solidityPackedKeccak256(
        [
          "address", // adapter
          "address", // collateral
          "address", // index
          "bool", // isLong
          "uint256", // size
          "uint256", // executionFee
        ],
        [muxAdapter.target, collateral, index, isLong, size, executionFee]
      );
      var signature = await va.signMessage(ethers.getBytes(messageHash));

      // decreasePosition
      await account
        .connect(relayer)
        .decreasePosition(
          muxAdapter.target,
          collateral,
          index,
          isLong,
          size,
          executionFee,
          signature,
          { value: adapterFee }
        );
      await fillPositionOrder();
      var wrapPosition = await muxAdapter.getWrapPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(wrapPosition);
      var position = await muxAdapter.getPosition(
        account.target,
        collateral,
        index,
        isLong
      );
      console.log(position);
    });
  });
});
