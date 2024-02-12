const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("./fixture");

const deadline = Math.ceil(Date.now() / 1000) + 60 * 60 * 3;

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
      const networkFee = 0;
      const adapterFee = await gmxV1Adapter.getMinExecutionFee();

      // deposit
      await deposit(collateral, collateralAmount);

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
          networkFee,
          0,
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

      // deposit to add collateral
      await deposit(collateral, collateralAmount);

      // increaseCollateral
      await account.connect(owner).increaseCollateral(
        gmxV1Adapter.target,
        collateral,
        index,
        isLong,
        collateral, // tokenIn
        collateralAmount, // amountIn
        networkFee,
        0,
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
          networkFee,
          0,
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
          acceptablePrice,
          networkFee,
          0,
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
      const networkFee = 0;
      const adapterFee = await gmxV1Adapter.getMinExecutionFee();

      // deposit
      await deposit(collateral, collateralAmount);

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
          "uint256", // networkFee
          "uint256", // deadline
        ],
        [
          gmxV1Adapter.target,
          collateral,
          index,
          collateralAmount,
          size,
          isLong,
          acceptablePrice,
          networkFee,
          deadline,
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
          networkFee,
          deadline,
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
      await deposit(collateral, collateralAmount);

      // make signature from relayer
      var messageHash = ethers.solidityPackedKeccak256(
        [
          "address", // adapter
          "address", // collateral
          "address", // index
          "bool", // isLong
          "address", // tokenIn
          "uint256", // amountIn
          "uint256", // networkFee
          "uint256", // deadline
        ],
        [
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          collateral, // tokenIn
          collateralAmount, // amountIn
          networkFee,
          deadline,
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
        networkFee,
        deadline,
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
          "uint256", // networkFee,
          "uint256", // deadline
        ],
        [
          gmxV1Adapter.target,
          collateral,
          index,
          isLong,
          collateralAmount,
          networkFee,
          deadline,
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
          networkFee,
          deadline,
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
          acceptablePrice,
          networkFee,
          deadline,
        ]
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
          acceptablePrice,
          networkFee,
          deadline,
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
      const networkFee = 0;
      const adapterFee = await muxAdapter.getMinExecutionFee();
      // deposit
      await deposit(collateral, collateralAmount);
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
          networkFee,
          0,
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
      await deposit(collateral, collateralAmount);
      // increaseCollateral
      await account.connect(owner).increaseCollateral(
        muxAdapter.target,
        collateral,
        index,
        isLong,
        collateral, // tokenIn
        collateralAmount, // amountIn
        networkFee,
        0,
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
          networkFee,
          0,
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
          acceptablePrice,
          networkFee,
          0,
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
      const networkFee = 0;
      const adapterFee = await muxAdapter.getMinExecutionFee();
      // deposit
      await deposit(collateral, collateralAmount);
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
          "uint256", // networkFee
          "uint256", // deadline
        ],
        [
          muxAdapter.target,
          collateral,
          index,
          collateralAmount,
          size,
          isLong,
          acceptablePrice,
          networkFee,
          deadline,
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
          networkFee,
          deadline,
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
      await deposit(collateral, collateralAmount);
      // make signature from relayer
      var messageHash = ethers.solidityPackedKeccak256(
        [
          "address", // adapter
          "address", // collateral
          "address", // index
          "bool", // isLong
          "address", // tokenIn
          "uint256", // amountIn
          "uint256", // networkFee
          "uint256", // deadline
        ],
        [
          muxAdapter.target,
          collateral,
          index,
          isLong,
          collateral, // tokenIn
          collateralAmount, // amountIn
          networkFee,
          deadline,
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
        networkFee,
        deadline,
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
          "uint256", // networkFee
          "uint256", // deadline
        ],
        [
          muxAdapter.target,
          collateral,
          index,
          isLong,
          collateralAmount,
          networkFee,
          deadline,
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
          networkFee,
          deadline,
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
          "uint256", // acceptablePrice
          "uint256", // networkFee
          "uint256", // deadline
        ],
        [
          muxAdapter.target,
          collateral,
          index,
          isLong,
          size,
          acceptablePrice,
          networkFee,
          deadline,
        ]
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
          acceptablePrice,
          networkFee,
          deadline,
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
