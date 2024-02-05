// https://github.com/aave/aave-v3-core/blob/master/helpers/contracts-helpers.ts#L61
// https://github.com/aave/aave-v3-core/blob/master/test-suites/atoken-permit.spec.ts#L5
// https://github.com/aave/aave-v3-core/blob/master/helpers/contracts-helpers.ts#L19


import { signTypedData_v4 } from "eth-sig-util";
import { fromRpcSig, ECDSASignature } from "ethereumjs-util";

export const getSignatureFromTypedData = (
  privateKey: string,
  typedData: any // TODO: should be TypedData, from eth-sig-utils, but TS doesn't accept it
): ECDSASignature => {
  const signature = signTypedData_v4(
    Buffer.from(privateKey.substring(2, 66), "hex"),
    {
      data: typedData,
    }
  );
  return fromRpcSig(signature);
};

export const buildPermitParams = (
  chainId: number,
  token: tEthereumAddress,
  revision: string,
  tokenName: string,
  owner: tEthereumAddress,
  spender: tEthereumAddress,
  nonce: number,
  deadline: string,
  value: tStringTokenSmallUnits
) => ({
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  },
  primaryType: 'Permit' as const,
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



const msgParams = buildPermitParams(
  chainId,
  aDai.address,
  EIP712_REVISION,
  tokenName,
  owner.address,
  spender.address,
  nonce,
  permitAmount,
  expiration.toFixed()
);

const ownerPrivateKey = testWallets[0].secretKey;

expect((await aDai.allowance(owner.address, spender.address)).toString()).to.be.equal(
  '0',
  'INVALID_ALLOWANCE_BEFORE_PERMIT'
);

const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);