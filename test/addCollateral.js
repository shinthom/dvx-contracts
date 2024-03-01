const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("./fixture");

describe("addCollateral", () => {
  it("deposit", async () => {
    const {
      account,
      owner,
      deployer,
      exchange,
      faucet,
      DAI,
      UNI,
      LINK,
      dai,
      uni,
      link,
    } = await loadFixture(deploy);

    const amount = 100;
    await faucet(DAI, amount);
    await faucet(UNI, amount);
    await faucet(LINK, amount);

    await expect(
      account.connect(owner).deposit(DAI, amount, 0, 0, "0x")
    ).to.be.revertedWith("token: not supported");
    await expect(
      account.connect(owner).deposit(UNI, amount, 0, 0, "0x")
    ).to.be.revertedWith("token: not supported");
    await expect(
      account.connect(owner).deposit(LINK, amount, 0, 0, "0x")
    ).to.be.revertedWith("token: not supported");

    await exchange.connect(deployer).addCollateralTokens([DAI, UNI, LINK]);

    await dai.connect(owner).approve(account.target, amount);
    await uni.connect(owner).approve(account.target, amount);
    await link.connect(owner).approve(account.target, amount);

    await account.connect(owner).deposit(DAI, amount, 0, 0, "0x");
    await account.connect(owner).deposit(UNI, amount, 0, 0, "0x");
    await account.connect(owner).deposit(LINK, amount, 0, 0, "0x");
  });

  it("depositPermit", async () => {
    const {
      account,
      owner,
      deployer,
      exchange,
      faucet,
      DAI,
      UNI,
      LINK,
      dai,
      uni,
      link,
    } = await loadFixture(deploy);

    const makePermitSignature = async (token, amount) => {
      let version;
      try {
        version = await token.version();
      } catch (_) {
        version = "1";
      }

      const domain = {
        name: await token.name(),
        version: version,
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: token.target,
      };
      const types = {
        Permit: [
          {
            name: "owner",
            type: "address",
          },
          {
            name: "spender",
            type: "address",
          },
          {
            name: "value",
            type: "uint256",
          },
          {
            name: "nonce",
            type: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
          },
        ],
      };
      const values = {
        owner: owner.address,
        spender: account.target,
        value: amount,
        nonce: await token.nonces(owner.address),
        deadline: ethers.MaxUint256,
      };
      const signature = await owner.signTypedData(domain, types, values);

      return ethers.Signature.from(signature);
    };

    const amount = 100;
    await faucet(DAI, amount);
    await faucet(UNI, amount);
    await faucet(LINK, amount);

    await expect(
      account.connect(owner).deposit(DAI, amount, 0, 0, "0x")
    ).to.be.revertedWith("token: not supported");
    await expect(
      account.connect(owner).deposit(UNI, amount, 0, 0, "0x")
    ).to.be.revertedWith("token: not supported");
    await expect(
      account.connect(owner).deposit(LINK, amount, 0, 0, "0x")
    ).to.be.revertedWith("token: not supported");

    await exchange.connect(deployer).addCollateralTokens([DAI, UNI, LINK]);

    const daiPermitSignature = await makePermitSignature(dai, amount);
    const uniPermitSignature = await makePermitSignature(uni, amount);
    const linkPermitSignature = await makePermitSignature(link, amount);

    await account
      .connect(owner)
      .depositPermit(
        DAI,
        amount,
        daiPermitSignature.v,
        daiPermitSignature.r,
        daiPermitSignature.s,
        0,
        0,
        "0x"
      );
    await account
      .connect(owner)
      .depositPermit(
        UNI,
        amount,
        uniPermitSignature.v,
        uniPermitSignature.r,
        uniPermitSignature.s,
        0,
        0,
        "0x"
      );
    await account
      .connect(owner)
      .depositPermit(
        LINK,
        amount,
        linkPermitSignature.v,
        linkPermitSignature.r,
        linkPermitSignature.s,
        0,
        0,
        "0x"
      );
  });

  it("setStableToken", async () => {
    const { deployer, exchange, DAI, UNI, LINK } = await loadFixture(deploy);

    await exchange.connect(deployer).addCollateralTokens([DAI, UNI, LINK]);

    expect(await exchange.isStableToken(DAI)).to.be.equal(false);
    await exchange.connect(deployer).setStableToken(DAI, true);
    expect(await exchange.isStableToken(DAI)).to.be.equal(true);
  });

  it("openPosition (GMX V1)", async () => {
    const {
      account,
      owner,
      deployer,
      exchange,
      deposit,
      WETH,
      DAI,
      UNI,
      LINK,
      gmxV1Adapter,
      executeIncreasePosition,
    } = await loadFixture(deploy);
    await exchange.connect(deployer).addCollateralTokens([DAI, UNI, LINK]);
    await exchange.connect(deployer).setStableToken(DAI, true);

    var collateral = DAI;
    var index = WETH;
    var collateralAmount = ethers.parseUnits("1000", 18);
    var size = ethers.parseEther("1");
    var isLong = true;
    await deposit(collateral, collateralAmount);
    await account
      .connect(owner)
      .increasePosition(gmxV1Adapter.target, collateral, index, collateralAmount, size, isLong, 0, 0, 0, "0x", { value: await gmxV1Adapter.getMinExecutionFee() }); // prettier-ignore
    await executeIncreasePosition(account.target);
    console.log(await gmxV1Adapter.getPosition(account.target, index, index, isLong)); // prettier-ignore
    console.log(await gmxV1Adapter.getWrapPosition(account.target, index, index, isLong)); // prettier-ignore

    var collateral = UNI;
    var index = WETH;
    var collateralAmount = ethers.parseUnits("30", 18);
    var size = ethers.parseEther("1");
    var isLong = true;
    await deposit(collateral, collateralAmount);
    await account
      .connect(owner)
      .increasePosition(gmxV1Adapter.target, collateral, index, collateralAmount, size, isLong, 0, 0, 0, "0x", { value: await gmxV1Adapter.getMinExecutionFee() }); // prettier-ignore
    await executeIncreasePosition(account.target);
    console.log(await gmxV1Adapter.getPosition(account.target, index, index, isLong)); // prettier-ignore
    console.log(await gmxV1Adapter.getWrapPosition(account.target, index, index, isLong)); // prettier-ignore

    var collateral = LINK;
    var index = WETH;
    var collateralAmount = ethers.parseUnits("80", 18);
    var size = ethers.parseEther("1");
    var isLong = true;
    await deposit(collateral, collateralAmount);
    await account
      .connect(owner)
      .increasePosition(gmxV1Adapter.target, collateral, index, collateralAmount, size, isLong, 0, 0, 0, "0x", { value: await gmxV1Adapter.getMinExecutionFee() }); // prettier-ignore
    await executeIncreasePosition(account.target);
    console.log(await gmxV1Adapter.getPosition(account.target, index, index, isLong)); // prettier-ignore
    console.log(await gmxV1Adapter.getWrapPosition(account.target, index, index, isLong)); // prettier-ignore
  });

  it("openPosition (MUX)", async () => {
    const {
      account,
      owner,
      deployer,
      exchange,
      deposit,
      WETH,
      DAI,
      UNI,
      LINK,
      muxAdapter,
      fillPositionOrder,
      fillWithdrawalOrder,
    } = await loadFixture(deploy);
    await exchange.connect(deployer).addCollateralTokens([DAI, UNI, LINK]);
    await exchange.connect(deployer).setStableToken(DAI, true);

    var collateral = DAI;
    var index = WETH;
    var collateralAmount = ethers.parseUnits("1000", 18);
    var size = ethers.parseEther("1");
    var isLong = true;
    await deposit(collateral, collateralAmount);
    await account
      .connect(owner)
      .increasePosition(muxAdapter.target, collateral, index, collateralAmount, size, isLong, 0, 0, 0, "0x"); // prettier-ignore
    await fillPositionOrder();
    console.log(await muxAdapter.getPosition(account.target, collateral, index, isLong)); // prettier-ignore
    console.log(await muxAdapter.getWrapPosition(account.target, collateral, index, isLong)); // prettier-ignore
    await deposit(collateral, collateralAmount);
    await account
      .connect(owner)
      .increaseCollateral(muxAdapter.target, collateral, index, isLong, collateral, collateralAmount, 0, 0, "0x"); // prettier-ignore
    console.log(await muxAdapter.getPosition(account.target, collateral, index, isLong)); // prettier-ignore
    console.log(await muxAdapter.getWrapPosition(account.target, collateral, index, isLong)); // prettier-ignore
    await account
      .connect(owner)
      .decreaseCollateral(muxAdapter.target, collateral, index, isLong, collateralAmount, 0, 0, "0x"); // prettier-ignore
    await fillWithdrawalOrder();
    console.log(await muxAdapter.getPosition(account.target, collateral, index, isLong)); // prettier-ignore
    console.log(await muxAdapter.getWrapPosition(account.target, collateral, index, isLong)); // prettier-ignore
    await account
      .connect(owner)
      .decreasePosition(muxAdapter.target, collateral, index, isLong, size, 0, 0, 0, "0x"); // prettier-ignore
    await fillPositionOrder();
    console.log(await muxAdapter.getPosition(account.target, collateral, index, isLong)); // prettier-ignore
    console.log(await muxAdapter.getWrapPosition(account.target, collateral, index, isLong)); // prettier-ignore
  });

  it("decreaseCollateral - hotfix", async () => {
    const {
      account,
      owner,
      deployer,
      exchange,
      deposit,
      WETH,
      DAI,
      USDC,
      UNI,
      LINK,
      gmxV1Adapter,
      executeIncreasePosition,
      executeDecreasePosition,
    } = await loadFixture(deploy);
    await exchange.connect(deployer).addCollateralTokens([DAI, UNI, LINK]);
    await exchange.connect(deployer).setStableToken(DAI, true);

    var collateral = DAI;
    var index = WETH;
    var collateralAmount = ethers.parseUnits("1000", 18);
    var size = ethers.parseEther("1");
    var isLong = false;
    await deposit(collateral, collateralAmount);
    await account
      .connect(owner)
      .increasePosition(gmxV1Adapter.target, collateral, index, collateralAmount, size, isLong, 0, 0, 0, "0x", { value: await gmxV1Adapter.getMinExecutionFee() }); // prettier-ignore
    await executeIncreasePosition(account.target);
    console.log(await gmxV1Adapter.getPosition(account.target, collateral, index, isLong)); // prettier-ignore
    console.log(await gmxV1Adapter.getWrapPosition(account.target, collateral, index, isLong)); // prettier-ignore

    var collateralAmount = ethers.parseUnits("500", 18);
    await account
      .connect(owner)
      .decreaseCollateral(gmxV1Adapter.target, collateral, index, isLong, collateralAmount, 0, 0, "0x", { value: await gmxV1Adapter.getMinExecutionFee() }); // prettier-ignore
    await executeDecreasePosition(account.target);
    console.log(await gmxV1Adapter.getPosition(account.target, collateral, index, isLong)); // prettier-ignore
    console.log(await gmxV1Adapter.getWrapPosition(account.target, collateral, index, isLong)); // prettier-ignore

    var collateral = USDC;
    var index = WETH;
    var collateralAmount = ethers.parseUnits("1000", 6);
    var size = ethers.parseEther("1");
    var isLong = false;
    await deposit(collateral, collateralAmount);
    await account
      .connect(owner)
      .increasePosition(gmxV1Adapter.target, collateral, index, collateralAmount, size, isLong, 0, 0, 0, "0x", { value: await gmxV1Adapter.getMinExecutionFee() }); // prettier-ignore
    await executeIncreasePosition(account.target);
    console.log(await gmxV1Adapter.getPosition(account.target, collateral, index, isLong)); // prettier-ignore
    console.log(await gmxV1Adapter.getWrapPosition(account.target, collateral, index, isLong)); // prettier-ignore

    var collateralAmount = ethers.parseUnits("500", 6);
    await account
      .connect(owner)
      .decreaseCollateral(gmxV1Adapter.target, collateral, index, isLong, collateralAmount, 0, 0, "0x", { value: await gmxV1Adapter.getMinExecutionFee() }); // prettier-ignore
    await executeDecreasePosition(account.target);
    console.log(await gmxV1Adapter.getPosition(account.target, collateral, index, isLong)); // prettier-ignore
    console.log(await gmxV1Adapter.getWrapPosition(account.target, collateral, index, isLong)); // prettier-ignore
  });
});
