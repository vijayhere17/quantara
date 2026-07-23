# Quantara Architecture Notes (post–gap closure)

## Caps (independent)

| Stream | Cap | Includes |
|--------|-----|----------|
| ROI | 3X principal | ROI only |
| Working | 4X principal | Contribution, Booster, Rank, SameRank, Community |

ROI does **not** reduce Working room. Working does **not** reduce ROI room.

Progression unlock (`packageCompleted`): first of ROI-cap or Working-cap.  
Final income shutdown (`packageActive=false`): both caps exhausted.

## Same Rank — total eligible income

When a user receives accepted income of type ROI / Contribution / Booster / Rank / Community, their direct same-rank sponsor receives **10%** of that accepted amount (IncomeType.SameRank). SameRank does not re-trigger itself.

## Rank multipliers (architecture only)

`RankReward.getIncomeCapMultiplier`: Q3→5, Q5→6, Q7→7, else 3.  
`IncomeManager.applyRankCapMultipliers` defaults to **false**.

**Clarification still required before enabling:** do multipliers scale ROI cap, Working cap, or both?

## Treasury BPS

25% ROI / 3% Reserve / 2% Community / 65% Working / 5% Charity (exact BPS; dust → Working).
