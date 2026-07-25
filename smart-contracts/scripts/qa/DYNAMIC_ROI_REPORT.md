# Dynamic ROI Business Rule — Implementation Report

**Branch:** `cursor/dynamic-roi-bps-2270`  
**Contract:** `InterdependentReward.sol`

## Business rule

| Rule | Implementation |
|------|----------------|
| Daily pool | `5%` of current ROI (interdependent) wallet via `TreasuryManager.getAvailableDailyRoiBudget()` |
| Rate formula | `(dailyPool * 10000) / totalActivePrincipal` |
| Minimum | `MIN_DAILY_ROI_BPS = 10` → **0.10%** |
| Maximum | `MAX_DAILY_ROI_BPS = 100` → **1.00%** |
| Day cap | `claimRoi` pays from `dailyBudget`; total paid ≤ 5% pool |
| Funding | Only `treasury.paySelfRoi` — never minted |
| Lifetime cap | Unchanged: **3X** principal via `IncomeManager` |

## Unchanged (intentionally)

- Registration / package activation
- Referral + contribution rewards
- Treasury activation split (30 / 25 / 3 / 2 / 40)

## QA

```bash
npx hardhat test mocha test/InterdependentReward.ts
FORCE_DEPLOY=1 npm run bootstrap:demo
npm run qa:phase2
npm run qa:phase3   # asserts dynamic clamp, not fixed 1%
```
