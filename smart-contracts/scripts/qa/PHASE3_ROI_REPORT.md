# Phase 3 — ROI Cycle QA Report

**Date:** 2026-07-25  
**Branch:** `cursor/phase3-roi-qa-2270`  
**Subject:** User1 `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`  
**Claim tx:** `0x7b017c62961a8a953579ba8b6a9591081a46cacb0d11f5925dab5d187f4e6bba`

## Existing ROI processor (identified)

| Item | Location |
|------|----------|
| Contract | `InterdependentReward.sol` |
| Claim entrypoint | `claimRoi()` |
| Pending view | `getPendingRoi(user)` |
| Daily rate | `calculateDailyRoiBps()` — max **100 bps (1%)** |
| Daily pool budget | `5%` of interdependent (ROI) fund via `TreasuryManager.getAvailableDailyRoiBudget()` |
| Payout | `TreasuryManager.paySelfRoi` → emits `SelfRoiPaid` |
| Typed event | `RoiClaimed(user, amount)` |
| Cap | `IncomeManager` — ROI **3X** principal; also soft-stops when total income hits 3X |
| One cycle | `evm_increaseTime(86400)` + one `claimRoi()` |
| Existing harness | `scripts/demo-harness.ts`, unit test `test/BTCPlanCore.ts` (increaseTime + claimRoi) |
| New QA command | `npm run qa:phase3` |

**No business-logic changes were made before this report.**

## Setup

```
FORCE_DEPLOY=1 npm run bootstrap:demo
npm run qa:phase2          # Phase 1+2 tree intact
npm run qa:phase3          # +1 day, claimRoi once (User1)
```

## On-chain results (36/36) — before any fix

| Check | Result | Notes |
|-------|--------|-------|
| Contracts deployed | ✅ PASS | Core / Token / Treasury / InterdependentReward / IncomeManager |
| Subject active, pkg=$50 | ✅ PASS | User1 |
| ROI account active, principal > 0 | ✅ PASS | `833333333333333` wei (~$50) |
| ROI cap = 3× principal | ✅ PASS | `2499999999999999` |
| Remaining ROI cap > 0 | ✅ PASS | Reduced by prior contribution toward total-3X stop |
| `roiEarned` before claim = 0 | ✅ PASS | Fresh package window |
| Pending before +1d = 0 | ✅ PASS | Same calendar day as activation |
| Daily BPS > 0 and ≤ 100 | ✅ PASS | **100** (1% capped) |
| After +1d pending = principal × bps / 10000 | ✅ PASS | `8333333333333` wei (**~$0.50**) |
| `claimRoi` SUCCESS | ✅ PASS | |
| `RoiClaimed` event | ✅ PASS | user + amount |
| `SelfRoiPaid` amount == claimed | ✅ PASS | treasury side-effect |
| `IncomeRecorded` accepted > 0 | ✅ PASS | IncomeType.ROI |
| User token +claimed | ✅ PASS | |
| Treasury token −claimed | ✅ PASS | |
| **ROI wallet (interdependent) −claimed** | ✅ PASS | other buckets unchanged |
| `totalSelfRoiPaid` +claimed | ✅ PASS | |
| IncomeManager `roiEarned` / `totalEarned` | ✅ PASS | |
| Remaining ROI cap −claimed | ✅ PASS | |
| Pending after claim = 0 | ✅ PASS | |
| Same-day second claim reverts | ✅ PASS | |
| Cap not exhausted after 1 day | ✅ PASS | |

**On-chain verdict: PASS**

## Laravel / DB results — before any fix

| Check | Result | Notes |
|-------|--------|-------|
| Indexer sync | ⚠ ran | scanned events for claim tx |
| `ewallet_logs` earning_type=2 for claim | ❌ FAIL | **2 rows**, sum **$1.00** (expected **~$0.50**) |
| Duplicate mirrors | ❌ FAIL | `On-chain self ROI` (SelfRoiPaid) **and** `On-chain ROI claim` (RoiClaimed) |
| `blockchain_income_events` | ❌ FAIL | 2 events for one economic payout |

**Root cause (confirmed):**  
`TreasuryManager.paySelfRoi` emits `SelfRoiPaid`; `InterdependentReward.claimRoi` also emits `RoiClaimed`.  
`BlockchainIncomeIndexer` indexes **both** as `earning_type = 2` → **2× dashboard ROI**.

Same class of defect as Phase 2 `WorkingIncomePaid` double-credit (already fixed by skipping that event).

## Fix applied (indexer only)

Skip indexing `SelfRoiPaid` in `BlockchainIncomeIndexer` (keep `RoiClaimed` as the typed source of truth).  
No Solidity / business-rule changes.

### Laravel / DB after fix

| Check | Result |
|-------|--------|
| ROI ewallet rows for claim tx | ✅ PASS — **1** row |
| ROI USD ≈ $0.50 | ✅ PASS |
| `blockchain_income_events` count | ✅ PASS — **1** |
| `PHASE 3 LARAVEL: PASS` | ✅ |

## Phase 1 / Phase 2 preservation

- Phase 2 tree + contribution totals unchanged by ROI claim (working/regen/reserve/community buckets unchanged on-chain).
- Fix is indexer-only; contribution path untouched (`WorkingIncomePaid` already omitted; `ContributionRewardPaid` unchanged).

## Cycle economics (this run)

| Metric | Value |
|--------|------:|
| Principal | ~$50 (0.000833… BTCB) |
| Daily BPS | 100 (1%) |
| 1-day ROI | **~$0.50** |
| ROI fund before | ~$62.50 |
| ROI fund after | −$0.50 |

## Final verdict

| Layer | Result |
|-------|--------|
| On-chain (1 ROI cycle) | ✅ **36/36 PASS** |
| Laravel ledger (after fix) | ✅ **PASS** |
| Business logic changed? | ❌ No |

**READY to continue Phase 3 edge cases / multi-day ROI when requested.**
