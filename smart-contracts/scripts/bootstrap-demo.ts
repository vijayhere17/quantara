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
import {
  loadDeployedAddresses,
  saveDeployedAddresses,
  hasContractCode,
  assertBtcPlanCore,
  syncLaravelEnvFromAddresses,
} from "./lib/deploymentHealth";

/**
 * Full local demo bootstrap:
 * Deploy (if needed / stale) → register root → mint/transfer MockBTCB → print balances
 *
 *   npm run bootstrap:demo
 *   FORCE_DEPLOY=1 npm run bootstrap:demo
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const provider = ethers.provider;

  console.log("=======================================");
  console.log("Quantara Demo Bootstrap");
  console.log("=======================================");
  console.log("Deployer / Account #0:", deployer.address);

  const network = await provider.getNetwork();
  console.log("Chain ID:", Number(network.chainId));

  let addresses = loadDeployedAddresses();
  const forceDeploy = process.env.FORCE_DEPLOY === "1";
  const envCore = (process.env.CORE_CONTRACT || "").trim();
  const envToken = (process.env.TOKEN_CONTRACT || process.env.TOKEN_ADDRESS || "").trim();

  if (envCore) {
    console.log("  CORE_CONTRACT env override:", envCore);
    addresses.BTCPlanCore = envCore;
  }
  if (envToken) {
    console.log("  TOKEN_CONTRACT env override:", envToken);
    addresses.MockBTCB = envToken;
    addresses.Token = envToken;
  }

  const coreCandidate = addresses.BTCPlanCore;
  const tokenCandidate = addresses.MockBTCB || addresses.Token;

  let coreHealthy = false;
  if (
    !forceDeploy &&
    coreCandidate &&
    tokenCandidate &&
    ethers.isAddress(coreCandidate) &&
    ethers.isAddress(tokenCandidate)
  ) {
    const coreCode = await hasContractCode(provider, coreCandidate);
    const tokenCode = await hasContractCode(provider, tokenCandidate);
    if (!coreCode) {
      console.warn(
        `\n⚠  BTCPlanCore address has NO bytecode: ${coreCandidate}`,
      );
      console.warn("   (Hardhat node was likely restarted — redeploying)");
    } else if (!tokenCode) {
      console.warn(`\n⚠  Token address has NO bytecode: ${tokenCandidate}`);
      console.warn("   Redeploying…");
    } else {
      try {
        await assertBtcPlanCore(ethers, coreCandidate, deployer.address);
        coreHealthy = true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`\n⚠  BTCPlanCore health check failed at ${coreCandidate}`);
        console.warn(`   ${msg}`);
        console.warn(
          "   This usually means CORE_CONTRACT points at the wrong contract (e.g. IncomeManager).",
        );
        console.warn("   Redeploying / ignoring bad override…");
        // Drop bad env override so deploy writes fresh addresses
        delete addresses.BTCPlanCore;
      }
    }
  }

  const needsDeploy =
    forceDeploy ||
    !coreHealthy ||
    !addresses.BTCPlanCore ||
    !(addresses.MockBTCB || addresses.Token) ||
    !ethers.isAddress(addresses.BTCPlanCore || "") ||
    !ethers.isAddress((addresses.MockBTCB || addresses.Token) as string);

  if (needsDeploy) {
    console.log("\n→ Deploying + wiring + root (scripts/deploy.ts)...");
    execSync("npx hardhat run scripts/deploy.ts --network localhost", {
      stdio: "inherit",
      env: {
        ...process.env,
        // Prevent stale CORE_CONTRACT from poisoning deploy-time probes
        CORE_CONTRACT: "",
        TOKEN_CONTRACT: "",
        TOKEN_ADDRESS: "",
      },
      cwd: process.cwd(),
    });
    addresses = loadDeployedAddresses();
  } else {
    console.log("\n→ Using existing healthy deployment");
    console.log("  Core :", addresses.BTCPlanCore);
    console.log("  Token:", addresses.MockBTCB || addresses.Token);
  }

  if (!addresses.BTCPlanCore || !(addresses.MockBTCB || addresses.Token)) {
    throw new Error("Missing BTCPlanCore / MockBTCB after deploy");
  }

  const tokenAddress = (addresses.MockBTCB || addresses.Token) as string;
  const core = await ethers.getContractAt(
    "BTCPlanCore",
    addresses.BTCPlanCore,
  );
  const token = await ethers.getContractAt("MockBTCB", tokenAddress);

  // Final ABI / bytecode proof before funding
  await assertBtcPlanCore(ethers, addresses.BTCPlanCore, deployer.address);

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
  saveDeployedAddresses(addresses);

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

  // Keep Laravel / frontend in sync with the live chain
  const laravelEnv = path.resolve(process.cwd(), "../application/.env");
  if (fs.existsSync(laravelEnv)) {
    syncLaravelEnvFromAddresses(addresses, laravelEnv);
    console.log("\n→ Synced Laravel application/.env contract addresses");
  } else {
    console.warn("\n⚠  application/.env not found — skip Laravel sync");
  }

  console.log("\nDemo ready.");
  console.log("Import Hardhat Account #1/#2/#3 into MetaMask and register under root:");
  console.log(" ", deployer.address);
  console.log('UI faucet (local only): "Get Demo BTCB" on the signup payment step.');
  console.log("\nLaravel must use:");
  console.log(`  CORE_CONTRACT=${addresses.BTCPlanCore}`);
  console.log(`  TOKEN_CONTRACT=${tokenAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
