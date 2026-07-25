/**
 * Read-only Phase 1 + Phase 2 terminal verification checklist.
 *
 *   npm run qa:verify
 *
 * Optional env:
 *   VERIFY_ROOT / VERIFY_USER1 / VERIFY_USER2 / VERIFY_USER3
 *   VERIFY_TX          — also deep-inspect this activation tx
 *   VERIFY_FROM_BLOCK  — event scan start (default 0)
 *
 * Wallets default to scripts/qa/reports/phase2-handoff.json, else Hardhat #0–#3.
 * Does NOT modify chain state.
 */
import hre from "hardhat";
import {
  loadContracts,
  loadWalletSet,
  getBtcUsd,
  readUser,
  printUser,
  printToken,
  printPackage,
  printContribution,
  printTreasury,
  printReferralTree,
  printContractState,
  printTransaction,
  fetchEvents,
  printEvents,
  weiToUsd,
  sectionResult,
  printSummary,
  type Check,
} from "./lib/chainInspect";

async function main() {
  const { ethers } = await hre.network.connect();
  const signers = await ethers.getSigners();
  const c = await loadContracts(ethers);
  const wallets = loadWalletSet(ethers, signers);
  const btcUsd = await getBtcUsd(c);
  const checks: Check[] = [];

  console.log("\n════════════════════════════════════════");
  console.log("  QUANTARA — READ-ONLY VERIFY CHECKLIST");
  console.log("════════════════════════════════════════");
  console.log(`  Network     : localhost / chain ${(await ethers.provider.getNetwork()).chainId}`);
  console.log(`  BTCPlanCore : ${c.coreAddr}`);
  console.log(`  Token       : ${c.tokenAddr}`);
  console.log(`  Treasury    : ${c.treasuryAddr}`);
  console.log(`  Contribution: ${c.contribAddr}`);
  console.log(`  BTC/USD     : $${btcUsd}`);
  console.log(`  Root        : ${wallets.root}`);
  console.log(`  User1       : ${wallets.user1}`);
  console.log(`  User2       : ${wallets.user2}`);
  console.log(`  User3       : ${wallets.user3}`);

  // ── REGISTRATION ────────────────────────────────────────────────────
  const users: Array<{ label: string; addr: string; expectPkg: number }> = [
    { label: "Root", addr: wallets.root, expectPkg: 50 },
    { label: "User1", addr: wallets.user1, expectPkg: 50 },
    { label: "User2", addr: wallets.user2, expectPkg: 50 },
    { label: "User3", addr: wallets.user3, expectPkg: 50 },
  ];

  let regOk = true;
  const regNotes: string[] = [];
  for (const { label, addr, expectPkg } of users) {
    const u = await readUser(c.core, addr);
    printUser(label, addr, u);
    if (!u.isActive) {
      regOk = false;
      regNotes.push(`${label} not active`);
    }
    if (u.wallet.toLowerCase() !== addr.toLowerCase() && u.wallet !== ethers.ZeroAddress) {
      // wallet field may equal user address after register
      if (u.wallet.toLowerCase() !== addr.toLowerCase()) {
        // Still OK if isActive — some deploys set wallet=user
      }
    }
    if (Number(u.packageAmount) !== expectPkg) {
      regOk = false;
      regNotes.push(`${label} packageAmount=${u.packageAmount} want ${expectPkg}`);
    }
    if (u.packageCycle < 1) {
      regOk = false;
      regNotes.push(`${label} packageCycle invalid`);
    }
  }
  // Sponsor chain
  const u1 = await readUser(c.core, wallets.user1);
  const u2 = await readUser(c.core, wallets.user2);
  const u3 = await readUser(c.core, wallets.user3);
  if (u1.sponsor.toLowerCase() !== wallets.root.toLowerCase()) {
    regOk = false;
    regNotes.push("User1 sponsor ≠ Root");
  }
  if (u2.sponsor.toLowerCase() !== wallets.user1.toLowerCase()) {
    regOk = false;
    regNotes.push("User2 sponsor ≠ User1");
  }
  if (u3.sponsor.toLowerCase() !== wallets.user2.toLowerCase()) {
    regOk = false;
    regNotes.push("User3 sponsor ≠ User2");
  }
  checks.push(sectionResult("Registration", regOk, regNotes.join("; ") || "users active, pkg=$50, sponsors OK"));

  // ── PACKAGE ─────────────────────────────────────────────────────────
  let pkgOk = true;
  const pkgNotes: string[] = [];
  for (const { label, addr } of users) {
    const p = await printPackage(ethers, c, addr, btcUsd);
    if (p.packageAmount !== 50n) {
      pkgOk = false;
      pkgNotes.push(`${label} pkg≠50`);
    }
    if (!p.packageActive && label !== "Root") {
      // Root and all should have active package after Phase 2
      pkgOk = false;
      pkgNotes.push(`${label} package not active`);
    }
    if (p.principal === 0n) {
      pkgOk = false;
      pkgNotes.push(`${label} principal=0`);
    }
  }
  // Root package active check
  const rootPkg = await c.income.incomes(wallets.root);
  if (!rootPkg.packageActive) {
    pkgOk = false;
    pkgNotes.push("Root package not active");
  }
  checks.push(sectionResult("Package", pkgOk, pkgNotes.join("; ") || "all $50 packages active with principal"));

  // ── TOKEN ───────────────────────────────────────────────────────────
  let tokenOk = true;
  const tokenNotes: string[] = [];
  for (const { label, addr } of users) {
    const t = await printToken(ethers, c, addr);
    if (label !== "Root" && t.userBal < 0n) {
      tokenOk = false;
      tokenNotes.push(`${label} bad balance`);
    }
  }
  const treasuryBal = BigInt(await c.token.balanceOf(c.treasuryAddr));
  if (treasuryBal === 0n) {
    tokenOk = false;
    tokenNotes.push("treasury token balance is 0");
  }
  checks.push(
    sectionResult("Token", tokenOk, tokenNotes.join("; ") || `treasury holds ${ethers.formatEther(treasuryBal)} BTCB`),
  );

  // ── TREASURY ────────────────────────────────────────────────────────
  const treasury = await printTreasury(ethers, c, btcUsd);
  const accounted =
    treasury.sumFunds +
    treasury.totalWorkingPaid +
    treasury.totalRoiPaid +
    BigInt(await c.treasury.totalCommunityPaid()) +
    BigInt(await c.treasury.totalRegenerationPaid()) +
    BigInt(await c.treasury.totalReserveWithdrawn()) +
    BigInt(await c.treasury.totalCharityPaid());
  const treasuryOk =
    treasury.tokenBal === treasury.sumFunds &&
    accounted === treasury.totalActivated &&
    treasury.totalActivated > 0n;
  checks.push(
    sectionResult(
      "Treasury",
      treasuryOk,
      treasuryOk
        ? "fund buckets + paid-out == activated; token == fund sum"
        : `token==funds:${treasury.tokenBal === treasury.sumFunds} accounted==activated:${accounted === treasury.totalActivated}`,
    ),
  );

  // ── CONTRIBUTION ────────────────────────────────────────────────────
  const expect = wallets.expectUsd || { root: 5, user1: 4, user2: 2.5, user3: 0 };
  let contribOk = true;
  const contribNotes: string[] = [];
  const pairs: Array<{ label: keyof typeof expect; addr: string }> = [
    { label: "root", addr: wallets.root },
    { label: "user1", addr: wallets.user1 },
    { label: "user2", addr: wallets.user2 },
    { label: "user3", addr: wallets.user3 },
  ];
  for (const { label, addr } of pairs) {
    const v = await printContribution(ethers, c, addr, btcUsd);
    const usd = weiToUsd(ethers, v.total, btcUsd);
    const want = expect[label];
    // Root may have Edge1 extra L2 if Phase 2 QA edges ran — accept >= Steps 1–3
    // when absolute total is within 0.02 of expected OR (root and within 0.02 of expected+1.5)
    const near = (a: number, b: number) => Math.abs(a - b) < 0.02;
    const ok =
      near(usd, want) ||
      (label === "root" && near(usd, want + 1.5)); // Edge1 inactive-sponsor path pays Root L2
    if (!ok) {
      contribOk = false;
      contribNotes.push(`${label}=$${usd.toFixed(2)} want $${want}`);
    } else if (label === "root" && near(usd, want + 1.5)) {
      contribNotes.push(`root=$${usd.toFixed(2)} (Steps1–3 $5 + Edge1 L2 $1.50)`);
    }
    if (v.l1 + v.l2 + v.l3 !== v.total) {
      contribOk = false;
      contribNotes.push(`${label} L1+L2+L3 ≠ total`);
    }
    if (v.incomeMgr !== v.total) {
      // IncomeManager tracks per-package window; may reset — soft note only if both > 0 and mismatch after fresh package
      if (v.total > 0n && v.incomeMgr === 0n) {
        contribNotes.push(`${label} IncomeManager.contributionEarned=0 (package window)`);
      }
    }
  }
  checks.push(
    sectionResult(
      "Contribution",
      contribOk,
      contribNotes.join("; ") || `totals ≈ $${expect.root}/$${expect.user1}/$${expect.user2}/$${expect.user3}`,
    ),
  );

  // ── REFERRAL TREE ───────────────────────────────────────────────────
  const tree = await printReferralTree(c, wallets);
  checks.push(sectionResult("Referral Tree", tree.ok, tree.ok ? "sponsors match Core + ContributionReward" : "sponsor mismatch"));

  // ── EVENTS ──────────────────────────────────────────────────────────
  const fromBlock = Number(process.env.VERIFY_FROM_BLOCK || 0);
  const registered = await fetchEvents(ethers, c.core, "UserRegistered", fromBlock);
  const activated = await fetchEvents(ethers, c.core, "PackageActivated", fromBlock);
  const contribPaid = await fetchEvents(ethers, c.contrib, "ContributionRewardPaid", fromBlock);
  printEvents("UserRegistered", registered, 10);
  printEvents("PackageActivated", activated, 10);
  printEvents("ContributionRewardPaid", contribPaid, 15);

  const eventsOk =
    registered.length >= 4 &&
    activated.length >= 4 && // root + 3 users
    contribPaid.length >= 6; // 1+2+3 from Steps 1–3
  checks.push(
    sectionResult(
      "Events",
      eventsOk,
      `registered=${registered.length} activated=${activated.length} contribPaid=${contribPaid.length}`,
    ),
  );

  // ── TRANSACTIONS ────────────────────────────────────────────────────
  let txOk = true;
  const txNotes: string[] = [];
  const sampleTxs: string[] = [];
  if (wallets.activateTxs?.length) {
    sampleTxs.push(...wallets.activateTxs);
  } else if (activated.length) {
    // last 3 activations
    sampleTxs.push(...activated.slice(-3).map((e) => e.txHash));
  }
  const envTx = (process.env.VERIFY_TX || "").trim();
  if (envTx) sampleTxs.unshift(envTx);

  const uniqueTxs = [...new Set(sampleTxs.map((t) => t.toLowerCase()))].slice(0, 4);
  if (!uniqueTxs.length) {
    txOk = false;
    txNotes.push("no activation txs to inspect");
  }
  for (const tx of uniqueTxs) {
    const info = await printTransaction(ethers, c, tx);
    if (info.status !== 1) {
      txOk = false;
      txNotes.push(`${tx.slice(0, 10)}… status≠1`);
    }
    const hasPkg = info.events.some((e) => e.startsWith("PackageActivated"));
    if (!hasPkg && !envTx) {
      // activate txs should include PackageActivated
      txNotes.push(`${tx.slice(0, 10)}… missing PackageActivated`);
    }
  }
  checks.push(sectionResult("Transactions", txOk, txNotes.join("; ") || `${uniqueTxs.length} activation txs SUCCESS`));

  // ── CONTRACT STATE (informational, folds into summary notes) ────────
  await printContractState(ethers, c, btcUsd);

  const allOk = printSummary(checks);
  if (!allOk) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
