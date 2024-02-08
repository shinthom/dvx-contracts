const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture");

describe("limitOrder", () => {
  it("gmx v1: directly from EOA", async () => {
    const {
      owner,
      orderKeeper,
      account,
      warehouse,
      gmxV1Adapter,
      WETH,
      deposit,
      executeIncreasePosition,
      setPrice,
    } = await loadFixture(deploy);

    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = true;

    var price = ethers.parseUnits("2000", 30);
    await setPrice(gmxV1Adapter, WETH, price, price, false);

    var triggerPrice = ethers.parseUnits("2000", 18);
    var acceptablePrice = ethers.parseUnits("2000", 18);

    await deposit(collateral, collateralAmount);

    await account.connect(owner).createLimitOrder(
      collateral,
      index,
      collateralAmount,
      size,
      isLong,
      triggerPrice,
      acceptablePrice,
      0, // execution fee,
      "0x"
    );
    console.log(await warehouse.getLimitOrders(account.target));

    const limitOrder = await warehouse.getLimitOrder(account.target, 0);
    console.log(limitOrder.limitOrderId);
    await account
      .connect(owner)
      .cancelLimitOrder(limitOrder.limitOrderId, 0, "0x");

    await account.connect(owner).createLimitOrder(
      collateral,
      index,
      collateralAmount,
      size,
      isLong,
      triggerPrice,
      acceptablePrice,
      0, // execution fee,
      "0x"
    );
    console.log(await warehouse.getLimitOrders(account.target));

    var adapterFee = await gmxV1Adapter.getMinExecutionFee();
    await account
      .connect(orderKeeper)
      .executeLimitOrder(1, gmxV1Adapter.target, {
        value: adapterFee,
      });
    await executeIncreasePosition(account.target);
    console.log(
      await gmxV1Adapter.getPosition(account.target, collateral, index, isLong)
    );
  });

  it("gmx v1: relayed from relayer", async () => {
    const {
      va,
      owner,
      relayer,
      orderKeeper,
      account,
      warehouse,
      gmxV1Adapter,
      WETH,
      deposit,
      executeIncreasePosition,
      setPrice,
    } = await loadFixture(deploy);

    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = true;

    var price = ethers.parseUnits("2000", 30);
    await setPrice(gmxV1Adapter, WETH, price, price, false);

    var executionFee = 0;
    var triggerPrice = ethers.parseUnits("2000", 18);
    var acceptablePrice = ethers.parseUnits("2000", 18);

    await deposit(collateral, collateralAmount);

    // make signature from relayer
    var messageHash = ethers.solidityPackedKeccak256(
      [
        "address", // collateral
        "address", // index
        "uint256", // collateralAmount
        "uint256", // size
        "bool", // isLong
        "uint256", // triggerPrice
        "uint256", // acceptablePrice
        "uint256", // executionFee
      ],
      [
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        triggerPrice,
        acceptablePrice,
        executionFee,
      ]
    );
    var signature = await va.signMessage(ethers.getBytes(messageHash));

    await account.connect(relayer).createLimitOrder(
      collateral,
      index,
      collateralAmount,
      size,
      isLong,
      triggerPrice,
      acceptablePrice,
      executionFee, // execution fee,
      signature
    );
    console.log(await warehouse.getLimitOrders(account.target));

    const limitOrder = await warehouse.getLimitOrder(account.target, 0);

    // make signature from relayer
    var messageHash = ethers.solidityPackedKeccak256(
      [
        "uint256", // limitOrderId
        "uint256", // executionFee
      ],
      [limitOrder.limitOrderId, executionFee]
    );
    var signature = await va.signMessage(ethers.getBytes(messageHash));
    await account
      .connect(owner)
      .cancelLimitOrder(limitOrder.limitOrderId, executionFee, signature);

    // make signature from relayer
    var messageHash = ethers.solidityPackedKeccak256(
      [
        "address", // collateral
        "address", // index
        "uint256", // collateralAmount
        "uint256", // size
        "bool", // isLong
        "uint256", // triggerPrice
        "uint256", // acceptablePrice
        "uint256", // executionFee
      ],
      [
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        triggerPrice,
        acceptablePrice,
        executionFee,
      ]
    );
    var signature = await va.signMessage(ethers.getBytes(messageHash));

    await account.connect(relayer).createLimitOrder(
      collateral,
      index,
      collateralAmount,
      size,
      isLong,
      triggerPrice,
      acceptablePrice,
      executionFee, // execution fee,
      signature
    );
    console.log(await warehouse.getLimitOrders(account.target));

    var adapterFee = await gmxV1Adapter.getMinExecutionFee();
    await account
      .connect(orderKeeper)
      .executeLimitOrder(1, gmxV1Adapter.target, {
        value: adapterFee,
      });
    await executeIncreasePosition(account.target);
    console.log(
      await gmxV1Adapter.getPosition(account.target, collateral, index, isLong)
    );
  });

  it("mux: directly from EOA", async () => {
    const {
      owner,
      orderKeeper,
      account,
      warehouse,
      gmxV1Adapter,
      muxAdapter,
      WETH,
      deposit,
      fillPositionOrder,
      setPrice,
    } = await loadFixture(deploy);

    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = true;

    var price = ethers.parseUnits("2000", 8);
    await setPrice(gmxV1Adapter, WETH, price, price, false);

    var triggerPrice = ethers.parseUnits("2000", 18);
    var acceptablePrice = ethers.parseUnits("2000", 18);

    await deposit(collateral, collateralAmount);

    await account.connect(owner).createLimitOrder(
      collateral,
      index,
      collateralAmount,
      size,
      isLong,
      triggerPrice,
      acceptablePrice,
      0, // execution fee,
      "0x"
    );
    console.log(await warehouse.getLimitOrders(account.target));

    const limitOrder = await warehouse.getLimitOrder(account.target, 0);
    console.log(limitOrder.limitOrderId);
    await account
      .connect(owner)
      .cancelLimitOrder(limitOrder.limitOrderId, 0, "0x");

    await account.connect(owner).createLimitOrder(
      collateral,
      index,
      collateralAmount,
      size,
      isLong,
      triggerPrice,
      acceptablePrice,
      0, // execution fee,
      "0x"
    );
    console.log(await warehouse.getLimitOrders(account.target));

    var adapterFee = await muxAdapter.getMinExecutionFee();
    await account.connect(orderKeeper).executeLimitOrder(1, muxAdapter.target, {
      value: adapterFee,
    });
    await fillPositionOrder();
    console.log(
      await muxAdapter.getPosition(account.target, collateral, index, isLong)
    );
  });

  it("mux: relayed from relayer", async () => {
    const {
      va,
      owner,
      relayer,
      orderKeeper,
      account,
      warehouse,
      muxAdapter,
      WETH,
      deposit,
      fillPositionOrder,
      setPrice,
    } = await loadFixture(deploy);

    const collateral = WETH;
    const index = WETH;
    const collateralAmount = ethers.parseEther("1");
    const size = ethers.parseEther("10");
    const isLong = true;

    var price = ethers.parseUnits("2000", 8);
    await setPrice(muxAdapter, WETH, price, price, false);

    var executionFee = 0;
    var triggerPrice = ethers.parseUnits("2000", 18);
    var acceptablePrice = ethers.parseUnits("2000", 18);

    await deposit(collateral, collateralAmount);

    // make signature from relayer
    var messageHash = ethers.solidityPackedKeccak256(
      [
        "address", // collateral
        "address", // index
        "uint256", // collateralAmount
        "uint256", // size
        "bool", // isLong
        "uint256", // triggerPrice
        "uint256", // acceptablePrice
        "uint256", // executionFee
      ],
      [
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        triggerPrice,
        acceptablePrice,
        executionFee,
      ]
    );
    var signature = await va.signMessage(ethers.getBytes(messageHash));

    await account.connect(relayer).createLimitOrder(
      collateral,
      index,
      collateralAmount,
      size,
      isLong,
      triggerPrice,
      acceptablePrice,
      executionFee, // execution fee,
      signature
    );
    console.log(await warehouse.getLimitOrders(account.target));

    const limitOrder = await warehouse.getLimitOrder(account.target, 0);

    // make signature from relayer
    var messageHash = ethers.solidityPackedKeccak256(
      [
        "uint256", // limitOrderId
        "uint256", // executionFee
      ],
      [limitOrder.limitOrderId, executionFee]
    );
    var signature = await va.signMessage(ethers.getBytes(messageHash));
    await account
      .connect(owner)
      .cancelLimitOrder(limitOrder.limitOrderId, executionFee, signature);

    // make signature from relayer
    var messageHash = ethers.solidityPackedKeccak256(
      [
        "address", // collateral
        "address", // index
        "uint256", // collateralAmount
        "uint256", // size
        "bool", // isLong
        "uint256", // triggerPrice
        "uint256", // acceptablePrice
        "uint256", // executionFee
      ],
      [
        collateral,
        index,
        collateralAmount,
        size,
        isLong,
        triggerPrice,
        acceptablePrice,
        executionFee,
      ]
    );
    var signature = await va.signMessage(ethers.getBytes(messageHash));

    await account.connect(relayer).createLimitOrder(
      collateral,
      index,
      collateralAmount,
      size,
      isLong,
      triggerPrice,
      acceptablePrice,
      executionFee, // execution fee,
      signature
    );
    console.log(await warehouse.getLimitOrders(account.target));

    var adapterFee = await muxAdapter.getMinExecutionFee();
    await account.connect(orderKeeper).executeLimitOrder(1, muxAdapter.target, {
      value: adapterFee,
    });
    await fillPositionOrder();
    console.log(
      await muxAdapter.getPosition(account.target, collateral, index, isLong)
    );
  });
});
