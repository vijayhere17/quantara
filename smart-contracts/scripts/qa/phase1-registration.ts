/**
 * Phase 1 — Registration QA ($50 Starter Package)
 *
 * Mirrors the frontend MetaMask sequence against the live Hardhat deployment:
 *   register(sponsor) → approve(core, tokenAmount) → activatePackage(50)
 *
 * Then verifies:
 *   - 3 distinct mined txs
 *   - core.users(wallet) fields
 *   - token balance delta == package BTCB amount (USD $50 priced via feed)
 *   - treasury fund buckets: 30% ROI pool (unsplit) + 70% working (5% of working → charity)
 *   - IncomeManager streams are zero for the new user
 *
 * Optional Laravel sync:
 *   QA_LARAVEL=1 QA_API_BASE=http://127.0.0.1:8000 npx hardhat run ...
 *
 *   npx hardhat run scripts/qa/phase1-registration.ts --network localhost
 */
import hre from "hardhat";
import fs from "fs";
import path from "path";
import { loadDeployedAddresses, hasContractCode } from "../lib/deploymentHealth";

type Check = { name: string; ok: boolean; note?: string };

const PACKAGE_USD = 50n;

function loadAddresses() {
  return loadDeployedAddresses();
}

async function main() {
  const { ethers } = await hre.network.connect();
  const signers = await ethers.getSigners();
  const root = signers[0];
  // Fresh wallet that has never been registered on this node (Hardhat #4)
  const user = signers[4];
  const provider = ethers.provider;
  const addresses = loadAddresses();

  const checks: Check[] = [];
  const check = (name: string, ok: boolean, note?: string) => {
    checks.push({ name, ok, note });
    console.log(`${ok ? "✅ PASS" : "❌ FAIL"} | ${name}${note ? " — " + note : ""}`);
  };

  console.log("\n══════════════════════════════════════════════════");
  console.log("  PHASE 1 — Registration QA ($50 Starter)");
  console.log("══════════════════════════════════════════════════\n");

  const coreAddr = String(addresses.BTCPlanCore || "");
  const tokenAddr = String(addresses.MockBTCB || addresses.Token || "");
  const treasuryAddr = String(addresses.TreasuryManager || "");
  const incomeAddr = String(addresses.IncomeManager || "");

  check("Config / BTCPlanCore address", ethers.isAddress(coreAddr), coreAddr);
  check("Config / Token address", ethers.isAddress(tokenAddr), tokenAddr);
  check("Config / Treasury address", ethers.isAddress(treasuryAddr), treasuryAddr);
  check(
    "Bytecode / BTCPlanCore",
    await hasContractCode(provider, coreAddr),
  );
  check("Bytecode / Token", await hasContractCode(provider, tokenAddr));
  check("Bytecode / Treasury", await hasContractCode(provider, treasuryAddr));

  const core = await ethers.getContractAt("BTCPlanCore", coreAddr);
  const token = await ethers.getContractAt("MockBTCB", tokenAddr);
  const treasury = await ethers.getContractAt("TreasuryManager", treasuryAddr);
  const income = await ethers.getContractAt("IncomeManager", incomeAddr);

  // Ensure root is active on-chain (sponsor)
  const rootBefore = await core.users(root.address);
  if (!rootBefore.isActive) {
    console.log("→ Bootstrapping root (register address(0))…");
    await (await core.connect(root).register(ethers.ZeroAddress)).wait();
  }
  const rootUser = await core.users(root.address);
  check("Sponsor / root isActive", rootUser.isActive, root.address);

  // Ensure user wallet is unused
  const userProbe = await core.users(user.address);
  check(
    "Clean / user wallet not registered",
    !userProbe.isActive && userProbe.packageAmount === 0n,
    user.address,
  );
  if (userProbe.isActive) {
    throw new Error(
      `User wallet ${user.address} is already registered. Use a fresh Hardhat account or reset the node.`,
    );
  }

  // Fund user with MockBTCB (more than enough for $50 package)
  const tokenAmountNeeded: bigint = await core.getPackageBTCBAmount(PACKAGE_USD);
  check(
    "Pricing / getPackageBTCBAmount(50) > 0",
    tokenAmountNeeded > 0n,
    ethers.formatEther(tokenAmountNeeded) + " BTCB",
  );

  const mintAmt = tokenAmountNeeded * 10n;
  if ((await token.balanceOf(user.address)) < tokenAmountNeeded) {
    console.log("→ Funding user with MockBTCB…");
    try {
      await (await token.connect(root).mint(user.address, mintAmt)).wait();
    } catch {
      await (await token.connect(root).transfer(user.address, mintAmt)).wait();
    }
  }

  const userBalBefore = await token.balanceOf(user.address);
  const treasuryBalBefore = await token.balanceOf(treasuryAddr);
  const fundsBefore = {
    working: await treasury.workingFundBalance(),
    roi: await treasury.interdependentFundBalance(),
    reserve: await treasury.reserveFundBalance(),
    community: await treasury.communityBuilderFundBalance(),
    charity: await treasury.charityFundBalance(),
    regeneration: await treasury.regenerationFundBalance(),
  };

  console.log("\n── Step 2–3: MetaMask-equivalent txs ──");
  console.log("User   :", user.address);
  console.log("Sponsor:", root.address);
  console.log("Package: $50 →", ethers.formatEther(tokenAmountNeeded), "BTCB");

  // TX1 register
  const regTx = await core.connect(user).register(root.address);
  const regReceipt = await regTx.wait();
  const registerTxHash = regTx.hash;
  check(
    "Tx1 / Register mined",
    Boolean(regReceipt && regReceipt.status === 1),
    registerTxHash,
  );

  const afterReg = await core.users(user.address);
  check("Post-register / isActive", afterReg.isActive);
  check(
    "Post-register / sponsor=root",
    afterReg.sponsor.toLowerCase() === root.address.toLowerCase(),
  );
  check("Post-register / packageAmount=0", afterReg.packageAmount === 0n);

  // TX2 approve
  const approveTx = await token
    .connect(user)
    .approve(coreAddr, tokenAmountNeeded);
  const approveReceipt = await approveTx.wait();
  const approveTxHash = approveTx.hash;
  check(
    "Tx2 / Approve mined",
    Boolean(approveReceipt && approveReceipt.status === 1),
    approveTxHash,
  );
  const allowance = await token.allowance(user.address, coreAddr);
  check(
    "Tx2 / Allowance >= package tokens",
    allowance >= tokenAmountNeeded,
    allowance.toString(),
  );

  // TX3 activatePackage(50)
  const pkgTx = await core.connect(user).activatePackage(PACKAGE_USD);
  const pkgReceipt = await pkgTx.wait();
  const packageTxHash = pkgTx.hash;
  check(
    "Tx3 / Activate mined",
    Boolean(pkgReceipt && pkgReceipt.status === 1),
    packageTxHash,
  );

  check(
    "Tx hashes / all distinct",
    new Set([registerTxHash, approveTxHash, packageTxHash]).size === 3,
  );

  console.log("\n── Step 4: On-chain user ──");
  const onChain = await core.users(user.address);
  // ethers v6 may return named or positional Result
  const walletField = String(onChain.wallet ?? onChain[0]);
  const sponsorField = String(onChain.sponsor ?? onChain[1]);
  const packageAmount = BigInt(onChain.packageAmount ?? onChain[2]);
  const packageCycle = Number(onChain.packageCycle ?? onChain[4]);
  const isActive = Boolean(onChain.isActive ?? onChain[6]);

  check(
    "User / wallet",
    walletField.toLowerCase() === user.address.toLowerCase(),
    walletField,
  );
  check(
    "User / sponsor = ROOT",
    sponsorField.toLowerCase() === root.address.toLowerCase(),
    sponsorField,
  );
  check("User / packageAmount = 50", packageAmount === 50n, packageAmount.toString());
  check("User / packageCycle = 1", packageCycle === 1, String(packageCycle));
  check("User / isActive = true", isActive);
  check(
    "User / isBlocked field",
    true,
    "N/A — BTCPlanCore.User has no isBlocked (not in Solidity schema)",
  );

  console.log("\n── Step 5: Token balance ──");
  const userBalAfter = await token.balanceOf(user.address);
  const userDelta = userBalBefore - userBalAfter;
  check(
    "Token / user deducted package BTCB",
    userDelta === tokenAmountNeeded,
    `delta=${ethers.formatEther(userDelta)} expected=${ethers.formatEther(tokenAmountNeeded)}`,
  );
  // Document that deduction is NOT literal "50 tokens" — it is $50 USD priced in BTCB
  check(
    "Token / deduction equals USD$50 priced amount (not raw 50)",
    userDelta === tokenAmountNeeded && tokenAmountNeeded !== 50n,
    "Pricing uses MockBTCPriceFeed (e.g. $60,000) → ~0.000833 BTCB",
  );

  const treasuryBalAfter = await token.balanceOf(treasuryAddr);
  check(
    "Token / treasury received package BTCB",
    treasuryBalAfter - treasuryBalBefore === tokenAmountNeeded,
    `treasury +${ethers.formatEther(treasuryBalAfter - treasuryBalBefore)}`,
  );

  console.log("\n── Step 6: Treasury fund distribution (30% ROI + 70% working / charity) ──");
  const fundsAfter = {
    working: await treasury.workingFundBalance(),
    roi: await treasury.interdependentFundBalance(),
    reserve: await treasury.reserveFundBalance(),
    community: await treasury.communityBuilderFundBalance(),
    charity: await treasury.charityFundBalance(),
    regeneration: await treasury.regenerationFundBalance(),
  };
  const diffs = {
    regeneration: fundsAfter.regeneration - fundsBefore.regeneration,
    roi: fundsAfter.roi - fundsBefore.roi,
    reserve: fundsAfter.reserve - fundsBefore.reserve,
    community: fundsAfter.community - fundsBefore.community,
    charity: fundsAfter.charity - fundsBefore.charity,
    working: fundsAfter.working - fundsBefore.working,
  };

  // Phase 1: entire 30% → ROI pool; reserve/community 0 on activation;
  // working side = remainder (~70%), of which 5% → charity.
  const expectedRoi = (tokenAmountNeeded * 3000n) / 10000n;
  const workingSide = tokenAmountNeeded - expectedRoi;
  const expectedCharity = (workingSide * 500n) / 10000n;
  const expectedWorking = workingSide - expectedCharity;
  const expected = {
    regeneration: 0n,
    roi: expectedRoi,
    reserve: 0n,
    community: 0n,
    charity: expectedCharity,
    working: expectedWorking,
  };

  console.log("Fund                  Before → After   Diff          Expected");
  for (const key of [
    "regeneration",
    "roi",
    "reserve",
    "community",
    "charity",
    "working",
  ] as const) {
    console.log(
      `${key.padEnd(20)} ${ethers.formatEther(fundsBefore[key]).padEnd(12)} ${ethers
        .formatEther(fundsAfter[key])
        .padEnd(12)} ${ethers.formatEther(diffs[key]).padEnd(12)} ${ethers.formatEther(expected[key])}`,
    );
    check(
      `Treasury / ${key} delta`,
      diffs[key] === expected[key],
      `got=${diffs[key]} expected=${expected[key]}`,
    );
  }

  const totalDiff =
    diffs.regeneration +
    diffs.roi +
    diffs.reserve +
    diffs.community +
    diffs.charity +
    diffs.working;
  check(
    "Treasury / total fund increase = package payment",
    totalDiff === tokenAmountNeeded,
    `${totalDiff} == ${tokenAmountNeeded}`,
  );

  console.log("\n── Step 8 (on-chain incomes) ──");
  const totalEarned: bigint = await income.totalEarned(user.address);
  const roiEarned: bigint = await income.roiEarned(user.address);
  const workingEarned: bigint = await income.workingEarned(user.address);
  const contributionEarned: bigint = await income
    .contributionEarned(user.address)
    .catch(async () => {
      const row = await income.incomes(user.address);
      return BigInt(row.contributionEarned ?? 0);
    });
  check("Income / totalEarned = 0", totalEarned === 0n, totalEarned.toString());
  check("Income / roiEarned = 0", roiEarned === 0n, roiEarned.toString());
  check(
    "Income / workingEarned = 0",
    workingEarned === 0n,
    workingEarned.toString(),
  );
  check(
    "Income / contributionEarned = 0 (new member)",
    contributionEarned === 0n,
    contributionEarned.toString(),
  );

  // PackageActivated event present
  const pkgIface = core.interface;
  const activatedLogs = (pkgReceipt?.logs || []).filter((log) => {
    try {
      const parsed = pkgIface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });
      return parsed?.name === "PackageActivated";
    } catch {
      return false;
    }
  });
  check("Events / PackageActivated emitted", activatedLogs.length === 1);

  // Optional Laravel registration
  const laravelBase = (process.env.QA_API_BASE || "").replace(/\/$/, "");
  const wantLaravel = process.env.QA_LARAVEL === "1" || Boolean(laravelBase);
  let laravelPayload: Record<string, unknown> | null = null;

  if (wantLaravel && laravelBase) {
    console.log("\n── Steps 7–9: Laravel API registration ──");
    const body = {
      firstname: "Phase",
      lastname: "One",
      email: `phase1_${Date.now()}@quantara.test`,
      password: "secret12",
      wallet: user.address,
      sponsor_id: root.address,
      tx_hash: registerTxHash,
      package_amount: 50,
      package_tx_hash: packageTxHash,
      approve_tx_hash: approveTxHash,
      token_amount: tokenAmountNeeded.toString(),
      leg: "L",
    };

    const res = await fetch(`${laravelBase}/api/auth/register`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as Record<string, unknown>;
    laravelPayload = json;
    check(
      "Laravel / register API success",
      Boolean(json.success),
      String(json.error || res.status),
    );

    const dash = (json.dashboard || {}) as Record<string, unknown>;
    const apiUser = (json.user || {}) as Record<string, unknown>;
    if (json.success) {
      check(
        "Laravel / wallet matches",
        String(apiUser.wallet || "").toLowerCase() === user.address.toLowerCase(),
      );
      check(
        "Laravel / package = 50",
        Number((apiUser.package as { amount?: number })?.amount ?? apiUser.package_amount) ===
          50 || Number(dash.package) === 50,
        JSON.stringify(apiUser.package || dash.package || apiUser),
      );
    }
  } else {
    console.log(
      "\n⏭  Laravel API skipped (set QA_LARAVEL=1 QA_API_BASE=http://127.0.0.1:8000)",
    );
  }

  // Persist report artifacts
  const report = {
    phase: 1,
    packageUsd: 50,
    user: user.address,
    sponsor: root.address,
    tokenAmount: tokenAmountNeeded.toString(),
    tokenAmountFormatted: ethers.formatEther(tokenAmountNeeded),
    txs: {
      register: registerTxHash,
      approve: approveTxHash,
      activate: packageTxHash,
    },
    onChain: {
      wallet: walletField,
      sponsor: sponsorField,
      packageAmount: packageAmount.toString(),
      packageCycle,
      isActive,
    },
    treasuryDiffs: Object.fromEntries(
      Object.entries(diffs).map(([k, v]) => [k, v.toString()]),
    ),
    checks,
    laravel: laravelPayload,
    passed: checks.every((c) => c.ok),
  };

  const outDir = path.resolve("scripts/qa/reports");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `phase1-registration-${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  // Also write a stable latest pointer
  fs.writeFileSync(
    path.join(outDir, "phase1-registration-latest.json"),
    JSON.stringify(report, null, 2),
  );

  const failed = checks.filter((c) => !c.ok);
  console.log("\n══════════════════════════════════════════════════");
  console.log(
    `  PHASE 1 RESULT: ${failed.length === 0 ? "✅ PASS" : "❌ FAIL"}`,
  );
  console.log(`  Checks: ${checks.length - failed.length}/${checks.length} passed`);
  console.log(`  Report: ${outFile}`);
  console.log("══════════════════════════════════════════════════\n");

  if (failed.length) {
    console.log("Failed checks:");
    for (const f of failed) console.log(" -", f.name, f.note || "");
    process.exit(1);
  }

  // Print hashes for the QA checklist
  console.log("Saved tx hashes:");
  console.log("  Register :", registerTxHash);
  console.log("  Approve  :", approveTxHash);
  console.log("  Activate :", packageTxHash);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
