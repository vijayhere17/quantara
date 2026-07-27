# Phase 5 QA Simulator Report

Generated: 2026-07-27T13:47:27.503Z
Overall: **PASS**

| Simulator | Status | Passed | Failed |
|---|---|---:|---:|
| ReferralTreeGenerator | PASS | 8 | 0 |
| PackageSimulator | PASS | 11 | 0 |
| PackageUpgradeSimulator | PASS | 8 | 0 |
| UnlimitedTopupSimulator | PASS | 4 | 0 |
| SelfRoiSimulator | PASS | 5 | 0 |
| DirectIncome+ContributionReward | PASS | 5 | 0 |
| GrowthAcceleratorSimulator | PASS | 6 | 0 |
| RankSimulator | PASS | 5 | 0 |
| CommunityBuilderSimulator | PASS | 8 | 0 |
| TierBoosterSimulator | PASS | 4 | 0 |
| IncomeRecyclingSimulator | PASS | 7 | 0 |

## Details

### ReferralTreeGenerator — PASS

- PASS: Depth in 1–9 (2)
- PASS: Directs per user in 1–5 (2)
- PASS: Enough Hardhat signers for tree (need=7 have=20)
- PASS: Root depth 0
- PASS: Flat size matches used
- PASS: Leaf depth equals requested depth
- PASS: Root registered
- PASS: Child sponsor = parent

### PackageSimulator — PASS

- PASS: Next package is $50 (50)
- PASS: Next cycle is 1
- PASS: Cannot skip to $100 (VM Exception while processing transaction: reverted with reason string 'Invalid package sequence')
- PASS: Activated $50
- PASS: Cycle 1
- PASS: Principal set
- PASS: ROI Pool = 30% unsplit
- PASS: Reserve = 0 on activation
- PASS: Community = 0 on activation
- PASS: Charity = 5% of working side
- PASS: Working + charity + ROI = payment

### PackageUpgradeSimulator — PASS

- PASS: Cannot activate again before complete (VM Exception while processing transaction: reverted with reason string 'Complete current package first')
- PASS: After C1 complete → $50 C2
- PASS: After $50 C2 → $100 C1
- PASS: Next is $100 C1
- PASS: Next is $100 C2
- PASS: Next is $300 C1
- PASS: Next is $300 C2
- PASS: Unlocked $500 after two $300 activations

### UnlimitedTopupSimulator — PASS

- PASS: After $10000 C2 → unlimited $10000 C2
- PASS: Unlimited top-up #1 still $10000 C2
- PASS: Unlimited top-up #2 still $10000 C2
- PASS: Unlimited top-up #3 still $10000 C2

### SelfRoiSimulator — PASS

- PASS: Pending ROI > 0 after 1 day (8333333333333)
- PASS: Wallet +net after recycle
- PASS: IncomeManager roiEarned = gross
- PASS: Reserve credited from recycle
- PASS: ROI pool decreased net of recycle

### DirectIncome+ContributionReward — PASS

- PASS: Root L1 contribution = 5%
- PASS: Root contributionEarned = L1 gross
- PASS: U1 L1 = 5%
- PASS: Root L2 = 3%
- PASS: Root L3 = 2%

### GrowthAcceleratorSimulator — PASS

- PASS: 50:50 volume >= 1000 (1800)
- PASS: Growth Accelerator active
- PASS: L1 BPS = 10% while GA active
- PASS: New direct pays L1 at 10% (GA replace) (delta=83333333333333 expect=83333333333333)
- PASS: 50:50 formula 1500/1500 → 3000
- PASS: 50:50 formula 2000/500 → 1000

### RankSimulator — PASS

- PASS: Seed BPS 10%
- PASS: Sprout BPS 15%
- PASS: Genesis BPS 45%
- PASS: Seed qualification reachable
- PASS: Auto rank >= Seed (1)

### CommunityBuilderSimulator — PASS

- PASS: Forest points = 1
- PASS: Biome points = 2
- PASS: Ecosphere points = 3
- PASS: Genesis points = 4
- PASS: Total points = 10
- PASS: Pending q5 = 100
- PASS: Pending q8 = 400
- PASS: q8 wallet got recycled 70% of 400

### TierBoosterSimulator — PASS

- PASS: Direct has pending ROI
- PASS: Tier Booster gross = 10% of Self ROI (tier=833333333333 pending=8333333333333)
- PASS: Sponsor sameRankEarned tracks Tier Booster
- PASS: No Tier Booster when ranks differ

### IncomeRecyclingSimulator — PASS

- PASS: User payout 70%
- PASS: To ROI 25%
- PASS: To reserve 3%
- PASS: To community 2%
- PASS: Working payout recycled
- PASS: Self ROI payout recycled
- PASS: Community payout recycled
