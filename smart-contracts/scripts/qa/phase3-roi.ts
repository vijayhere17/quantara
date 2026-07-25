/**
 * Phase 3 — ROI cycle QA (read-verify first; does not change business logic).
 *
 * Existing ROI processor: InterdependentReward.claimRoi()
 * One cycle = advance exactly 1 day (86400s) + claimRoi() once for the subject user.
 *
 * Prerequisites (localhost):
 *   FORCE_DEPLOY=1 npm run bootstrap:demo
 *   npm run qa:phase2
 *
 *   npm run qa:phase3
 *   QA_LARAVEL=1 QA_API_BASE=http://127.0.0.1:8000 npm run qa:phase3
 */
import hre from "hardhat";
import fs from "fs";
import path from "path";
import { loadDeployedAddresses, hasContractCode } from "../lib/deploymentHealth";

type Check = { name: string; ok: boolean; note?: string };

const ONE_DAY = 86400;
const BTC_USD = 60_000;

async function main() {
  const { ethers } = await hre.network.connect();
  const provider = ethers.provider;
  const [root, user1, user2, user3] = await ethers.getSigners();
  const addresses = loadDeployedAddresses();
  const checks: Check[] = [];
  const check = (name: string, ok: boolean, note?: string) => {
    checks.push({ name, ok, note });
    console.log(`${ok ? "✅ PASS" : "❌ FAIL"} | ${name}${note ? " — " + note : ""}`);
  };

  console.log("\n══════════════════════════════════════════════════");
  console.log("  PHASE 3 — ROI Cycle QA (exactly 1 day / 1 claim)");
  console.log("══════════════════════════════════════════════════\n");

  const coreAddr = String(addresses.BTCPlanCore || "");
  const tokenAddr = String(addresses.MockBTCB || addresses.Token || "");
  const treasuryAddr = String(addresses.TreasuryManager || "");
  const rewardAddr = String(addresses.InterdependentReward || "");
  const incomeAddr = String(addresses.IncomeManager || "");

  for (const [label, addr] of [
    ["BTCPlanCore", coreAddr],
    ["Token", tokenAddr],
    ["Treasury", treasuryAddr],
    ["InterdependentReward", rewardAddr],
    ["IncomeManager", incomeAddr],
  ] as const) {
    check(`Bytecode / ${label}`, await hasContractCode(provider, addr), addr);
  }

  const core = await ethers.getContractAt("BTCPlanCore", coreAddr);
  const token = await ethers.getContractAt("MockBTCB", tokenAddr);
  const treasury = await ethers.getContractAt("TreasuryManager", treasuryAddr);
  const reward = await ethers.getContractAt("InterdependentReward", rewardAddr);
  const income = await ethers.getContractAt("IncomeManager", incomeAddr);

  // Subject: User1 (Hardhat #1) — must already have active package + ROI from Phase 2
  const subject = user1;
  const u = await core.users(subject.address);
  check("Subject / isActive", Boolean(u.isActive), subject.address);
  check("Subject / packageAmount=50", u.packageAmount === 50n, u.packageAmount.toString());

  const roiBefore = await reward.roiAccounts(subject.address);
  check("Subject / ROI active", Boolean(roiBefore.isActive));
  check(
    "Subject / ROI principal > 0",
    BigInt(roiBefore.principal) > 0n,
    roiBefore.principal.toString(),
  );

  const principal = BigInt(roiBefore.principal);
  const roiCap = await income.getRoiCap(subject.address);
  const remainingRoiCap = await income.getRemainingRoiCap(subject.address);
  const roiEarnedBefore = BigInt(await income.roiEarned(subject.address));
  const totalEarnedBefore = BigInt(await income.totalEarned(subject.address));

  check("IncomeManager / ROI cap = 3X principal", roiCap === principal * 3n, `cap=${roiCap}`);
  check(
    "IncomeManager / remaining ROI cap > 0",
    remainingRoiCap > 0n,
    remainingRoiCap.toString(),
  );
  check("IncomeManager / roiEarned before = 0 (fresh package)", roiEarnedBefore === 0n);

  // ── BEFORE snapshot ─────────────────────────────────────────────────
  const before = {
    pending: BigInt(await reward.getPendingRoi(subject.address)),
    userBal: BigInt(await token.balanceOf(subject.address)),
    treasuryBal: BigInt(await token.balanceOf(treasuryAddr)),
    roiFund: BigInt(await treasury.interdependentFundBalance()),
    workingFund: BigInt(await treasury.workingFundBalance()),
    regenFund: BigInt(await treasury.regenerationFundBalance()),
    reserveFund: BigInt(await treasury.reserveFundBalance()),
    communityFund: BigInt(await treasury.communityBuilderFundBalance()),
    totalSelfRoiPaid: BigInt(await treasury.totalSelfRoiPaid()),
    dailyBps: BigInt(await reward.calculateDailyRoiBps()),
    totalActivePrincipal: BigInt(await reward.totalActivePrincipal()),
    availableDailyBudget: BigInt(await treasury.getAvailableDailyRoiBudget()),
  };

  check(
    "Before / pending ROI = 0 (same day as activation)",
    before.pending === 0n,
    before.pending.toString(),
  );
  check("Before / daily ROI BPS > 0", before.dailyBps > 0n, before.dailyBps.toString());
  check(
    "Before / daily BPS ≤ 100 (1% max)",
    before.dailyBps <= 100n,
    before.dailyBps.toString(),
  );

  console.log("\n── Before snapshot ──");
  console.log(`  principal              : ${ethers.formatEther(principal)} BTCB`);
  console.log(`  dailyBps               : ${before.dailyBps}`);
  console.log(`  totalActivePrincipal   : ${ethers.formatEther(before.totalActivePrincipal)}`);
  console.log(`  ROI fund               : ${ethers.formatEther(before.roiFund)}`);
  console.log(`  available daily budget : ${ethers.formatEther(before.availableDailyBudget)} (5% of ROI fund)`);
  console.log(`  user token             : ${ethers.formatEther(before.userBal)}`);
  console.log(`  treasury token         : ${ethers.formatEther(before.treasuryBal)}`);

  // ── Exactly ONE ROI cycle: +1 day ───────────────────────────────────
  console.log("\n── Time travel: +1 day (exactly one ROI cycle) ──");
  await provider.send("evm_increaseTime", [ONE_DAY]);
  await provider.send("evm_mine", []);

  const pendingAfterDay = BigInt(await reward.getPendingRoi(subject.address));
  const expectPending =
    (principal * before.dailyBps * 1n) / 10000n; // 1 day

  // dailyBps may recompute after time travel (same formula if fund unchanged)
  const dailyBpsAfter = BigInt(await reward.calculateDailyRoiBps());
  const expectPendingAfter = (principal * dailyBpsAfter * 1n) / 10000n;

  check(
    "After +1d / pending ROI > 0",
    pendingAfterDay > 0n,
    pendingAfterDay.toString(),
  );
  check(
    "After +1d / pending == principal * dailyBps / 10000",
    pendingAfterDay === expectPendingAfter,
    `got=${pendingAfterDay} expect=${expectPendingAfter} bps=${dailyBpsAfter}`,
  );

  const usd = (wei: bigint) => Number(ethers.formatEther(wei)) * BTC_USD;
  console.log(
    `  Pending ROI: ${ethers.formatEther(pendingAfterDay)} BTCB (~$${usd(pendingAfterDay).toFixed(4)})`,
  );

  // ── Claim once ──────────────────────────────────────────────────────
  console.log("\n── claimRoi() once (User1) ──");
  const tx = await reward.connect(subject).claimRoi();
  const receipt = await tx.wait();
  check("claimRoi / mined SUCCESS", Boolean(receipt?.status === 1), tx.hash);

  // Parse events from receipt
  let roiClaimedAmt = 0n;
  let selfRoiPaidAmt = 0n;
  let incomeRecordedAccepted = 0n;
  for (const log of receipt?.logs || []) {
    try {
      const p = reward.interface.parseLog({ topics: log.topics as string[], data: log.data });
      if (p?.name === "RoiClaimed") {
        roiClaimedAmt = BigInt(p.args.amount);
        check(
          "Event / RoiClaimed user",
          String(p.args.user).toLowerCase() === subject.address.toLowerCase(),
        );
      }
    } catch {
      //
    }
    try {
      const p = treasury.interface.parseLog({ topics: log.topics as string[], data: log.data });
      if (p?.name === "SelfRoiPaid") {
        selfRoiPaidAmt = BigInt(p.args.amount);
      }
    } catch {
      //
    }
    try {
      const p = income.interface.parseLog({ topics: log.topics as string[], data: log.data });
      if (p?.name === "IncomeRecorded" && Number(p.args.incomeType) === 0) {
        // IncomeType.ROI = 0 typically — verify enum
        incomeRecordedAccepted = BigInt(p.args.accepted);
      }
    } catch {
      //
    }
  }

  // IncomeType enum: check IIncomeManager
  // Re-scan IncomeRecorded for subject
  for (const log of receipt?.logs || []) {
    try {
      const p = income.interface.parseLog({ topics: log.topics as string[], data: log.data });
      if (
        p?.name === "IncomeRecorded" &&
        String(p.args.user).toLowerCase() === subject.address.toLowerCase()
      ) {
        incomeRecordedAccepted = BigInt(p.args.accepted);
        check(
          "Event / IncomeRecorded accepted > 0",
          incomeRecordedAccepted > 0n,
          incomeRecordedAccepted.toString(),
        );
      }
    } catch {
      //
    }
  }

  check("Event / RoiClaimed amount > 0", roiClaimedAmt > 0n, roiClaimedAmt.toString());
  check(
    "Event / SelfRoiPaid amount == RoiClaimed",
    selfRoiPaidAmt === roiClaimedAmt,
    `self=${selfRoiPaidAmt} claimed=${roiClaimedAmt}`,
  );
  check(
    "Event / claimed == pending (full 1-day payout)",
    roiClaimedAmt === pendingAfterDay,
    `claimed=${roiClaimedAmt} pendingWas=${pendingAfterDay}`,
  );

  // ── AFTER snapshot ──────────────────────────────────────────────────
  const after = {
    pending: BigInt(await reward.getPendingRoi(subject.address)),
    userBal: BigInt(await token.balanceOf(subject.address)),
    treasuryBal: BigInt(await token.balanceOf(treasuryAddr)),
    roiFund: BigInt(await treasury.interdependentFundBalance()),
    workingFund: BigInt(await treasury.workingFundBalance()),
    regenFund: BigInt(await treasury.regenerationFundBalance()),
    reserveFund: BigInt(await treasury.reserveFundBalance()),
    communityFund: BigInt(await treasury.communityBuilderFundBalance()),
    totalSelfRoiPaid: BigInt(await treasury.totalSelfRoiPaid()),
    roiEarned: BigInt(await income.roiEarned(subject.address)),
    totalEarned: BigInt(await income.totalEarned(subject.address)),
    remainingRoiCap: BigInt(await income.getRemainingRoiCap(subject.address)),
  };

  console.log("\n── After claim ──");
  console.log(`  RoiClaimed             : ${ethers.formatEther(roiClaimedAmt)} BTCB (~$${usd(roiClaimedAmt).toFixed(4)})`);
  console.log(`  user Δ balance         : ${ethers.formatEther(after.userBal - before.userBal)}`);
  console.log(`  treasury Δ             : ${ethers.formatEther(after.treasuryBal - before.treasuryBal)}`);
  console.log(`  ROI fund Δ             : ${ethers.formatEther(after.roiFund - before.roiFund)}`);
  console.log(`  IncomeManager.roiEarned: ${ethers.formatEther(after.roiEarned)}`);
  console.log(`  remaining ROI cap      : ${ethers.formatEther(after.remainingRoiCap)}`);

  check(
    "User token / +claimed amount",
    after.userBal - before.userBal === roiClaimedAmt,
  );
  check(
    "Treasury token / -claimed amount",
    before.treasuryBal - after.treasuryBal === roiClaimedAmt,
  );
  check(
    "ROI wallet (interdependent) / -claimed amount",
    before.roiFund - after.roiFund === roiClaimedAmt,
  );
  check(
    "Other treasury buckets unchanged",
    after.workingFund === before.workingFund &&
      after.regenFund === before.regenFund &&
      after.reserveFund === before.reserveFund &&
      after.communityFund === before.communityFund,
  );
  check(
    "Treasury.totalSelfRoiPaid / +claimed",
    after.totalSelfRoiPaid - before.totalSelfRoiPaid === roiClaimedAmt,
  );
  check("IncomeManager / roiEarned == claimed", after.roiEarned === roiClaimedAmt);
  check(
    "IncomeManager / totalEarned increased by claimed",
    after.totalEarned - totalEarnedBefore === roiClaimedAmt,
  );
  check(
    "IncomeManager / remaining ROI cap decreased by claimed",
    after.remainingRoiCap === BigInt(remainingRoiCap) - roiClaimedAmt,
    `before=${remainingRoiCap} after=${after.remainingRoiCap} claimed=${roiClaimedAmt}`,
  );
  check(
    "Pending after claim = 0 (same second)",
    after.pending === 0n,
    after.pending.toString(),
  );

  // Cap math still holds
  check(
    "ROI cap still 3X principal",
    BigInt(await income.getRoiCap(subject.address)) === principal * 3n,
  );
  check(
    "roiEarned < ROI cap (not exhausted after 1 day)",
    after.roiEarned < principal * 3n,
  );

  // Second claim same day should fail (no new day)
  let secondClaimReverted = false;
  try {
    await (await reward.connect(subject).claimRoi()).wait();
  } catch {
    secondClaimReverted = true;
  }
  check("Same-day second claimRoi reverts (no pending)", secondClaimReverted);

  // Optional Laravel sync
  let laravel: Record<string, unknown> | null = null;
  if (process.env.QA_LARAVEL === "1") {
    console.log("\n── Laravel DB sync ──");
    const handoff = {
      subject: subject.address,
      root: root.address,
      user1: user1.address,
      user2: user2.address,
      user3: user3.address,
      claimTx: tx.hash,
      claimedWei: roiClaimedAmt.toString(),
      claimedUsd: usd(roiClaimedAmt),
      principalWei: principal.toString(),
      dailyBps: dailyBpsAfter.toString(),
      roiCapWei: (principal * 3n).toString(),
    };
    const handoffPath = path.resolve("scripts/qa/reports/phase3-handoff.json");
    fs.mkdirSync(path.dirname(handoffPath), { recursive: true });
    fs.writeFileSync(handoffPath, JSON.stringify(handoff, null, 2));
    check("Laravel / handoff written", true, handoffPath);
    laravel = handoff;
  }

  const report = {
    phase: 3,
    subject: subject.address,
    claimTx: tx.hash,
    claimedWei: roiClaimedAmt.toString(),
    claimedUsd: usd(roiClaimedAmt),
    principalWei: principal.toString(),
    dailyBps: dailyBpsAfter.toString(),
    expectPendingWei: expectPendingAfter.toString(),
    before: Object.fromEntries(
      Object.entries(before).map(([k, v]) => [k, v.toString()]),
    ),
    after: Object.fromEntries(
      Object.entries(after).map(([k, v]) => [k, v.toString()]),
    ),
    checks,
    laravel,
    passed: checks.every((c) => c.ok),
  };

  const outDir = path.resolve("scripts/qa/reports");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "phase3-roi-latest.json"),
    JSON.stringify(report, null, 2),
  );

  const failed = checks.filter((c) => !c.ok);
  console.log("\n══════════════════════════════════════════════════");
  console.log(
    `  PHASE 3 ON-CHAIN RESULT: ${failed.length === 0 ? "✅ PASS" : "❌ FAIL"}`,
  );
  console.log(`  Checks: ${checks.length - failed.length}/${checks.length} passed`);
  console.log(`  Claimed: ${ethers.formatEther(roiClaimedAmt)} BTCB (~$${usd(roiClaimedAmt).toFixed(4)})`);
  console.log(`  Tx: ${tx.hash}`);
  console.log("══════════════════════════════════════════════════\n");

  if (failed.length) {
    for (const f of failed) console.log(" -", f.name, f.note || "");
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
