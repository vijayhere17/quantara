import hre from "hardhat";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import {
  DEMO_BTCB_AMOUNT,
  DEMO_ACCOUNT_INDEXES,
  fundDemoAccounts,
  printAccountBalances,
} from "./lib/fundDemoAccounts";

type DeployedAddresses = {
  MockBTCB?: string;
  BTCPlanCore?: string;
  RootUser?: string;
  [key: string]: string | undefined;
};

function loadAddresses(): DeployedAddresses {
  const addressesPath = path.resolve("deployed-addresses.json");
  if (!fs.existsSync(addressesPath)) return {};
  return JSON.parse(fs.readFileSync(addressesPath, "utf8")) as DeployedAddresses;
}

function saveAddresses(addresses: DeployedAddresses) {
  fs.writeFileSync(
    path.resolve("deployed-addresses.json"),
    JSON.stringify(addresses, null, 2),
  );
}

/**
 * Full local demo bootstrap:
 * Deploy (if needed) → register root → mint/transfer 1000 MockBTCB to accounts #1–#3 → print balances
 *
 *   npm run bootstrap:demo
 *   FORCE_DEPLOY=1 npm run bootstrap:demo
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  console.log("=======================================");
  console.log("Quantara Demo Bootstrap");
  console.log("=======================================");
  console.log("Deployer / Account #0:", deployer.address);

  let addresses = loadAddresses();
  const forceDeploy = process.env.FORCE_DEPLOY === "1";
  const envCore = (process.env.CORE_CONTRACT || "").trim();
  const envToken = (process.env.TOKEN_CONTRACT || "").trim();

  if (envCore) addresses.BTCPlanCore = envCore;
  if (envToken) addresses.MockBTCB = envToken;

  const needsDeploy =
    forceDeploy ||
    !addresses.BTCPlanCore ||
    !addresses.MockBTCB ||
    !ethers.isAddress(addresses.BTCPlanCore) ||
    !ethers.isAddress(addresses.MockBTCB);

  if (needsDeploy) {
    console.log("\n→ Deploying + wiring + root (scripts/deploy.ts)...");
    execSync("npx hardhat run scripts/deploy.ts --network localhost", {
      stdio: "inherit",
      env: process.env,
      cwd: process.cwd(),
    });
    addresses = loadAddresses();
  } else {
    console.log("\n→ Using existing deployment");
    console.log("  Core :", addresses.BTCPlanCore);
    console.log("  Token:", addresses.MockBTCB);
  }

  if (!addresses.BTCPlanCore || !addresses.MockBTCB) {
    throw new Error("Missing BTCPlanCore / MockBTCB after deploy");
  }

  const core = await ethers.getContractAt("BTCPlanCore", addresses.BTCPlanCore);
  const token = await ethers.getContractAt("MockBTCB", addresses.MockBTCB);

  console.log("\n→ Bootstrapping root sponsor...");
  const rootBefore = await core.users(deployer.address);
  if (!rootBefore.isActive) {
    const tx = await core.register(ethers.ZeroAddress);
    await tx.wait();
    console.log("  Root registered:", deployer.address);
  } else {
    console.log("  Root already active:", deployer.address);
  }

  const rootAfter = await core.users(deployer.address);
  if (!rootAfter.isActive) {
    throw new Error("Root bootstrap failed");
  }
  addresses.RootUser = deployer.address;
  saveAddresses(addresses);

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

  console.log("\n=======================================");
  console.log("Balances");
  console.log("=======================================");
  await printAccountBalances({
    ethers,
    token,
    signers,
    indexes: [0, ...DEMO_ACCOUNT_INDEXES],
  });

  console.log("\nDemo ready.");
  console.log("Import Hardhat Account #1/#2/#3 into MetaMask and register under root:");
  console.log(" ", deployer.address);
  console.log('UI faucet (local only): "Get Demo BTCB" on the signup payment step.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
