/**
 * Claim Self ROI for one wallet on BSC Testnet (or print why pending is 0).
 *
 * Self ROI accrues only after full day(s) since lastClaimAt / package activate.
 * Testnet cannot time-travel — if pending is 0, wait ~24h then re-run.
 *
 *   $env:CLAIM_USER="0x..."
 *   $env:CLAIM_PK="0x..."   # omit if CLAIM_USER == deployer
 *   npm run qa:claim-roi:bsc-testnet
 */
import "dotenv/config";
import hre from "hardhat";
import fs from "fs";
import path from "path";
import { Wallet } from "ethers";

async function main() {
  const connection = await hre.network.connect();
  const { ethers } = connection;
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  const userRaw = (process.env.CLAIM_USER || process.env.UNLOCK_USER || "").trim();
  if (!userRaw || !ethers.isAddress(userRaw)) {
    throw new Error("Set CLAIM_USER=0x... (wallet with an active package)");
  }
  const userAddr = ethers.getAddress(userRaw);

  const pk = (process.env.CLAIM_PK || process.env.UNLOCK_PK || "").trim();
  let userSigner: Wallet | typeof deployer;
  if (pk) {
    const normalized = pk.startsWith("0x") ? pk : `0x${pk}`;
    userSigner = new Wallet(normalized, ethers.provider);
    if (userSigner.address.toLowerCase() !== userAddr.toLowerCase()) {
      throw new Error(`CLAIM_PK address ${userSigner.address} != CLAIM_USER ${userAddr}`);
    }
  } else if (deployer.address.toLowerCase() === userAddr.toLowerCase()) {
    userSigner = deployer;
  } else {
    throw new Error(
      `CLAIM_USER ${userAddr} is not deployer. Set CLAIM_PK to that wallet's private key.`,
    );
  }

  const addressesPath = path.resolve("deployed-addresses.json");
  if (!fs.existsSync(addressesPath)) {
    throw new Error("deployed-addresses.json missing");
  }
  const json = JSON.parse(fs.readFileSync(addressesPath, "utf8")) as Record<
    string,
    string | number
  >;
  const bookChain = Number(json.chainId || 0);
  if (bookChain && bookChain !== chainId) {
    throw new Error(
      `Address book chainId=${bookChain} but RPC=${chainId}. Sync testnet addresses first.`,
    );
  }

  const roiAddr = String(json.InterdependentReward || "");
  const coreAddr = String(json.BTCPlanCore || "");
  if (!ethers.isAddress(roiAddr) || !ethers.isAddress(coreAddr)) {
    throw new Error("InterdependentReward / BTCPlanCore missing from deployed-addresses.json");
  }

  const roi = await ethers.getContractAt("InterdependentReward", roiAddr);
  const core = await ethers.getContractAt("BTCPlanCore", coreAddr);

  const userRow = await core.users(userAddr);
  const pkg = Number(userRow.packageAmount ?? userRow[2] ?? 0);
  const active = Boolean(userRow.isActive ?? userRow[6]);

  const pending: bigint = await roi.getPendingRoi(userAddr);
  const account = await roi.roiAccounts(userAddr);
  const lastClaimAt = Number(account.lastClaimAt ?? account[2] ?? 0);
  const now = Math.floor(Date.now() / 1000);
  const daysPassed = lastClaimAt > 0 ? Math.floor((now - lastClaimAt) / 86400) : 0;
  const secondsToNext =
    lastClaimAt > 0 ? Math.max(0, 86400 - ((now - lastClaimAt) % 86400)) : 0;

  console.log("=======================================");
  console.log("Claim Self ROI (QA)");
  console.log("=======================================");
  console.log("Network:     ", chainId);
  console.log("User:        ", userAddr);
  console.log("Registered:  ", active);
  console.log("Package:     ", pkg > 0 ? `$${pkg}` : "none");
  console.log("ROI active:  ", Boolean(account.isActive ?? account[0]));
  console.log("lastClaimAt: ", lastClaimAt ? new Date(lastClaimAt * 1000).toISOString() : "—");
  console.log("Days passed: ", daysPassed);
  console.log("Pending ROI: ", ethers.formatEther(pending), "BTCB");

  if (pkg <= 0) {
    throw new Error("User has no active package — activate $50+ first");
  }

  if (pending === 0n) {
    const hrs = Math.ceil(secondsToNext / 3600);
    console.log("\nNo claimable Self ROI yet.");
    console.log(
      `On BSC Testnet you must wait ~1 full day after activation/last claim.`,
    );
    if (secondsToNext > 0 && daysPassed < 1) {
      console.log(`Approx time until first day completes: ~${hrs} hour(s).`);
    }
    console.log("\nThen re-run this script, sync Laravel, open ROI History:");
    console.log("  php artisan blockchain:sync-income");
    console.log("  Sidebar → Earnings → ROI History");
    console.log("\nNOTE: My Referral only lists directs — it does NOT show ROI rows.");
    return;
  }

  console.log("\n→ claimRoi()…");
  const roiAsUser = roi.connect(userSigner);
  const tx = await roiAsUser.claimRoi();
  const receipt = await tx.wait();
  console.log("Tx:", receipt?.hash || tx.hash);
  console.log("Explorer:", `https://testnet.bscscan.com/tx/${receipt?.hash || tx.hash}`);

  const pendingAfter: bigint = await roi.getPendingRoi(userAddr);
  console.log("Pending after:", ethers.formatEther(pendingAfter), "BTCB");

  console.log("\nNext — mirror into Laravel + check UI:");
  console.log("  cd ..\\application");
  console.log("  php artisan blockchain:sync-income");
  console.log("  Open: Earnings → ROI History (NOT My Referral)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
