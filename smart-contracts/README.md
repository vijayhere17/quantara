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
  └── 25% ROI / 3% Reserve / 2% Community / 70% Working (65% + 5% charity)

IncomeManager  ← single source of truth for income + caps
  ├── ROI cap: 3X principal
  ├── Total cap: 4X principal (ROI + Contribution + Booster + Rank + Community)
  └── notifies BTCPlanCore.completePackage on cap

Reward calculators (no cap duplication):
  InterdependentReward → IncomeManager + Treasury.paySelfRoi
  ContributionReward   → IncomeManager + Treasury.payWorkingIncome
  ContributionBooster  → IncomeManager + Treasury.payWorkingIncome
  RankReward           → IncomeManager + Treasury.payWorkingIncome
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
npx hardhat run scripts/deploy.ts
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

See `scripts/deploy.ts`.
