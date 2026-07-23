# Quantara FINAL PRODUCTION QA Report

Date: 2026-07-23  
Branch: `cursor/final-registration-qa-2270`

## Verdict

Registration MetaMask lifecycle is corrected so **`approve_tx_hash` is never NULL**.  
Laravel rejects registration/activation without a verified on-chain Approval whose amount covers the package payment.  
Hardhat: **33/33 passing**. Treasury BPS **30/25/3/2/40** unchanged.

## Registration lifecycle (enforced)

1. Connect wallet  
2. MetaMask `register(sponsor)` → mined → verify `UserRegistered`  
3. MetaMask ERC-20 `approve(core, tokenAmount)` → **always** → mined → Approval event  
4. MetaMask `activatePackage(50)` → mined → verify `PackageActivated`  
5. Laravel verifies register + **approve (≥ package tokenAmount)** + package  
6. Persist user (`transaction_hash`, `approve_tx_hash`, `package_tx_hash`) + ledger  
7. Auto-login → dashboard  

Resume path recovers prior Approval via logs or forces a new approve — never returns null.

## Bugs found → fixed

| # | Bug | Fix |
|---|-----|-----|
| 1 | Approve skipped when allowance already sufficient → `approve_tx_hash` NULL | `ensureTokenApproval()` always opens MetaMask |
| 2 | Laravel treated approve as optional | `approve_tx_hash` required + `verifyApprovalTransaction` |
| 3 | Approve amount not enforced from chain | Verify package first; require Approval ≥ `tokenAmountHex` |
| 4 | Approve hash reusable | Reject reuse + unique index on ledger |
| 5 | Offline Daily ROI paid on `blockchain:` stakes (double income) | Skip those rows in `runDailyROI` |
| 6 | Withdrawal OTP backdoor `346789` | Removed; email OTP + React 2-step flow |
| 7 | No income event indexer | `blockchain:sync-income` + cursor table |
| 8 | No CAT root/kit seed | `quantara:seed-demo-qa` (local/testing; no fake txs) |

## SQL (if migrate cannot run)

```bash
# Prefer:
php artisan migrate

# Or:
mysql … < application/database/sql/2026_07_23_unique_approve_tx_hash.sql
# Plus full repair if needed:
mysql … < application/database/sql/REPAIR_ALL_MIGRATIONS.sql
```

## Demo / CAT

```bash
# Local Hardhat demo (ROI / ranks / pools on-chain)
cd smart-contracts && npm run demo:harness

# Laravel root sponsor + kits (no fake hashes)
php artisan quantara:seed-demo-qa

# Mirror on-chain incomes into ledgers
php artisan blockchain:sync-income
```

## GMP / BigInteger

Fatal `Call to undefined function App\Services\gmp_init()` was caused by bare `gmp_*` calls inside the `App\Services` namespace (PHP looks for a namespaced function).  

All wei math now goes through `App\Services\BigInteger` (GMP → BCMath → pure PHP). See `docs/SERVER_REQUIREMENTS.md`.

## Wallet login

Login is **Connect Wallet + MetaMask personal_sign** only — no email/password on the login page.


1. Binary tree placement still skipped on Web3 register (referral uplines only).  
2. Contract HIGH notes: community partial-claim burn; same-rank $0 achievement burn; total-3X via working may delay package unlock until working 4X.  
3. Production must use real BTCB + Chainlink — never Mock* on mainnet.  
4. Mail must be configured for withdrawal OTP in non-local environments.

## Hardhat

```
npm test  →  33 passing
```
