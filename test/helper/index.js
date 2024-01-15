const { ethers } = require("hardhat");

const ETH = ethers.ZeroAddress;
const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const WBTC = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const USDT = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
const USDCe = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";

const faucet = async (account, token, tokenAmount) => {
  const abiCoder = new ethers.AbiCoder();

  if (token == USDC) {
    const storageSlot = 9n;
    const encoded = abiCoder.encode(
      ["address", "uint256"],
      [account, storageSlot]
    );
    const balanceStorageSlot = ethers.keccak256(encoded);
    await ethers.provider.send("hardhat_setStorageAt", [
      token,
      balanceStorageSlot,
      abiCoder.encode(["uint256"], [tokenAmount]),
    ]);
  } else if (token == WBTC || token == USDCe || token == USDT) {
    const storageSlot = 51n;
    const encoded = abiCoder.encode(
      ["address", "uint256"],
      [account, storageSlot]
    );
    const balanceStorageSlot = ethers.keccak256(encoded);
    await ethers.provider.send("hardhat_setStorageAt", [
      token,
      balanceStorageSlot,
      abiCoder.encode(["uint256"], [tokenAmount]),
    ]);
  }
};

module.exports = {
  faucet,
};
