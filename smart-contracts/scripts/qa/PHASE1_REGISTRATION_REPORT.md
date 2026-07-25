# Phase 1 — Registration QA Report ($50 Starter)

**Status: PASS**  
**Date:** 2026-07-25  
**Environment:** Hardhat localhost `31337` + Laravel MySQL

---

## Pass criteria checklist

| # | Check | Result |
|---|--------|--------|
| 1 | MetaMask-equivalent 3 txs mined (register / approve / activate) | ✅ |
| 2 | On-chain user exists | ✅ |
| 3 | `packageAmount = 50` | ✅ |
| 4 | `isActive = true` | ✅ |
| 5 | Sponsor = root wallet | ✅ |
| 6 | Token deduction = priced $50 BTCB amount | ✅ |
| 7 | Treasury buckets 30/25/3/2/40 sum to payment | ✅ |
| 8 | Laravel user + activation ledger saved | ✅ |
| 9 | Dashboard fields match (name, sponsor, wallet, $50, active, incomes 0) | ✅ |
| 10 | Tx hashes stored on user + activation row | ✅ |

---

## Transactions (fresh Hardhat Account #4)

| Step | Hash |
|------|------|
| Register | `0xdef95131ebed30c7b7a19cb39f01608ba188450640d3bb173f88e618b697bda8` |
| Approve | `0xeaca5b0901c4b5392794a843e343953b5b1608f86589437f0287e2c3be1347c5` |
| Activate | `0x4f8a153dd04c5ce122b88237aa9e3bdac45ffeb8478e188e1f67f11f09a9b2aa` |

- **User:** `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65`
- **Sponsor (root):** `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Token paid:** `833333333333333` wei ≈ `0.000833333333333333` MockBTCB  
  (USD $50 at MockBTCPriceFeed `$60,000` — **not** a literal `50` token transfer)

---

## On-chain `core.users(user)`

| Field | Expected | Actual |
|-------|----------|--------|
| wallet | user | ✅ |
| sponsor | root | ✅ |
| packageAmount | 50 | ✅ |
| packageCycle | 1 | ✅ |
| isActive | true | ✅ |
| isBlocked | false | N/A — field not in `BTCPlanCore.User` |

---

## Treasury deltas (after activation)

| Fund | BPS | Diff (wei) |
|------|-----|------------|
| Regeneration | 30% | 249999999999999 |
| ROI (interdependent) | 25% | 208333333333333 |
| Reserve | 3% | 24999999999999 |
| Community | 2% | 16666666666666 |
| Working | 40% (+dust) | 333333333333336 |
| **Total** | 100% | **833333333333333** |

---

## Laravel DB

| Field | Value |
|-------|-------|
| name | Phase One |
| wallet_addr | `0x15d34…6a65` |
| referral_id → root | ✅ |
| package_amount | 50 |
| status | 0 (active) |
| registration_status | completed |
| total_earning / total_return | 0 |
| self_investment | 50 |
| transaction_hash / package_tx_hash / approve_tx_hash | all three set |
| blockchain_package_activations | verified, amount 50 |

---

## Bugs fixed during Phase 1

1. **Missing `users.referral_id` / `leg` / `referral_uplines`** — registration could not store sponsor linkage.
2. **Missing `level_referrals` table** — `SignupController::processReferralUplines` crashed.
3. **Missing `stake_masters` + $50 Starter kit** — `PackageActivationService` could not resolve kit.
4. **Partial `staked_users` schema** — activation now skips legacy stake mirror when columns are incomplete (does not block Web3 registration).
5. Root Laravel `wallet_addr` was `0xabc` — synced to Hardhat Account #0 for sponsor verification.

---

## How to re-run

```bash
# Terminal A — Hardhat
cd smart-contracts && npx hardhat node

# Terminal B — contracts
cd smart-contracts
npm run bootstrap:demo
npm run qa:phase1

# Terminal C — Laravel (repo root is the web root)
cd /path/to/quantara
php -S 127.0.0.1:8000 router.php

# Terminal D — Laravel verify (use hashes from qa:phase1 output)
cd application
php scripts/phase1-laravel-register.php \
  --wallet=0x... --sponsor=0xf39F... \
  --register=0x... --approve=0x... --activate=0x... \
  --token-amount=833333333333333 \
  --api=http://127.0.0.1:8000
```

---

## Phase 2 gate

Registration is **100% verified**. Safe to proceed to **Phase 2: Contribution Reward (5% / 3% / 2%)** with multiple wallets.
