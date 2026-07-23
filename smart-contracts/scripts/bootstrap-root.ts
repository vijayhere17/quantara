import hre from "hardhat";
import fs from "fs";
import path from "path";
import {
  DEMO_BTCB_AMOUNT,
  DEMO_ACCOUNT_INDEXES,
  fundDemoAccounts,
  printAccountBalances,
} from "./lib/fundDemoAccounts";

/**
 * Bootstrap the genesis/root on-chain user for an already-deployed BTCPlanCore,
 * then fund Hardhat demo accounts #1–#3 with MockBTCB.
 *
 *   npm run bootstrap:root
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  const addressesPath = path.resolve("deployed-addresses.json");
  let coreAddress = (process.env.CORE_CONTRACT || "").trim();
  let tokenAddress = (process.env.TOKEN_CONTRACT || "").trim();

  let json: Record<string, string> = {};
  if (fs.existsSync(addressesPath)) {
    json = JSON.parse(fs.readFileSync(addressesPath, "utf8")) as Record<string, string>;
    if (!coreAddress) coreAddress = json.BTCPlanCore || "";
    if (!tokenAddress) tokenAddress = json.MockBTCB || "";
  }

  if (!coreAddress || !ethers.isAddress(coreAddress)) {
    throw new Error(
      "CORE_CONTRACT is missing. Set CORE_CONTRACT or ensure deployed-addresses.json exists.",
    );
  }

  const core = await ethers.getContractAt("BTCPlanCore", coreAddress);
  const owner = await core.owner();

  console.log("=======================================");
  console.log("Quantara Root Bootstrap");
  console.log("=======================================");
  console.log("Network signer:", deployer.address);
  console.log("Core contract:", coreAddress);
  console.log("Core owner:   ", owner);

  if (deployer.address.toLowerCase() !== owner.toLowerCase()) {
    console.warn(
      "WARNING: signer is not core.owner(). register() uses msg.sender — " +
        "the wallet that calls this becomes the root user.",
    );
  }

  const before = await core.users(deployer.address);
  if (before.isActive) {
    console.log("Root already active on-chain.");
    console.log("  wallet :", before.wallet);
    console.log("  sponsor:", before.sponsor);
    console.log("  package:", before.packageAmount.toString());
  } else {
    console.log("Calling register(address(0)) as genesis/root...");
    const tx = await core.register(ethers.ZeroAddress);
    const receipt = await tx.wait();
    console.log("Tx hash:", receipt?.hash || tx.hash);

    const after = await core.users(deployer.address);
    if (!after.isActive) {
      throw new Error("Bootstrap failed — users[signer].isActive is still false");
    }
  }

  json.RootUser = deployer.address;
  json.BTCPlanCore = coreAddress;
  if (tokenAddress) json.MockBTCB = tokenAddress;
  fs.writeFileSync(addressesPath, JSON.stringify(json, null, 2));

  console.log("=======================================");
  console.log("Root bootstrap complete");
  console.log("=======================================");
  console.log("Root wallet (Laravel sponsor):", deployer.address);

  // ---------- Demo faucet for Hardhat accounts #1–#3 ----------
  if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
    console.warn(
      "TOKEN_CONTRACT / MockBTCB missing — skip demo funding. Set TOKEN_CONTRACT or run bootstrap:demo.",
    );
    return;
  }

  const token = await ethers.getContractAt("MockBTCB", tokenAddress);
  console.log(
    `\n→ Funding Hardhat accounts #1–#3 with ${DEMO_BTCB_AMOUNT} MockBTCB...`,
  );
  const funded = await fundDemoAccounts({
    ethers,
    token,
    deployer,
    signers,
  });
  for (const row of funded) {
    console.log(
      `  Account #${row.index} ${row.address} ← ${row.method} (balance ${row.balance} BTCB)`,
    );
  }

  console.log("\nBalances:");
  await printAccountBalances({
    ethers,
    token,
    signers,
    indexes: [0, ...DEMO_ACCOUNT_INDEXES],
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
