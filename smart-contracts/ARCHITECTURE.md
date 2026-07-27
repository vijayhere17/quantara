# Quantara Architecture Notes (production)

## Caps

| Stream | Cap | Includes | Stop rule |
|--------|-----|----------|-----------|
| ROI | 3X principal | ROI only | Also stops when **total income** hits 3X |
| Working | 4X principal | Contribution, Booster, Rank, SameRank, Community | Independent of ROI stream |

Progression unlock (`packageCompleted`): first of ROI-cap or Working-cap.  
Final income shutdown (`packageActive=false`): both caps exhausted.

## Same Rank

1. **Matching (ongoing):** 10% of each eligible income slice to direct same-rank sponsor.
2. **Achievement (one-time):** when a user first reaches a rank the sponsor already holds, sponsor receives 10% of the user's **totalEarned** at that moment. Deduped per `(user, sponsor, rank)`.

## Rank multipliers (architecture only)

`RankReward.getIncomeCapMultiplier`: Q3→5, Q5→6, Q7→7, else 3.  
`IncomeManager.applyRankCapMultipliers` defaults to **false**.

## Treasury BPS (activation — Phase 1)

| Bucket | BPS | % of package |
|--------|-----|--------------|
| ROI Pool (interdependent, unsplit) | 3000 | 30% |
| Working side (gross) | 7000 | 70% |
| → Charity (5% of working side) | — | ~3.5% |
| → Working incomes | — | ~66.5% |
| Reserve | 0 on activation | (Phase 2 recycling) |
| Community Builder | 0 on activation | (Phase 2 recycling) |
| Regeneration | 0 | not funded |

Dust from flooring → Working side.  
Reserve withdrawable by owner when later funded. Regeneration transferable if legacy balance remains.

## Growth Accelerator (Phase 3)

Contract: `ContributionBooster` (Growth Accelerator semantics).

| Rule | Value |
|------|-------|
| Qualification window | 30 days from registration |
| Requirement | **1000 or 3000** BV using **50:50** group volume (min threshold = 1000) |
| 50:50 formula | `2 * min(strongestLeg, remainingLegs)` |
| Reward window | 30 days after qualification |
| Direct Income while active | **10% L1** (replaces 5%, not additive) |
| After expiry | L1 returns to **5%** |

Volume is recorded in `ContributionBooster.processPackage` (USD package size).  
`ContributionReward.getLevel1Bps` reads `isBoosterActive` to choose 5% vs 10%.  
`processDirectContribution` is a no-op (no second payout).

## Income recycling (Phase 2)

Every payout (`paySelfRoi`, `payWorkingIncome`, `payCommunityBuilder`) splits the **gross** accepted amount:

| Destination | BPS | % |
|-------------|-----|---|
| User wallet | ~7000 | 70% (+ flooring dust) |
| ROI Pool | 2500 | 25% |
| Reserve | 300 | 3% |
| Community Builder | 200 | 2% |

`IncomeManager` caps (3X / 4X) still count the **gross** amount. Paid events emit the **net** user transfer. `IncomeRecycled` emits the full breakdown.

## Packages

50 → 100 → 300 → 500 → 1000 → 3000 → 5000 → 10000  
Each (except unlimited 10000 after C2) allows **2 cycles** then next amount. No skip / no downgrade.
