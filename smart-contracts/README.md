# Quantara — Blockchain

BNB Smart Chain smart contracts for the Quantara package / reward platform.

## Stack

- Hardhat 3 + ethers.js v6 + Mocha
- OpenZeppelin Contracts v5
- Solidity `0.8.28`

## Architecture

```
BTCPlanCore
  ├── registration / sponsor tree
  ├── package activation & progression
  └── package completion (notified by IncomeManager)

TreasuryManager
  └── 30% Regeneration / 25% ROI / 3% Reserve / 2% Community / 40% Working

IncomeManager  ← single source of truth for income + caps
  ├── ROI cap: 3X principal (also stops when total income hits 3X)
  ├── Working cap: 4X principal (Contribution + Booster + Rank + SameRank + Community)
  └── notifies BTCPlanCore.completePackage on cap

Reward calculators (no cap duplication):
  InterdependentReward → IncomeManager + Treasury.paySelfRoi
  ContributionReward   → IncomeManager + Treasury.payWorkingIncome
  ContributionBooster  → IncomeManager + Treasury.payWorkingIncome
  RankReward           → IncomeManager + Treasury.payWorkingIncome (+ same-rank achievement)
  CommunityBuilder     → IncomeManager + Treasury.payCommunityBuilder
```

## Package progression

`50 C1 → 50 C2 → 100 C1 → 100 C2 → … → 10000 C1 → 10000 C2 → unlimited 10000 topups`

No skip, no downgrade. Next package validated on-chain.

## Commands

```bash
npm install
npx hardhat build
npx hardhat test mocha
npx hardhat node   # terminal 1
npm run deploy     # terminal 2 — deploys, wires, AND registers root
npm run bootstrap:root   # root + fund Hardhat accounts #1–#3
npm run bootstrap:demo   # deploy (if needed) → root → fund → print balances
npx hardhat run scripts/testFlow.ts
npx hardhat run scripts/testIncomeCap.ts
```

## Deploy order

1. MockBTCB + MockBTCPriceFeed (dev)
2. IncomeManager
3. TreasuryManager
4. BTCPlanCore
5. InterdependentReward / ContributionReward / ContributionBooster / RankReward
6. CommunityBuilder
7. Wire setters + IncomeManager authorizations + Treasury working payers
8. **Bootstrap root user** — deployer calls `BTCPlanCore.register(address(0))`

See `scripts/deploy.ts` and `scripts/bootstrap-root.ts`.

## Genesis / root user (required)

`BTCPlanCore` constructor only sets `owner`. It does **not** write `users[owner]`.

Sponsor validation:

```solidity
mapping(address => User) public users;

function register(address sponsor) external {
    // ...
    if (sponsor != address(0)) {
        require(users[sponsor].isActive, "Sponsor not registered");
    }
    // ...
}
```

Intended flow:

1. Fresh deploy + wire
2. Deployer/owner calls `register(address(0))` → becomes root (`users[root].isActive = true`)
3. New members call `register(rootWallet)` → sponsor check passes
4. Members approve BTCB + `activatePackage(50)`

Without step 2, every non-zero sponsor fails with "Sponsor not registered" (frontend: "Sponsor is not registered on-chain yet").

Do **not** bypass sponsor validation. Always bootstrap the root via `register(address(0))`.

After bootstrap, set your Laravel sponsor/admin `username` / `wallet_addr` to the root wallet printed by deploy / bootstrap.

## Local demo faucet (Hardhat only)

New wallets have **0 MockBTCB** until funded. Constructor mints supply only to the deployer.

```bash
npx hardhat node          # terminal 1
npm run bootstrap:demo    # deploy (if needed) → root → mint 1000 BTCB to accounts #1–#3
# or, on an existing deploy:
npm run bootstrap:root    # root + fund #1–#3
```

`MockBTCB.mint(address,uint256)` is used when available; otherwise tokens are transferred from the deployer.

The signup UI shows **Get Demo BTCB** only when `BLOCKCHAIN_CHAIN_ID=31337` and `APP_ENV=local`. It is never enabled in production.
