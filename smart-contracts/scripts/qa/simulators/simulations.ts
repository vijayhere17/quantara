/**
 * Phase 5 business-rule simulators — each returns a SimulatorReport.
 */
import { ReportCollector, type SimulatorReport, netAfterRecycle, fiftyFiftyVolume } from "./lib/report";
import { deploySimulatorSystem, type SimulatorSystem } from "./lib/deploySystem";
import { buildReferralTree, nodesNeeded, clampTreeOptions } from "./lib/tree";
import {
  activatePackageUsd,
  completeCurrentPackageByRoi,
  progressThroughPackages,
  registerUser,
} from "./lib/packages";

async function fresh(ethers: any): Promise<SimulatorSystem> {
  return deploySimulatorSystem(ethers);
}

/** 1. Referral Tree Generator */
export async function simReferralTree(ethers: any): Promise<SimulatorReport> {
  const r = new ReportCollector("ReferralTreeGenerator");
  const depth = Number(process.env.QA_TREE_DEPTH || 2);
  const directs = Number(process.env.QA_TREE_DIRECTS || 2);
  const opts = clampTreeOptions({ depth, directsPerUser: directs });
  r.check("Depth in 1–9", opts.depth >= 1 && opts.depth <= 9, String(opts.depth));
  r.check(
    "Directs per user in 1–5",
    opts.directsPerUser >= 1 && opts.directsPerUser <= 5,
    String(opts.directsPerUser),
  );

  const need = nodesNeeded(opts.depth, opts.directsPerUser);
  const sys = await fresh(ethers);
  r.check(
    "Enough Hardhat signers for tree",
    sys.signers.length >= need,
    `need=${need} have=${sys.signers.length}`,
  );

  const { root, flat, used } = buildReferralTree(sys.signers, opts);
  r.check("Root depth 0", root.depth === 0);
  r.check("Flat size matches used", flat.length === used);
  r.check(
    "Leaf depth equals requested depth",
    flat.some((n) => n.depth === opts.depth),
  );

  // Register on-chain
  await registerUser(sys.core, root.signer, null);
  for (const node of flat.slice(1)) {
    await registerUser(sys.core, node.signer, node.sponsor);
  }
  const rootUser = await sys.core.users(root.signer.address);
  r.check("Root registered", Boolean(rootUser.isActive));
  const child = flat[1];
  if (child) {
    const u = await sys.core.users(child.signer.address);
    r.check(
      "Child sponsor = parent",
      String(u.sponsor).toLowerCase() === child.sponsor.address.toLowerCase(),
    );
  }
  return r.finish();
}

/** 2. Package Simulator — first activation must be $50 */
export async function simPackage(ethers: any): Promise<SimulatorReport> {
  const r = new ReportCollector("PackageSimulator");
  const sys = await fresh(ethers);
  const user = sys.owner;

  await registerUser(sys.core, user, null);
  const [nextPkg, nextCycle] = await sys.core.getNextEligiblePackage(user.address);
  r.check("Next package is $50", nextPkg === 50n, String(nextPkg));
  r.check("Next cycle is 1", Number(nextCycle) === 1);

  await expectRevert(
    r,
    "Cannot skip to $100",
    () => sys.core.connect(user).activatePackage(100),
    "Invalid package sequence",
  );

  const tokenAmount = await activatePackageUsd(
    sys.core,
    sys.mockBTCB,
    user,
    sys.owner,
    50n,
  );
  const u = await sys.core.users(user.address);
  r.check("Activated $50", u.packageAmount === 50n);
  r.check("Cycle 1", Number(u.packageCycle) === 1);
  r.check("Principal set", (await sys.incomeManager.principal(user.address)) === tokenAmount);

  // Treasury Phase 1 split
  const roi = await sys.treasury.interdependentFundBalance();
  const reserve = await sys.treasury.reserveFundBalance();
  const community = await sys.treasury.communityBuilderFundBalance();
  const charity = await sys.treasury.charityFundBalance();
  const working = await sys.treasury.workingFundBalance();
  const expectedRoi = (tokenAmount * 3000n) / 10000n;
  const workingSide = tokenAmount - expectedRoi;
  const expectedCharity = (workingSide * 500n) / 10000n;
  r.check("ROI Pool = 30% unsplit", roi === expectedRoi);
  r.check("Reserve = 0 on activation", reserve === 0n);
  r.check("Community = 0 on activation", community === 0n);
  r.check("Charity = 5% of working side", charity === expectedCharity);
  r.check(
    "Working + charity + ROI = payment",
    roi + charity + working === tokenAmount,
  );

  return r.finish();
}

