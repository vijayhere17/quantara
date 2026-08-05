/**
 * QA helper — force-complete open packages and climb the ladder for one wallet.
 *
 * Why: activatePackage requires packageCompleted (ROI 3X or Working 4X).
 * Member UI cannot skip that. This script temporarily authorizes the deployer
 * on IncomeManager, credits enough ROI to hit the 3X unlock, then activates
 * the next package until $10000 (or TARGET_USD).
 *
 * BSC Testnet:
 *   set UNLOCK_USER=0xFirstMemberWallet
 *   set UNLOCK_PK=0xPrivateKeyOfThatWallet   (omit if UNLOCK_USER == deployer)
 *   npm run qa:unlock-packages:bsc-testnet
 *
 * Optional:
 *   TARGET_USD=10000   (stop after reaching this package amount; default 10000)
 *   MAX_STEPS=40       (safety cap)
 */
import "dotenv/config";
import hre from "hardhat";
import fs from "fs";
import path from "path";
import { Wallet } from "ethers";
import { fundAddressWithMockBTCB } from "../lib/fundDemoAccounts";

const PACKAGE_LADDER = [50, 100, 300, 500, 1000, 3000, 5000, 10000] as const;

async function main() {
  const connection = await hre.network.connect();
  const { ethers } = connection;
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  const unlockUserRaw = (process.env.UNLOCK_USER || process.env.QA_WALLET || "").trim();
  if (!unlockUserRaw || !ethers.isAddress(unlockUserRaw)) {
    throw new Error(
      "Set UNLOCK_USER=0x... (first member / company wallet to unlock packages for)",
    );
  }
  const unlockUser = ethers.getAddress(unlockUserRaw);

  const unlockPk = (process.env.UNLOCK_PK || "").trim();
  let userSigner: Wallet | typeof deployer;
  if (unlockPk) {
    const normalized = unlockPk.startsWith("0x") ? unlockPk : `0x${unlockPk}`;
    userSigner = new Wallet(normalized, ethers.provider);
    if (userSigner.address.toLowerCase() !== unlockUser.toLowerCase()) {
      throw new Error(
        `UNLOCK_PK address ${userSigner.address} != UNLOCK_USER ${unlockUser}`,
      );
    }
  } else if (deployer.address.toLowerCase() === unlockUser.toLowerCase()) {
    userSigner = deployer;
  } else {
    throw new Error(
      `UNLOCK_USER ${unlockUser} is not the deployer (${deployer.address}). ` +
        `Set UNLOCK_PK to that wallet's private key so activatePackage can be signed.`,
    );
  }

  const targetUsd = Number(process.env.TARGET_USD || "10000");
  const maxSteps = Number(process.env.MAX_STEPS || "40");

  const addressesPath = path.resolve("deployed-addresses.json");
  if (!fs.existsSync(addressesPath)) {
    throw new Error("deployed-addresses.json missing — deploy / sync first");
  }
  const json = JSON.parse(fs.readFileSync(addressesPath, "utf8")) as Record<
    string,
    string | number
  >;
  const bookChain = Number(json.chainId || 0);
  if (bookChain && bookChain !== chainId) {
    throw new Error(
      `Address book chainId=${bookChain} but RPC chainId=${chainId}. ` +
        `Copy deployed-addresses.testnet.example.json → deployed-addresses.json (or redeploy), then retry.`,
    );
  }

  const coreAddr = String(json.BTCPlanCore || "");
  const incomeAddr = String(json.IncomeManager || "");
  const tokenAddr = String(json.MockBTCB || json.Token || "");
  if (!ethers.isAddress(coreAddr) || !ethers.isAddress(incomeAddr) || !ethers.isAddress(tokenAddr)) {
    throw new Error("BTCPlanCore / IncomeManager / MockBTCB missing from deployed-addresses.json");
  }

  const core = await ethers.getContractAt("BTCPlanCore", coreAddr);
  const income = await ethers.getContractAt("IncomeManager", incomeAddr);
  const token = await ethers.getContractAt("MockBTCB", tokenAddr);

  const incomeOwner = await income.owner();
  if (incomeOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(
      `Deployer ${deployer.address} is not IncomeManager.owner (${incomeOwner}). ` +
        `Use the same PRIVATE_KEY that deployed the contracts.`,
    );
  }

  console.log("=======================================");
  console.log("Unlock all packages (QA)");
  console.log("=======================================");
  console.log("Network:     ", `${chainId}`);
  console.log("Deployer:    ", deployer.address);
  console.log("Unlock user: ", unlockUser);
  console.log("Target USD:  ", targetUsd);
  console.log("Core:        ", coreAddr);

  const registered = await core.isRegistered(unlockUser);
  if (!registered) {
    throw new Error(`${unlockUser} is not registered on-chain`);
  }

  // Temporarily authorize deployer so we can credit ROI → hit 3X unlock.
  const alreadyAuth = await income.authorizedContracts(deployer.address);
  if (!alreadyAuth) {
    console.log("→ Authorizing deployer on IncomeManager…");
    await (await income.setAuthorizedContract(deployer.address, true)).wait();
  }

  let authorizedByUs = !alreadyAuth;

  try {
    for (let step = 1; step <= maxSteps; step++) {
      const userRow = await core.users(unlockUser);
      const pkgAmount = Number(userRow.packageAmount ?? userRow[2] ?? 0);
      const cycle = Number(userRow.packageCycle ?? userRow[4] ?? 0);
      const completed = Boolean(userRow.packageCompleted ?? userRow[7]);

      console.log(`\n[${step}] Current: $${pkgAmount} cycle ${cycle} completed=${completed}`);

      if (pkgAmount >= targetUsd && cycle >= 2 && pkgAmount === 10000) {
        console.log("Already at $10000 unlimited tier — done.");
        break;
      }
      if (pkgAmount >= targetUsd && completed && pkgAmount === targetUsd && targetUsd < 10000) {
        // If they only wanted e.g. TARGET_USD=500 completed, stop after that package is done
        // and next would be higher — still activate until packageAmount >= target and completed
      }

      // Force-complete open package (ROI 3X accounting → packageCompleted)
      if (pkgAmount > 0 && !completed) {
        const principal: bigint = await income.principal(unlockUser);
        if (principal === 0n) {
          throw new Error("Open package but IncomeManager.principal is 0 — inconsistent state");
        }
        const need = principal * 3n;
        console.log(`→ Force-complete via recordIncome(ROI, 3× principal)…`);
        const tx = await income.recordIncome(unlockUser, need, 0); // IncomeType.ROI = 0
        await tx.wait();
        const after = await core.users(unlockUser);
        const nowDone = Boolean(after.packageCompleted ?? after[7]);
        if (!nowDone) {
          throw new Error("Force-complete failed — packageCompleted still false");
        }
        console.log("  packageCompleted = true");
      }

      let nextPkg: bigint;
      let nextCycle: number;
      try {
        const next = await core.getNextEligiblePackage(unlockUser);
        nextPkg = BigInt(next[0]);
        nextCycle = Number(next[1]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`getNextEligiblePackage failed: ${msg}`);
      }

      console.log(`→ Next eligible: $${nextPkg} cycle ${nextCycle}`);

      // Stop once we've activated up through target (and for <10000, after both cycles if target matches)
      if (Number(nextPkg) > targetUsd) {
        console.log(`Next package $${nextPkg} exceeds TARGET_USD=${targetUsd} — stopping.`);
        break;
      }

      // Fund + approve + activate
      const tokenAmount: bigint = await core.getPackageBTCBAmount(nextPkg);
      const bal: bigint = await token.balanceOf(unlockUser);
      if (bal < tokenAmount) {
        const mintAmt = tokenAmount * 2n;
        console.log(`→ Funding MockBTCB (${ethers.formatEther(mintAmt)})…`);
        await fundAddressWithMockBTCB(token, deployer, unlockUser, mintAmt);
      }

      const coreAsUser = core.connect(userSigner);
      const tokenAsUser = token.connect(userSigner);
      const allowance: bigint = await token.allowance(unlockUser, coreAddr);
      if (allowance < tokenAmount) {
        console.log("→ Approving BTCPlanCore…");
        await (await tokenAsUser.approve(coreAddr, tokenAmount * 10n)).wait();
      }

      console.log(`→ activatePackage(${nextPkg})…`);
      await (await coreAsUser.activatePackage(nextPkg)).wait();

      const updated = await core.users(unlockUser);
      const newAmt = Number(updated.packageAmount ?? updated[2] ?? 0);
      const newCycle = Number(updated.packageCycle ?? updated[4] ?? 0);
      console.log(`  Activated: $${newAmt} cycle ${newCycle}`);

      if (newAmt >= targetUsd && newAmt === 10000 && newCycle >= 2) {
        console.log("Reached $10000 — done.");
        break;
      }
      if (newAmt >= targetUsd && targetUsd < 10000 && !PACKAGE_LADDER.includes(newAmt as (typeof PACKAGE_LADDER)[number])) {
        break;
      }
    }
  } finally {
    if (authorizedByUs) {
      console.log("\n→ Revoking deployer IncomeManager authorization…");
      try {
        await (await income.setAuthorizedContract(deployer.address, false)).wait();
      } catch (e) {
        console.warn("  Failed to revoke auth — revoke manually:", e);
      }
    }
  }

  const finalRow = await core.users(unlockUser);
  console.log("\n=======================================");
  console.log("Final state");
  console.log("=======================================");
  console.log("User:            ", unlockUser);
  console.log("Package:         ", `$${Number(finalRow.packageAmount ?? finalRow[2] ?? 0)}`);
  console.log("Cycle:           ", Number(finalRow.packageCycle ?? finalRow[4] ?? 0));
  console.log("Completed:       ", Boolean(finalRow.packageCompleted ?? finalRow[7]));
  console.log("Explorer user:   ", `https://testnet.bscscan.com/address/${unlockUser}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
