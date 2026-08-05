/**
 * Mint MockBTCB to a wallet on BSC Testnet (after deploy:bsc-testnet with mocks).
 *
 * Usage:
 *   FUND_TO=0xYourWallet npm run fund:testnet
 *   FUND_TO=0xYourWallet FUND_AMOUNT=5000 npm run fund:testnet
 *
 * Requires PRIVATE_KEY of the deployer (MockBTCB owner) in smart-contracts/.env
 */
import "dotenv/config";
import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fundAddressWithMockBTCB } from "./lib/fundDemoAccounts";

async function main() {
  const connection = await hre.network.connect();
  const { ethers } = connection;
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  if (chainId !== 97) {
    throw new Error(
      `fund:testnet is for BSC Testnet (97). Current chainId=${chainId}`,
    );
  }

  const to = (process.env.FUND_TO || "").trim();
  if (!to || !ethers.isAddress(to)) {
    throw new Error(
      "Set FUND_TO to a wallet address, e.g. FUND_TO=0xabc… npm run fund:testnet",
    );
  }

  const amountHuman = (process.env.FUND_AMOUNT || "1000").trim();

  const addressesPath = path.resolve("deployed-addresses.json");
  if (!fs.existsSync(addressesPath)) {
    throw new Error("deployed-addresses.json missing — run npm run deploy:bsc-testnet first");
  }
  const json = JSON.parse(fs.readFileSync(addressesPath, "utf8")) as Record<
    string,
    string | number
  >;
  const tokenAddress = String(json.MockBTCB || json.Token || "").trim();
  if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
    throw new Error(
      "No MockBTCB/Token in deployed-addresses.json. Deploy with mocks (default on testnet).",
    );
  }

  const token = await ethers.getContractAt("MockBTCB", tokenAddress);
  const decimals = Number(await token.decimals());
  const amount = ethers.parseUnits(amountHuman, decimals);

  console.log("=======================================");
  console.log("Fund BSC Testnet wallet (MockBTCB)");
  console.log("=======================================");
  console.log("Deployer:", deployer.address);
  console.log("Token:   ", tokenAddress);
  console.log("To:      ", ethers.getAddress(to));
  console.log("Amount:  ", amountHuman);

  const method = await fundAddressWithMockBTCB(
    token,
    deployer,
    ethers.getAddress(to),
    amount,
  );
  const bal = await token.balanceOf(ethers.getAddress(to));
  console.log(`Funded via ${method}. New balance:`, ethers.formatUnits(bal, decimals));
  console.log("Explorer:", `https://testnet.bscscan.com/token/${tokenAddress}?a=${to}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