/** 3. Package Upgrade Simulator — two activations per package before next */
export async function simPackageUpgrade(ethers: any): Promise<SimulatorReport> {
  const r = new ReportCollector("PackageUpgradeSimulator");
  const sys = await fresh(ethers);
  const user = sys.owner;
  await registerUser(sys.core, user, null);

  await activatePackageUsd(sys.core, sys.mockBTCB, user, sys.owner, 50n);
  await expectRevert(
    r,
    "Cannot activate again before complete",
    () => sys.core.connect(user).activatePackage(50),
    "Complete current package first",
  );

  await completeCurrentPackageByRoi(sys.incomeManager, user.address);
  let next = await sys.core.getNextEligiblePackage(user.address);
  r.check("After C1 complete → $50 C2", next[0] === 50n && Number(next[1]) === 2);

  await activatePackageUsd(sys.core, sys.mockBTCB, user, sys.owner, 50n);
  await completeCurrentPackageByRoi(sys.incomeManager, user.address);
  next = await sys.core.getNextEligiblePackage(user.address);
  r.check("After $50 C2 → $100 C1", next[0] === 100n && Number(next[1]) === 1);

  // Spot-check two activations required through $300
  for (const pkg of [100n, 300n]) {
    for (const cycle of [1, 2]) {
      next = await sys.core.getNextEligiblePackage(user.address);
      r.check(
        `Next is $${pkg} C${cycle}`,
        next[0] === pkg && Number(next[1]) === cycle,
      );
      await activatePackageUsd(sys.core, sys.mockBTCB, user, sys.owner, pkg);
      await completeCurrentPackageByRoi(sys.incomeManager, user.address);
    }
  }
  next = await sys.core.getNextEligiblePackage(user.address);
  r.check("Unlocked $500 after two $300 activations", next[0] === 500n);

  return r.finish();
}

/** 4. Unlimited $10000 Top-up Simulator */
export async function simUnlimitedTopup(ethers: any): Promise<SimulatorReport> {
  const r = new ReportCollector("UnlimitedTopupSimulator");
  const sys = await fresh(ethers);
  const user = sys.owner;
  await registerUser(sys.core, user, null);

  await progressThroughPackages(
    sys.core,
    sys.mockBTCB,
    sys.incomeManager,
    user,
    sys.owner,
    10000n,
  );

  let next = await sys.core.getNextEligiblePackage(user.address);
  r.check(
    "After $10000 C2 → unlimited $10000 C2",
    next[0] === 10000n && Number(next[1]) === 2,
  );

  for (let i = 0; i < 3; i++) {
    await activatePackageUsd(sys.core, sys.mockBTCB, user, sys.owner, 10000n);
    await completeCurrentPackageByRoi(sys.incomeManager, user.address);
    next = await sys.core.getNextEligiblePackage(user.address);
    r.check(
      `Unlimited top-up #${i + 1} still $10000 C2`,
      next[0] === 10000n && Number(next[1]) === 2,
    );
  }

  return r.finish();
}

