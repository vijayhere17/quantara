# Phase 4 — Tier Booster

## Summary

Tier Booster pays the sponsor **10% of a direct referral's Self ROI only** when both hold the **same non-None rank**.

| Before | After |
|--------|--------|
| Same-rank matching on ROI, Contribution, Rank, Community, … | **Self ROI only** |
| Rank income cascaded into same-rank | Cascade **removed** |
| Any `sameRankReporter` could call | **Reward contract only** (`InterdependentReward`) |

## Flow

```
Direct claims Self ROI
        ↓
RankReward.processTierBooster(direct, roiAmount)
        ↓
If sponsor.rank == direct.rank (and ≠ None)
        ↓
Sponsor earns 10% of that Self ROI slice
        ↓
Income recycling (Phase 2) → ~70% wallet
```

## Contracts modified

| File | Change |
|------|--------|
| `RankReward.sol` | `_processTierBooster`; reward-only callers; `TierBoosterPaid` event |
| `IRankReward.sol` | `processTierBooster` |
| `InterdependentReward.sol` | Calls `processTierBooster` after Self ROI |
| `ContributionReward.sol` | Removed same-rank on contribution |
| `CommunityBuilder.sol` | Removed same-rank on community claims |

Same-rank **achievement** bonus (one-time 10% of totalEarned on rank-up) is unchanged.

## QA

```bash
cd smart-contracts
npm test
```

## Out of scope

- Full QA simulator suite — Phase 5
