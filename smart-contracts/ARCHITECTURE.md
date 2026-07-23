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

## Treasury BPS (business plan)

| Bucket | BPS | % |
|--------|-----|---|
| Contract Regeneration | 3000 | 30% |
| Interdependent (ROI) | 2500 | 25% |
| Reserve | 300 | 3% |
| Community Builder | 200 | 2% |
| Working | 4000 | 40% |

Dust from flooring → Working.  
Reserve withdrawable by owner. Regeneration transferable to configured wallet.

## Packages

50 → 100 → 300 → 500 → 1000 → 3000 → 5000 → 10000  
Each (except unlimited 10000 after C2) allows **2 cycles** then next amount. No skip / no downgrade.