/** 5. Self ROI Simulator */
export async function simSelfRoi(ethers: any): Promise<SimulatorReport> {
  const r = new ReportCollector("SelfRoiSimulator");
  const sys = await fresh(ethers);
  const user = sys.signers[1];

  await registerUser(sys.core, sys.owner, null);
  await activatePackageUsd(sys.core, sys.mockBTCB, sys.owner, sys.owner, 50n);

  await registerUser(sys.core, user, sys.owner);
  await activatePackageUsd(sys.core, sys.mockBTCB, user, sys.owner, 50n);

  await ethers.provider.send("evm_increaseTime", [86400]);
  await ethers.provider.send("evm_mine", []);

  const pending = await sys.interdependentReward.getPendingRoi(user.address);
  r.check("Pending ROI > 0 after 1 day", pending > 0n, pending.toString());

  const balBefore = await sys.mockBTCB.balanceOf(user.address);
  const roiBefore = await sys.treasury.interdependentFundBalance();
  const reserveBefore = await sys.treasury.reserveFundBalance();
  const [net] = await sys.treasury.previewRecycling(pending);

  await sys.interdependentReward.connect(user).claimRoi();

  const balAfter = await sys.mockBTCB.balanceOf(user.address);
  r.check("Wallet +net after recycle", balAfter - balBefore === net);
  r.check(
    "IncomeManager roiEarned = gross",
    (await sys.incomeManager.roiEarned(user.address)) === pending,
  );
  r.check(
    "Reserve credited from recycle",
    (await sys.treasury.reserveFundBalance()) > reserveBefore,
  );
  r.check(
    "ROI pool decreased net of recycle",
    (await sys.treasury.interdependentFundBalance()) < roiBefore,
  );

  return r.finish();
}

/** 6. Direct Income + Contribution Reward Simulator */
export async function simDirectAndContribution(
  ethers: any,
): Promise<SimulatorReport> {
  const r = new ReportCollector("DirectIncome+ContributionReward");
  const sys = await fresh(ethers);
  const [root, u1, u2, u3] = sys.signers;

  await registerUser(sys.core, root, null);
  await activatePackageUsd(sys.core, sys.mockBTCB, root, root, 50n);

  await registerUser(sys.core, u1, root);
  const t1 = await activatePackageUsd(sys.core, sys.mockBTCB, u1, root, 50n);
  const expectL1 = (t1 * 500n) / 10000n;
  r.check(
    "Root L1 contribution = 5%",
    (await sys.contributionReward.levelIncome(root.address, 1)) === expectL1,
  );
  r.check(
    "Root contributionEarned = L1 gross",
    (await sys.incomeManager.contributionEarned(root.address)) === expectL1,
  );

  await registerUser(sys.core, u2, u1);
  const t2 = await activatePackageUsd(sys.core, sys.mockBTCB, u2, root, 50n);
  r.check(
    "U1 L1 = 5%",
    (await sys.contributionReward.levelIncome(u1.address, 1)) ===
      (t2 * 500n) / 10000n,
  );
  r.check(
    "Root L2 = 3%",
    (await sys.contributionReward.levelIncome(root.address, 2)) ===
      (t2 * 300n) / 10000n,
  );

  await registerUser(sys.core, u3, u2);
  const t3 = await activatePackageUsd(sys.core, sys.mockBTCB, u3, root, 50n);
  r.check(
    "Root L3 = 2%",
    (await sys.contributionReward.levelIncome(root.address, 3)) ===
      (t3 * 200n) / 10000n,
  );

  return r.finish();
}

