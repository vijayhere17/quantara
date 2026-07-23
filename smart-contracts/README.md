# Quantara — Blockchain

BNB Smart Chain (BEP-20) smart contracts for the Quantara package / reward platform.

## Stack

- Hardhat 3 + ethers.js v6 + Mocha
- OpenZeppelin Contracts v5 (ERC-20 / BEP-20 compatible)
- Solidity `0.8.28`

## Networks

| Network | Chain ID | Hardhat name |
|---------|----------|--------------|
| Hardhat local | 31337 | `localhost` |
| BSC Testnet | 97 | `bscTestnet` / `bnbTestnet` |
| BSC Mainnet | 56 | `bsc` / `bscMainnet` |

Environment (see `.env.example`):

```
BSC_RPC_URL=
BSC_TESTNET_RPC_URL=
PRIVATE_KEY=
CHAIN_ID=
TOKEN_ADDRESS=
TREASURY_WALLET=
PRICE_FEED_ADDRESS=
CHAINLINK_BTC_USD=
```

## Token (BEP-20)

Production deployments **never** use MockBTCB. Set `TOKEN_ADDRESS` to any BEP-20:

- USDT / USDC / custom Quantara token / Wrapped BTC / Wrapped BNB

`BTCPlanCore.getBTCBAmountFromUSD` reads `decimals()` dynamically — do not hardcode 18.

Local Hardhat still auto-deploys MockBTCB when `TOKEN_ADDRESS` is empty.

## Price feed

- Local: MockBTCPriceFeed
- BSC: set `CHAINLINK_BTC_USD` (aggregator) → deploys `ChainlinkBTCPriceFeed` adapter
  - or set `PRICE_FEED_ADDRESS` to an existing `IBTCPriceFeed`

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
npm run deploy     # terminal 2 — local MockBTCB + wire + root
npm run deploy:bsc-testnet   # requires TOKEN_ADDRESS + price feed env
npm run deploy:bsc
npm run bootstrap:root   # root + fund Hardhat accounts #1–#3
npm run bootstrap:demo   # deploy (if needed) → root → fund → print balances
npm run qa:full
npx hardhat run scripts/testFlow.ts
npx hardhat run scripts/testIncomeCap.ts
```

Deploy writes `deployed-addresses.json` (Token, core, treasury, rewards, chainId, explorer).

## Deploy order

1. Token (env `TOKEN_ADDRESS` or MockBTCB locally) + price feed
2. IncomeManager
3. TreasuryManager
4. BTCPlanCore
5. InterdependentReward / ContributionReward / ContributionBooster / RankReward
6. CommunityBuilder
7. Wire setters + IncomeManager authorizations + Treasury working payers
8. Verify ownership
9. **Bootstrap root user** — deployer calls `BTCPlanCore.register(address(0))`

See `scripts/deploy.ts` and `scripts/bootstrap-root.ts`.

## Genesis / root user (required)

`BTCPlanCore` constructor only sets `owner`. It does **not** write `users[owner]`.

Intended flow:

1. Fresh deploy + wire
2. Deployer/owner calls `register(address(0))` → becomes root
3. New members call `register(rootWallet)` → sponsor check passes
4. Members approve BEP-20 + `activatePackage(50)`

After bootstrap, set your Laravel sponsor/admin `username` / `wallet_addr` to the root wallet printed by deploy.

## Local demo faucet (Hardhat only)

```bash
npx hardhat node
npm run bootstrap:demo
```

Signup shows **Get Demo BTCB** only when `BLOCKCHAIN_CHAIN_ID=31337` and `APP_ENV=local`.

## Explorers

- Mainnet: `https://bscscan.com/tx/`
- Testnet: `https://testnet.bscscan.com/tx/`
