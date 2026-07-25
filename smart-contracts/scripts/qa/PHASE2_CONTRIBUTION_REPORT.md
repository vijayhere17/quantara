# Phase 2 — Contribution Reward QA Report

**Status: PASS**  
**Date:** 2026-07-25  
**Branch:** `cursor/phase2-contribution-qa-2270`

## Scope

Verify Level 1/2/3 contribution rewards (5% / 3% / 2%) after Phase 1 Registration passed. **ROI not tested.**

Tree:

```
Root
 └── User1
      └── User2
           └── User3
```

All activate the **$50** package (MockBTC feed **$60,000**).

## Expected USD totals (Steps 1–3)

| User  | Contribution Income |
| ----- | ------------------: |
| Root  |                5.00 |
| User1 |                4.00 |
| User2 |                2.50 |
| User3 |                0.00 |

Breakdown:

- User1 activate → Root L1 **5% = $2.50**
- User2 activate → User1 L1 **$2.50**, Root L2 **$1.50**
- User3 activate → User2 L1 **$2.50**, User1 L2 **$1.50**, Root L3 **$1.00**

Token amounts (wei): L1 `41666666666666`, L2 `24999999999999`, L3 `16666666666666`.

## On-chain result

```
npm run qa:phase2
→ PHASE 2 RESULT: ✅ PASS
→ Checks: 45/45 passed
```

| Check | Result |
| ----- | ------ |
| L1/L2/L3 percentages | PASS |
| ContributionRewardPaid events (params + counts) | PASS |
| IncomeManager contribution mapping | PASS |
| Final totals $5 / $4 / $2.50 / $0 | PASS |
| Edge1 inactive sponsor earns 0 | PASS |
| Edge2 blocked sponsor | N/A (no on-chain `isBlocked`) |
| Edge3 no sponsor walk stops at `address(0)` | PASS |
| Edge4 duplicate `activatePackage` reverts | PASS |
| Edge5 open package blocks next until complete | PASS |

## Laravel / DB / dashboard result

```
php application/scripts/phase2-laravel-contribution.php --api=http://127.0.0.1:8000
→ PHASE 2 LARAVEL: PASS
```

| User  | ewallet Contribution (Steps 1–3 txs) | Events |
| ----- | -----------------------------------: | -----: |
| Root  |                                 5.00 |      3 |
| User1 |                                 4.00 |      2 |
| User2 |                                 2.50 |      1 |
| User3 |                                 0.00 |      0 |

- Steps 1–3 mirrored **exactly 6** `ContributionRewardPaid` logs (1+2+3)
- User3 activation mirrored **3** logs
- No `WorkingIncomePaid` double-credits on those txs
- Dashboard earning stream (`earning_type = 1`, Contribution descriptions) matches blockchain for Steps 1–3

## Bugs fixed in this phase

### 1. Multi-level rewards dropped (critical)

`BlockchainLedgerService::recordIncomeMirror` deduped by `(tx_hash + income_type)`, so L2/L3 on the same activation tx were discarded.

**Fix:** Deduplicate only on `(tx_hash, log_index)` and tag ledger descriptions with `log:{index}`.

### 2. WorkingIncomePaid double-credit (critical)

`TreasuryManager.payWorkingIncome` emits `WorkingIncomePaid` for every contribution/booster/rank payout. The indexer also mirrored the typed `ContributionRewardPaid` event → **2× dashboard credit** (Root showed $13 instead of $5 for Steps 1–3 + edge working duplicates).

**Fix:** Stop indexing `WorkingIncomePaid`. Typed reward events remain the ledger source of truth.

### 3. Supporting

- Null-safe `getcoinrate()` default **60000** (matches MockBTCPriceFeed)
- Migration for `ewallet_logs` + `coin_rate_masters`
- Richer ContributionRewardPaid labels: `Contribution L{n} {bps}% from {wallet}`

## How to re-run

```bash
# Terminal A
cd smart-contracts && npx hardhat node

# Terminal B
cd smart-contracts && FORCE_DEPLOY=1 npm run bootstrap:demo
cd ../application && php artisan migrate --force

# Terminal C (repo root)
php -S 127.0.0.1:8000 router.php

# QA
cd smart-contracts
QA_LARAVEL=1 QA_API_BASE=http://127.0.0.1:8000 npm run qa:phase2
cd ../application
php scripts/phase2-laravel-contribution.php --api=http://127.0.0.1:8000
```

## Gate for Phase 3 (ROI)

| Criterion | Status |
| --------- | ------ |
| Correct percentages (5% / 3% / 2%) | ✅ |
| No duplicate rewards (ledger) | ✅ |
| Correct blockchain events | ✅ |
| Correct database records | ✅ |
| Dashboard matches blockchain (Steps 1–3) | ✅ |
| Transaction history correct | ✅ |
| Multi-level totals exact | ✅ |

**Phase 2 is complete. Safe to proceed to Phase 3 (ROI).**