/** 7. Growth Accelerator Simulator */
export async function simGrowthAccelerator(
  ethers: any,
): Promise<SimulatorReport> {
  const r = new ReportCollector("GrowthAcceleratorSimulator");
  const sys = await fresh(ethers);
  const [sponsor, leg1, leg2, buyer] = sys.signers;
  const booster = sys.contributionBooster;

  await registerUser(sys.core, sponsor, null);
  await activatePackageUsd(sys.core, sys.mockBTCB, sponsor, sponsor, 50n);
  await registerUser(sys.core, leg1, sponsor);
  await registerUser(sys.core, leg2, sponsor);

  // Build ~900 BV per leg via package ladder (50×2 + 100×2 + 300×2)
  for (const leg of [leg1, leg2]) {
    await activatePackageUsd(sys.core, sys.mockBTCB, leg, sponsor, 50n);
    await completeCurrentPackageByRoi(sys.incomeManager, leg.address);
    await activatePackageUsd(sys.core, sys.mockBTCB, leg, sponsor, 50n);
    await completeCurrentPackageByRoi(sys.incomeManager, leg.address);
    for (const pkg of [100n, 300n]) {
      for (let c = 0; c < 2; c++) {
        await activatePackageUsd(sys.core, sys.mockBTCB, leg, sponsor, pkg);
        await completeCurrentPackageByRoi(sys.incomeManager, leg.address);
      }
    }
  }

  const ff = await booster.getFiftyFiftyVolume(sponsor.address);
  r.check("50:50 volume >= 1000", ff >= 1000n, ff.toString());
  r.check(
    "Growth Accelerator active",
    await booster.isBoosterActive(sponsor.address),
  );
  r.check(
    "L1 BPS = 10% while GA active",
    (await sys.contributionReward.getLevel1Bps(sponsor.address)) === 1000n,
  );

  const sponsorL1Before = await sys.contributionReward.levelIncome(
    sponsor.address,
    1,
  );
  await registerUser(sys.core, buyer, sponsor);
  const tokenAmt = await activatePackageUsd(
    sys.core,
    sys.mockBTCB,
    buyer,
    sponsor,
    50n,
  );
  const sponsorL1After = await sys.contributionReward.levelIncome(
    sponsor.address,
    1,
  );
  const delta = sponsorL1After - sponsorL1Before;
  r.check(
    "New direct pays L1 at 10% (GA replace)",
    delta === (tokenAmt * 1000n) / 10000n,
    `delta=${delta} expect=${(tokenAmt * 1000n) / 10000n}`,
  );

  r.check(
    "50:50 formula 1500/1500 → 3000",
    fiftyFiftyVolume(1500n, 3000n) === 3000n,
  );
  r.check(
    "50:50 formula 2000/500 → 1000",
    fiftyFiftyVolume(2000n, 2500n) === 1000n,
  );

  return r.finish();
}

/** 8. Rank Simulator */
export async function simRank(ethers: any): Promise<SimulatorReport> {
  const r = new ReportCollector("RankSimulator");
  const sys = await fresh(ethers);
  const rank = sys.rankReward;

  r.check("Seed BPS 10%", (await rank.rankRewardBps(1)) === 1000n);
  r.check("Sprout BPS 15%", (await rank.rankRewardBps(2)) === 1500n);
  r.check("Genesis BPS 45%", (await rank.rankRewardBps(8)) === 4500n);

  // Seed auto-qualify: 2 directs, max leg >= 250, group >= 500
  const [root, d1, d2] = sys.signers;
  await registerUser(sys.core, root, null);
  await activatePackageUsd(sys.core, sys.mockBTCB, root, root, 50n);
  await registerUser(sys.core, d1, root);
  await registerUser(sys.core, d2, root);

  // Build volume via packages totaling >= 250 per strongest path
  await activatePackageUsd(sys.core, sys.mockBTCB, d1, root, 50n);
  await completeCurrentPackageByRoi(sys.incomeManager, d1.address);
  await activatePackageUsd(sys.core, sys.mockBTCB, d1, root, 50n);
  await completeCurrentPackageByRoi(sys.incomeManager, d1.address);
  for (const pkg of [100n, 300n]) {
    for (const _ of [1, 2]) {
      await activatePackageUsd(sys.core, sys.mockBTCB, d1, root, pkg);
      await completeCurrentPackageByRoi(sys.incomeManager, d1.address);
    }
  }
  await activatePackageUsd(sys.core, sys.mockBTCB, d2, root, 50n);
  await completeCurrentPackageByRoi(sys.incomeManager, d2.address);
  await activatePackageUsd(sys.core, sys.mockBTCB, d2, root, 50n);
  await completeCurrentPackageByRoi(sys.incomeManager, d2.address);
  for (const pkg of [100n, 300n]) {
    for (const _ of [1, 2]) {
      await activatePackageUsd(sys.core, sys.mockBTCB, d2, root, pkg);
      await completeCurrentPackageByRoi(sys.incomeManager, d2.address);
    }
  }

  const seedOk = await rank.checkSeedQualification(root.address);
  r.check("Seed qualification reachable", seedOk);
  // updateRank happens in recordPackageVolume
  const userRank = Number(await rank.userRanks(root.address));
  r.check("Auto rank >= Seed", userRank >= 1, String(userRank));

  return r.finish();
}

