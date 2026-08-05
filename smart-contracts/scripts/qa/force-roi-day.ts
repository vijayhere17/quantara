/**
 * Force one day of Self ROI accrual + claim (client QA "right now").
 *
 * Requires InterdependentReward.qaBackdateLastClaim (redeploy if missing).
 *
 *   $env:CLAIM_USER="0xActivePackageWallet"
 *   $env:CLAIM_PK="0x..."   # omit if deployer
 *   npm run qa:force-roi:bsc-testnet
 *
 * Then:
 *   cd ..\application
 *   php artisan blockchain:sync-income
 *   Open Earnings → ROI History
 */
import "dotenv/config";
import hre from "hardhat";
import fs from "fs";
import path from "path";
import { Wallet } from "ethers";

const ONE_DAY = 86400;

async function main() {
  const connection = await hre.network.connect();
  const { ethers } = connection;
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  const userRaw = (process.env.CLAIM_USER || process.env.UNLOCK_USER || "").trim();
  if (!userRaw || !ethers.isAddress(userRaw)) {
    throw new Error("Set CLAIM_USER=0x... (wallet with active package / ROI)");
  }
  const userAddr = ethers.getAddress(userRaw);

  const pk = (process.env.CLAIM_PK || process.env.UNLOCK_PK || "").trim();
  let userSigner: Wallet | typeof deployer;
  if (pk) {
    const normalized = pk.startsWith("0x") ? pk : `0x${pk}`;
    userSigner = new Wallet(normalized, ethers.provider);
    if (userSigner.address.toLowerCase() !== userAddr.toLowerCase()) {
      throw new Error(`CLAIM_PK ${userSigner.address} != CLAIM_USER ${userAddr}`);
    }
  } else if (deployer.address.toLowerCase() === userAddr.toLowerCase()) {
    userSigner = deployer;
  } else {
    throw new Error(
      `CLAIM_USER is not deployer — set CLAIM_PK for ${userAddr}`,
    );
  }

  const addressesPath = path.resolve("deployed-addresses.json");
  if (!fs.existsSync(addressesPath)) {
    throw new Error("deployed-addresses.json missing — deploy first");
  }
  const json = JSON.parse(fs.readFileSync(addressesPath, "utf8")) as Record<
    string,
    string | number
  >;
  const bookChain = Number(json.chainId || 0);
  if (bookChain && bookChain !== chainId) {
    throw new Error(
      `Address book chainId=${bookChain} vs RPC ${chainId}. Use testnet addresses.`,
    );
  }

  const roiAddr = String(json.InterdependentReward || "");
  const coreAddr = String(json.BTCPlanCore || "");
  if (!ethers.isAddress(roiAddr) || !ethers.isAddress(coreAddr)) {
    throw new Error("InterdependentReward / BTCPlanCore missing");
  }

  const roi = await ethers.getContractAt("InterdependentReward", roiAddr);
  const core = await ethers.getContractAt("BTCPlanCore", coreAddr);
  const owner = await roi.owner();
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(
      `Deployer ${deployer.address} is not InterdependentReward.owner (${owner})`,
    );
  }

  const userRow = await core.users(userAddr);
  // ethers Result: prefer named fields, fall back to tuple indices
  const pkg = Number(
    userRow.packageAmount ?? userRow[2] ?? 0,
  );
  const cycle = Number(userRow.packageCycle ?? userRow[4] ?? 0);
  const active = Boolean(userRow.isActive ?? userRow[6]);
  const completed = Boolean(userRow.packageCompleted ?? userRow[7]);

  console.log("=======================================");
  console.log("Force Self ROI day + claim (QA)");
  console.log("=======================================");
  console.log("Network: ", chainId);
  console.log("Core:    ", coreAddr);
  console.log("ROI:     ", roiAddr);
  console.log("User:    ", userAddr);
  console.log("On-chain isActive:", active);
  console.log("On-chain package: ", pkg > 0 ? `$${pkg} cycle ${cycle}` : "NONE ($0)");
  console.log("On-chain completed:", completed);

  if (pkg <= 0) {
    throw new Error(
      `${userAddr} has no active package ON THIS Core (${coreAddr}).\n` +
        `The website can still show a package from Laravel DB or an older deploy.\n` +
        `Fix:\n` +
        `  1) type deployed-addresses.json  → confirm BTCPlanCore is the deploy you used\n` +
        `  2) If you redeployed for qaBackdateLastClaim, buy/activate again:\n` +
        `       $env:UNLOCK_USER="${userAddr}"\n` +
        `       npm run qa:unlock-packages:bsc-testnet\n` +
        `  3) Re-run npm run qa:force-roi:bsc-testnet`,
    );
  }

  console.log("Package: ", `$${pkg}`);

  // Detect missing QA hook (old deployment)
  try {
    await roi.qaBackdateLastClaim.staticCall(userAddr, ONE_DAY);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("function selector was not recognized") ||
      msg.includes("no matching fragment") ||
      msg.includes("is not a function") ||
      msg.toLowerCase().includes("qabackdatelastclaim")
    ) {
      throw new Error(
        "This InterdependentReward build has no qaBackdateLastClaim.\n" +
          "Redeploy once so the client can test ROI immediately:\n" +
          "  npm run deploy:bsc-testnet\n" +
          "  npm run sync:laravel:bsc-testnet\n" +
          "  copy deployed-addresses.json → example / fund + re-register a $50 user\n" +
          "  then re-run npm run qa:force-roi:bsc-testnet",
      );
    }
    // staticCall may revert for business reasons (ROI not active) — continue to send tx
  }

  console.log("\n→ qaBackdateLastClaim(+1 day)…");
  const backTx = await roi.qaBackdateLastClaim(userAddr, ONE_DAY);
  await backTx.wait();
  console.log("  tx:", backTx.hash);

  const pending: bigint = await roi.getPendingRoi(userAddr);
  console.log("Pending after backdate:", ethers.formatEther(pending), "BTCB");
  if (pending === 0n) {
    throw new Error(
      "Pending still 0 after backdate — check ROI pool balance / user ROI active / principal",
    );
  }

  console.log("→ claimRoi()…");
  const claimTx = await roi.connect(userSigner).claimRoi();
  const receipt = await claimTx.wait();
  console.log("  tx:", receipt?.hash || claimTx.hash);
  console.log(
    "Explorer:",
    `https://testnet.bscscan.com/tx/${receipt?.hash || claimTx.hash}`,
  );

  console.log("\nMirror into Laravel UI:");
  console.log("  cd ..\\application");
  console.log("  php artisan blockchain:sync-income");
  console.log("  Open: Earnings → ROI History  (login as CLAIM_USER)");
  console.log("  My Referral does NOT list ROI rows.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
