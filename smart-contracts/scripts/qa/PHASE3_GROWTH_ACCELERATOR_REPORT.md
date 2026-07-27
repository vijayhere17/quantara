# Phase 3 — Growth Accelerator

## Summary

Growth Accelerator replaces the old additive booster:

| Before | After |
|--------|--------|
| Qualify by activating $1000/$3000 in 30 days | Qualify with **1000 or 3000 BV** via **50:50** group volume in 30 days (min = 1000) |
| Extra **additive** 10% Direct reward | L1 Direct Income **becomes 10%** (replaces 5%) for 30 days |
| `processDirectContribution` paid Booster income | No-op — payout is only via `ContributionReward` |

## 50:50 formula

```
eligibleGV = 2 * min(strongestLeg, remainingLegs)
```

Examples:
- Legs 500 / 500 → eligible **1000** → qualifies
- Legs 1500 / 700 / 500 / 300 → eligible **3000** → qualifies

## Contracts modified

| File | Change |
|------|--------|
| `ContributionBooster.sol` | Volume tracking, 50:50 qualify, no additive pay |
| `ContributionReward.sol` | `LEVEL_1_GA_BPS=1000`; `getLevel1Bps`; booster wiring |
| `IContributionBooster.sol` | `isBoosterActive`, `getFiftyFiftyVolume` |
| `BTCPlanCore.sol` | Record volume + GA qualify **before** contribution payouts |
| Deploy / test harnesses | `contributionReward.setContributionBooster` |

## QA

```bash
cd smart-contracts
npm test
```

## Out of scope

- Tier Booster (Self ROI only) — Phase 4
- Full simulator suite — Phase 5