/** 9. Community Builder Simulator */
export async function simCommunityBuilder(
  ethers: any,
): Promise<SimulatorReport> {
  const r = new ReportCollector("CommunityBuilderSimulator");
  const sys = await fresh(ethers);
  const [, q5, q6, q7, q8] = sys.signers;

  await sys.rankReward.setRank(q5.address, 5);
  await sys.rankReward.setRank(q6.address, 6);
  await sys.rankReward.setRank(q7.address, 7);
  await sys.rankReward.setRank(q8.address, 8);

  r.check("Forest points = 1", (await sys.communityBuilder.userPoints(q5.address)) === 1n);
  r.check("Biome points = 2", (await sys.communityBuilder.userPoints(q6.address)) === 2n);
  r.check("Ecosphere points = 3", (await sys.communityBuilder.userPoints(q7.address)) === 3n);
  r.check("Genesis points = 4", (await sys.communityBuilder.userPoints(q8.address)) === 4n);
  r.check("Total points = 10", (await sys.communityBuilder.totalPoints()) === 10n);

  const pool = 1000n;
  await sys.mockBTCB.transfer(await sys.treasury.getAddress(), pool);
  await sys.treasury.creditCommunityBuilderFund(pool);

  for (const u of [q5, q6, q7, q8]) {
    await sys.incomeManager.startPackage(u.address, 1_000_000n);
  }

  await sys.communityBuilder.startDistributionRound();
  r.check("Pending q5 = 100", (await sys.communityBuilder.getPendingReward(q5.address)) === 100n);
  r.check("Pending q8 = 400", (await sys.communityBuilder.getPendingReward(q8.address)) === 400n);

  await sys.communityBuilder.connect(q8).claimCommunityReward();
  r.check(
    "q8 wallet got recycled 70% of 400",
    (await sys.mockBTCB.balanceOf(q8.address)) === netAfterRecycle(400n),
  );

  return r.finish();
}

/** 10. Tier Booster Simulator */
export async function simTierBooster(ethers: any): Promise<SimulatorReport> {
  const r = new ReportCollector("TierBoosterSimulator");
  const sys = await fresh(ethers);
  const [sponsor, direct] = sys.signers;

  await registerUser(sys.core, sponsor, null);
  await activatePackageUsd(sys.core, sys.mockBTCB, sponsor, sponsor, 50n);
  await registerUser(sys.core, direct, sponsor);
  await activatePackageUsd(sys.core, sys.mockBTCB, direct, sponsor, 50n);

  await sys.rankReward.setRank(sponsor.address, 1);
  await sys.rankReward.setRank(direct.address, 1);

  // Claim ROI to trigger Tier Booster
  await ethers.provider.send("evm_increaseTime", [86400]);
  await ethers.provider.send("evm_mine", []);

  const pending = await sys.interdependentReward.getPendingRoi(direct.address);
  r.check("Direct has pending ROI", pending > 0n);

  const sameBefore = await sys.rankReward.sameRankIncome(sponsor.address);

  await sys.interdependentReward.connect(direct).claimRoi();

  const sameAfter = await sys.rankReward.sameRankIncome(sponsor.address);
  const tierGross = sameAfter - sameBefore;
  r.check(
    "Tier Booster gross = 10% of direct income (Self ROI slice)",
    tierGross === (pending * 1000n) / 10000n,
    `tier=${tierGross} pending=${pending}`,
  );
  r.check(
    "Sponsor sameRankEarned tracks Tier Booster",
    (await sys.incomeManager.sameRankEarned(sponsor.address)) === tierGross,
  );

  // Different ranks → no tier
  const [, , other] = sys.signers;
  await registerUser(sys.core, other, sponsor);
  await activatePackageUsd(sys.core, sys.mockBTCB, other, sponsor, 50n);
  await sys.rankReward.setRank(other.address, 2);
  const sameMid = await sys.rankReward.sameRankIncome(sponsor.address);
  await ethers.provider.send("evm_increaseTime", [86400]);
  await ethers.provider.send("evm_mine", []);
  await sys.interdependentReward.connect(other).claimRoi();
  r.check(
    "No Tier Booster when ranks differ",
    (await sys.rankReward.sameRankIncome(sponsor.address)) === sameMid,
  );

  return r.finish();
}

