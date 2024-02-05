const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../fixture");
const { signTypedData_v4 } = require("eth-sig-util");
const { fromRpcSig } = require("ethereumjs-util");

const buildPermitParams = (
  chainId,
  token,
  revision,
  tokenName,
  owner,
  spender,
  nonce,
  deadline,
  value
) => ({
  types: {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  },
  primaryType: "Permit",
  domain: {
    name: tokenName,
    version: revision,
    chainId: chainId,
    verifyingContract: token,
  },
  message: {
    owner,
    spender,
    value,
    nonce,
    deadline,
  },
});

const getSignatureFromTypedData = (privateKey, typedData) => {
  // https://docs.metamask.io/wallet/how-to/sign-data/#use-eth_signtypeddata_v4
  const signature = signTypedData_v4(
    Buffer.from(privateKey.substring(2, 66), "hex"),
    {
      data: typedData,
    }
  );
  return fromRpcSig(signature);
};

// Reference
// https://github.com/aave/aave-v3-core/blob/master/helpers/contracts-helpers.ts#L61
// https://github.com/aave/aave-v3-core/blob/master/test-suites/atoken-permit.spec.ts#L5

describe("depositPermit", () => {
  const arbitrumChainId = 42161;

  it("e2e", async () => {
    // prettier-ignore
    const { owner, ownerPk, account, USDC, usdc, deposit, executeIncreasePosition } =
      await loadFixture(deploy);

    const depositToken = USDC;
    const depositAmount = ethers.parseUnits("1000", 6);

    const nonce = await usdc.nonces(owner.address);

    // note: BigInt is not allowed in typed data (Error: Argument is not a number)
    const permitParams = buildPermitParams(
      arbitrumChainId,
      depositToken,
      1, // version,
      await usdc.name(),
      owner.address,
      account.target, // spender
      nonce.toString(),
      ethers.MaxInt256.toString(), // deadline
      depositAmount.toString()
    );
    var allowance = await usdc.allowance(owner.address, account.target);
    console.log(allowance);

    const { v, r, s } = getSignatureFromTypedData(ownerPk, permitParams);
    console.log(v, r, s);

    await usdc
      .connect(owner)
      .permit(
        owner.address,
        account.target,
        depositAmount,
        ethers.MaxInt256,
        v,
        r,
        s
      );
    var allowance = await usdc.allowance(owner.address, account.target);
    console.log(allowance);
  });
});
