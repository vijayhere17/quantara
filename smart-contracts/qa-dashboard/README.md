# Quantara Internal QA Dashboard

Professional **SPA** for developers, QA, and client demos. Every action calls **real** Hardhat-deployed Solidity contracts — no mocked balances or fake events.

Open: **http://localhost:5173**

## Prerequisites

- Node.js 20+
- From repo: `smart-contracts/` dependencies installed (`npm install`)

## Quick start

```bash
# Terminal 1 — local chain
cd smart-contracts
npx hardhat node

# Terminal 2 — compile, deploy, sync ABIs/addresses, start UI
cd smart-contracts
npm run qa:dashboard:setup
npm run qa:dashboard
```

Or step by step:

```bash
cd smart-contracts
npm install
npx hardhat build
npx hardhat run scripts/deploy.ts --network localhost
npm run qa:dashboard:sync
cd qa-dashboard && npm install && npm run dev
```

The Vite server prints `http://localhost:5173`. The UI loads `public/deployed-addresses.json` and talks to `http://127.0.0.1:8545` (chainId `31337`).

## What you can do

| Area | Actions |
|------|---------|
| Overview | Live pool / income / user stats |
| Users | Create 1–500 users, register, activate, upgrade |
| Tree | Interactive React Flow referral tree |
| Packages | Full ladder + unlimited $10000 top-up (on-chain) |
| ROI | Pool, daily budget, claim, time-travel claim |
| Income | Self ROI, Direct, Contribution, Rank, GA, Tier, Community |
| Rank / GA / Tier / Community | Live qualification & reward checks |
| Recycling | 70 / 25 / 3 / 2 preview + treasury totals |
| Events / Txs | Contract logs + dashboard tx history |
| Reports | One-click Complete QA (PASS/FAIL) + JSON/CSV export |
| Demo | Animated client demo walkthrough |
| Reset | Local session + Hardhat reset helpers |
| Client / Developer modes | Hide or show technical tabs |

## Environment

Optional `qa-dashboard/.env`:

```
VITE_RPC_URL=http://127.0.0.1:8545
VITE_CHAIN_ID=31337
```

## Notes

- Uses Hardhat account #0 as deployer/root/funder (standard test key).
- “Force complete package” (upgrade unlock) impersonates an authorized contract on the local node to hit ROI 3× — local QA only.
- After every redeploy, run `npm run qa:dashboard:sync` so the UI picks up new addresses/ABIs.
- `npm run qa:simulators` remains available for headless PASS/FAIL sims.