/** 11. Income Recycling Simulator */
export async function simIncomeRecycling(
  ethers: any,
): Promise<SimulatorReport> {
  const r = new ReportCollector("IncomeRecyclingSimulator");
  const sys = await fresh(ethers);
  const user = sys.signers[1];

  await sys.treasury.setCoreContract(sys.owner.address);
  await sys.treasury.setWorkingPayer(sys.owner.address, true);
  await sys.treasury.setRewardContract(sys.owner.address);
  await sys.treasury.setCommunityBuilderContract(sys.owner.address);

  const packageAmount = 100000n;
  await sys.mockBTCB.transfer(await sys.treasury.getAddress(), packageAmount);
  await sys.treasury.processContribution(packageAmount);

  const gross = 10000n;
  const [userPayout, toRoi, toReserve, toCommunity] =
    await sys.treasury.previewRecycling(gross);
  r.check("User payout 70%", userPayout === 7000n);
  r.check("To ROI 25%", toRoi === 2500n);
  r.check("To reserve 3%", toReserve === 300n);
  r.check("To community 2%", toCommunity === 200n);

  const balBefore = await sys.mockBTCB.balanceOf(user.address);
  await sys.treasury.payWorkingIncome(user.address, gross);
  r.check(
    "Working payout recycled",
    (await sys.mockBTCB.balanceOf(user.address)) - balBefore === userPayout,
  );

  const bal2 = await sys.mockBTCB.balanceOf(user.address);
  await sys.treasury.paySelfRoi(user.address, gross);
  r.check(
    "Self ROI payout recycled",
    (await sys.mockBTCB.balanceOf(user.address)) - bal2 === userPayout,
  );

  await sys.mockBTCB.transfer(await sys.treasury.getAddress(), gross);
  await sys.treasury.creditCommunityBuilderFund(gross);
  const bal3 = await sys.mockBTCB.balanceOf(user.address);
  await sys.treasury.payCommunityBuilder(user.address, gross);
  r.check(
    "Community payout recycled",
    (await sys.mockBTCB.balanceOf(user.address)) - bal3 === userPayout,
  );

  return r.finish();
}

async function expectRevert(
  r: ReportCollector,
  name: string,
  fn: () => Promise<any>,
  contains: string,
) {
  try {
    await fn();
    r.check(name, false, "expected revert");
  } catch (e) {
    const msg = String((e as Error).message || e);
    r.check(name, msg.includes(contains), msg.slice(0, 120));
  }
}

export const ALL_SIMULATORS: {
  name: string;
  run: (ethers: any) => Promise<SimulatorReport>;
}[] = [
  { name: "ReferralTreeGenerator", run: simReferralTree },
  { name: "PackageSimulator", run: simPackage },
  { name: "PackageUpgradeSimulator", run: simPackageUpgrade },
  { name: "UnlimitedTopupSimulator", run: simUnlimitedTopup },
  { name: "SelfRoiSimulator", run: simSelfRoi },
  { name: "DirectIncome+ContributionReward", run: simDirectAndContribution },
  { name: "GrowthAcceleratorSimulator", run: simGrowthAccelerator },
  { name: "RankSimulator", run: simRank },
  { name: "CommunityBuilderSimulator", run: simCommunityBuilder },
  { name: "TierBoosterSimulator", run: simTierBooster },
  { name: "IncomeRecyclingSimulator", run: simIncomeRecycling },
];
