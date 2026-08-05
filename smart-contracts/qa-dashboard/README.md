# Quantara Internal QA Dashboard

Business-focused SPA for testing smart contracts on **Hardhat local** or **BSC Testnet**.

Open: **http://localhost:5173**

## BSC Testnet (client QA)

Prerequisites: contracts already deployed (`npm run deploy:bsc-testnet`) and
`deployed-addresses.json` filled with testnet addresses.

```bash
cd smart-contracts

# 1) Sync ABIs + addresses into the dashboard
npm run qa:dashboard:sync

# 2) Configure dashboard env
cd qa-dashboard
copy .env.example .env
# Edit .env — set VITE_DEPLOYER_PK to your testnet deployer key (0x + 64 hex)
# Keep VITE_CHAIN_ID=97 and VITE_RPC_URL as in the example

# 3) Install + run
npm install
npm run dev
```

Or from `smart-contracts` root:

```bash
npm run qa:dashboard:testnet
```

Header badge should show **BNB Smart Chain Testnet**.

### What works on testnet

| Feature | Testnet |
|---------|---------|
| Overview pools / totals | Yes |
| Create user (random wallet + fund tBNB + MockBTCB mint) | Yes |
| Register / Activate $50 | Yes (real txs, needs deployer tBNB) |
| Income / referral / tree reads | Yes |
| Reports (on-chain checks) | Yes |
| Time travel / Hardhat reset / force-complete | **No** (local only) |

### Tips

- Deployer wallet needs **tBNB** (funds new QA wallets with ~0.01 tBNB each)
- Deployer must own **MockBTCB** (the key from deploy)
- Create **1 user at a time** first — each create sends a funding tx
- Session wallets are stored in browser `localStorage` (not Hardhat accounts)

## Hardhat local (dev)

```bash
# Terminal 1
cd smart-contracts
npx hardhat node

# Terminal 2
cd smart-contracts
npm run deploy
npm run qa:dashboard:sync
cd qa-dashboard
# .env with VITE_CHAIN_ID=31337 and VITE_RPC_URL=http://127.0.0.1:8545
# (or omit .env — defaults are Hardhat)
npm install
npm run dev
```

## Pages

| Tab | Question it answers |
|-----|---------------------|
| **Overview** | Are pools and totals healthy? |
| **Users** | Create → Register → Activate → View Details |
| **Packages** | Is package progress / next unlock correct? |
| **Income** | Self ROI, Direct, Contribution, Rank, Tier, Community… |
| **Referral Tree** | Who sponsors whom? Rank / package / BV |
| **Reports** | PASS / FAIL business checks |
| **Developer** | Events, txs, gas, time travel, reset (local tools) |

## Notes

- After redeploy: `npm run qa:dashboard:sync` then refresh the browser
- Never commit `qa-dashboard/.env` (contains private key)
