# Quantara Full Production QA

Permanent on-chain ecosystem audit. Uses **only** functions and events that exist in `contracts/*.sol`.

## Run

```bash
# Terminal A
npx hardhat node

# Terminal B — deploy if needed
npx hardhat run scripts/deploy.ts --network localhost

# Optional: register + activate Hardhat account #1 for a richer report
npx hardhat run scripts/qa/seed-qa-user.ts --network localhost

# Full audit (local)
npx hardhat run scripts/qa/full-production-qa.ts --network localhost
# or
npm run qa:full

# Read-only Phase 1+2 terminal checklist (no state changes)
npm run qa:verify
# Helpers: qa:inspect:user | qa:inspect:tx | qa:inspect:treasury | qa:inspect:tree | qa:inspect:events
# See TERMINAL_VERIFY_CHECKLIST.md

# BSC Testnet / Mainnet (read-only audit against deployed-addresses.json)
npm run qa:bsc-testnet
npm run qa:bsc
```

## Env

| Variable | Purpose |
|----------|---------|
| `QA_WALLET` | Wallet to deep-audit (default: Hardhat #1) |
| `QA_API_BASE` / `APP_URL` | Laravel base for `/api/blockchain/config` + dashboard compare |
| `QA_FROM_BLOCK` | Event scan start (default `0`) |
| `DEPLOYED_ADDRESSES` | Override path to `deployed-addresses.json` |
| `TOKEN_ADDRESS` | Used at deploy time for real BEP-20 (not required for QA itself) |

## What it checks

Contract discovery · token (any BEP-20) · user · package ladder · wallet txs (from events) · real events only · balances · **exact** Phase 1 fund split (30% ROI pool unsplit + 70% working, 5% of working → charity) · Phase 2 income recycling (70/25/3/2) · Phase 3 Growth Accelerator (50:50 GV → L1 10% replace) · ROI · contribution L1–L3 · rank · community · ledgers · security · optional Laravel sync · BSC explorer base by chainId

## Notes

- There is **no** `Withdrawal` / `ROIStarted` / `DirectIncome` event in source — the script maps to real events (`RoiClaimed`, `ContributionRewardPaid`, `SelfRoiPaid`, etc.).
- `IncomeManager` principal / income amounts are **token wei** (from `startPackage(tokenAmount)`), while `users.packageAmount` is **USD**.
- `getNextEligiblePackage` reverts with `Complete current package first` until income caps complete — reported as locked, not a FAIL.
- MockBTCB is local-only; on BSC the address book uses `Token` / `core.btcbToken()`.
