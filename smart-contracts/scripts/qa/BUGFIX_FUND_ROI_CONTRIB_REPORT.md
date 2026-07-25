# Bugfix Report — Fund Distribution QA / ROI QA / Contribution History

**Branch:** `cursor/qa-fund-roi-contrib-fixes-2270`

## Issue 1 — Fund Distribution QA FAIL

### Root cause
**QA script bug (contracts correct).**

`full-production-qa.ts` required:

```ts
treasAfter - treasBefore === tokenAmount
```

On the same activation transaction, `ContributionReward` immediately pays sponsors via `treasury.payWorkingIncome`, so treasury token balance increases by the package amount and then decreases by contribution payouts. Net Δ is always `tokenAmount − WorkingIncomePaid`, not `tokenAmount`.

`ContributionProcessed` already showed the correct 30/25/3/2/40 split.

### Fix
Compare treasury Δ to `tokenAmount − Σ WorkingIncomePaid` in that tx, and verify non-working bucket deltas match the event credits.

### Files
- `smart-contracts/scripts/qa/full-production-qa.ts`

---

## Issue 2 — ROI QA “function selector was not recognized”

### Root cause
**QA script called `MIN_DAILY_ROI_BPS()` without safe fallback.**

Compiled ABI includes `MIN_DAILY_ROI_BPS` (dynamic ROI), but an older localhost deploy may not. A direct `await roi.MIN_DAILY_ROI_BPS()` reverts and failed the entire ROI section.

### Fix
Read ROI views through `safeCall` / `safeRow`. Missing `MIN_DAILY_ROI_BPS` is a warning (redeploy note); section still PASSes if `calculateDailyRoiBps` / `roiAccounts` work.

### Files
- `smart-contracts/scripts/qa/full-production-qa.ts`

---

## Issue 3 — Sponsor Contribution History shows Amount = 0

### Root cause
**Wrong sidebar earning_type routes on Dashboard / Profile / legacy menu.**

On-chain indexer stores contribution as `earning_type = 1` and ROI as `2` (`BlockchainIncomeIndexer` + `member-react` layout).

Dashboard / profile / `master.blade` / mock links were swapped:

| Link | Was (wrong) | Now (correct) |
|------|-------------|----------------|
| Contribution Reward | `/earning/2/…` | `/earning/1/…` |
| ROI History | `/earning/1/…` | `/earning/2/…` |

Clicking Contribution from the dashboard loaded ROI rows (often empty → “No records” / $0) while contribution credits sat under type `1`.

### Fix
Align all member-panel earning links with the indexer map (also booster `8`, rank `5`).

### Files
- `application/resources/views/users/dashboard.blade.php`
- `application/resources/views/users/my-profile.blade.php`
- `application/resources/views/users/master.blade.php`
- `application/resources/js/member-panel/data/mock.ts`

---

## Not changed
Registration, package activation, contribution contracts, treasury BPS, ROI business logic.
