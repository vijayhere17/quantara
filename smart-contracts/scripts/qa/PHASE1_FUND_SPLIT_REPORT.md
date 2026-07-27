# Phase 1 — Activation Fund Split

## Summary

Activation contributions now keep the **entire 30%** in the ROI Pool (unsplit). Working side remains **70%**, with **5% of that working side** to charity (~3.5% of package) and ~66.5% to working incomes.

Reserve and Community Builder are **not** funded on activation (deferred to Phase 2 income recycling).

## Charity rule (confirmed)

**Option A:** `charity = 5% × workingSide` where `workingSide ≈ 70%` of package.

## Contracts modified

| File | Change |
|------|--------|
| `contracts/TreasuryManager.sol` | `INTERDEPENDENT_BPS = 3000`; activation credits only ROI + working + charity; owner `creditReserveFund` / `creditCommunityBuilderFund` for tests / pre-recycling |
| `ARCHITECTURE.md` | Document Phase 1 BPS |
| Tests + QA scripts | Expect 30% ROI / 0 reserve / 0 community / charity / working |

## Expected split (example $100)

| Bucket | Amount |
|--------|--------|
| ROI Pool | $30.00 |
| Charity | $3.50 |
| Working incomes | $66.50 |
| Reserve | $0 (activation) |
| Community | $0 (activation) |

## QA

```bash
cd smart-contracts
npm test
npm run qa:phase1   # after local deploy
```

## Out of scope (later phases)

- Income recycling on payouts
- Growth Accelerator semantics
- Tier Booster (ROI-only)
- Full simulator suite
