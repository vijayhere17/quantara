# Phase 2 — Income Recycling

## Summary

Every income payout now recycles before the user receives tokens:

| Destination | Share of gross |
|-------------|----------------|
| User wallet | ~70% (+ flooring dust) |
| ROI Pool | 25% |
| Reserve | 3% |
| Community Builder | 2% |

Applies to:

- Self ROI (`paySelfRoi`)
- Working incomes (`payWorkingIncome`) — contribution, booster, rank, same-rank, …
- Community Builder (`payCommunityBuilder`)

## Caps vs wallet

- `IncomeManager` still records the **gross** accepted amount (3X / 4X).
- Paid events (`SelfRoiPaid`, `WorkingIncomePaid`, `CommunityBuilderPaid`) emit the **net** transfer.
- New `IncomeRecycled` event emits the full breakdown.

## Contracts modified

| File | Change |
|------|--------|
| `TreasuryManager.sol` | `_recycleAndPay` / `previewRecycling`; all three payout paths |
| `ARCHITECTURE.md` | Document recycling BPS |
| Unit + QA scripts | Expect net wallet balances; verify recycle buckets |

## Example

Gross income `$100` → user `$70`, ROI `$25`, reserve `$3`, community `$2`.

## QA

```bash
cd smart-contracts
npm test
# after deploy:
npm run qa:phase1
npm run qa:phase2
npm run qa:phase3
```

## Notes

- Activation still does **not** fund reserve/community (Phase 1); recycling does.
- Self ROI net drain from ROI pool ≈ **75%** of gross (−100% +25% recycle).
- Includes Phase 1 fund-split commits (branch based on Phase 1).
