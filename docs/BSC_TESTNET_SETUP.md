# Quantara — BSC Testnet setup (client testing)

This guide converts the platform from local Hardhat to **BNB Smart Chain Testnet** (chain ID **97**) so the client can test real MetaMask transactions on testnet.

## What you need

| Item | Details |
|------|---------|
| MetaMask (or Trust Wallet) | Add **BNB Smart Chain Testnet** |
| Deployer wallet | Private key with **tBNB** for gas |
| Free tBNB | [BSC Testnet Faucet](https://www.bnbchain.org/en/testnet-faucet) or community faucets |
| This repo | Latest code with testnet defaults |
| XAMPP / PHP + MySQL | Laravel app running locally or on a staging URL |

**Do not use your mainnet private key.** Create a fresh wallet for testnet.

---

## 1. MetaMask — add BSC Testnet

Network name: `BNB Smart Chain Testnet`  
RPC URL: `https://data-seed-prebsc-1-s1.binance.org:8545/`  
Chain ID: `97`  
Currency: `tBNB`  
Explorer: `https://testnet.bscscan.com`

Get test BNB (tBNB) into the **deployer** wallet and into every **tester** wallet.

---

## 2. Pull code and install

```bash
cd C:\xampp\htdocs\quantara
git fetch origin
git checkout cursor/convert-bsc-testnet-7f1b
# or after merge: git checkout main && git pull origin main

cd smart-contracts
npm install

cd ..\application
composer install
copy .env.example .env
php artisan key:generate
npm install
npm run build
```

Edit `application\.env`:

- Set `APP_URL` to your local URL (example: `http://localhost/quantara` or `http://localhost`)
- Confirm database settings (`DB_DATABASE=quantara`, etc.)
- Blockchain block should already default to **testnet** (chain `97`). Contract addresses stay empty until step 4.

---

## 3. Configure Hardhat deployer (smart-contracts)

```bash
cd C:\xampp\htdocs\quantara\smart-contracts
copy .env.example .env
```

Edit `smart-contracts\.env`:

```env
PRIVATE_KEY=0xYOUR_64_HEX_PRIVATE_KEY_HERE
CHAIN_ID=97
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
# Leave TOKEN_ADDRESS empty for MockBTCB (recommended for client QA)
TOKEN_ADDRESS=
CHAINLINK_BTC_USD=0x5741306c21795FdCBb9b265Ea0255F499DFe515C
```

**PRIVATE_KEY rules (fixes Hardhat error HHE15):**

- Must be the **private key**, not the wallet address  
- Format: `0x` + **exactly 64** hex characters  
- No quotes, no spaces, one line  
- Export from MetaMask: Account details → Show private key  
- Use a **testnet-only** wallet funded with tBNB  

If you still see HHE15, your `.env` still has a placeholder or wrong value — open `smart-contracts\.env` and fix `PRIVATE_KEY`.

Ensure the deployer has enough **tBNB** (recommend ≥ 0.2 tBNB).

---

## 4. Deploy contracts to BSC Testnet

```bash
cd C:\xampp\htdocs\quantara\smart-contracts
npm run deploy:bsc-testnet
```

This will:

1. Deploy **MockBTCB** (test payment token) unless you set `TOKEN_ADDRESS`
2. Deploy Chainlink BTC/USD adapter (testnet feed)
3. Deploy core / treasury / income / reward contracts
4. Wire everything and register the **root user** (= deployer wallet)
5. Write `deployed-addresses.json`
6. Auto-sync addresses into `application/.env` when that file exists

Verify:

```bash
npm run verify:deployment:bsc-testnet
```

Open addresses on [testnet.bscscan.com](https://testnet.bscscan.com) using values from `deployed-addresses.json`.

---

## 5. Sync Laravel (if auto-sync missed)

```bash
cd C:\xampp\htdocs\quantara\smart-contracts
npm run sync:laravel:bsc-testnet
```

Confirm `application\.env` has:

```env
BLOCKCHAIN_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
BLOCKCHAIN_CHAIN_ID=97
TOKEN_CONTRACT=0x...   # MockBTCB
CORE_CONTRACT=0x...    # BTCPlanCore  ← must be Core, not IncomeManager
TREASURY_CONTRACT=0x...
REWARD_CONTRACT=0x...
INCOME_CONTRACT=0x...
# …other contracts from deploy output
```

Clear Laravel config cache:

```bash
cd C:\xampp\htdocs\quantara\application
php artisan config:clear
php artisan cache:clear
```

---

## 6. Create the root / sponsor user in the database

On-chain root = **deployer wallet** (printed as `RootUser` in `deployed-addresses.json`).

In admin / MySQL, ensure a user exists whose `username` **or** `wallet_addr` matches that root wallet (same address the deployer used). New members will use that sponsor ID at signup.

---

## 7. Fund tester wallets with MockBTCB

Registration pays the **$50 package** in the BEP-20 token. On testnet QA that token is MockBTCB.

```bash
cd C:\xampp\htdocs\quantara\smart-contracts
set FUND_TO=0xTesterWalletAddress
set FUND_AMOUNT=1000
npm run fund:testnet
```

PowerShell:

```powershell
$env:FUND_TO="0xTesterWalletAddress"
$env:FUND_AMOUNT="1000"
npm run fund:testnet
```

Also send each tester a little **tBNB** for gas.

---

## 8. Client test checklist

1. Open the site (`APP_URL`) → Sign Up  
2. MetaMask must be on **BNB Smart Chain Testnet (97)** — the app will prompt to switch  
3. Enter a **valid sponsor ID** (root / existing member)  
4. Continue Package → Connect Wallet → Register  
5. Confirm MetaMask prompts: `register` → token `approve` → `activatePackage(50)`  
6. Check success screen + [testnet.bscscan.com](https://testnet.bscscan.com) for the three txs  
7. Sign in with the same wallet  

---

## Optional: use a real testnet BEP-20 instead of MockBTCB

```env
# smart-contracts/.env
DEPLOY_MOCKS=0
TOKEN_ADDRESS=0xYourTestnetBEP20
CHAINLINK_BTC_USD=0x5741306c21795FdCBb9b265Ea0255F499DFe515C
```

Then redeploy and fund wallets with that token yourself (no `fund:testnet` mint).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Wrong network | Switch MetaMask to chain ID **97** |
| Sponsor not found | Root wallet must exist in Laravel users table |
| Insufficient token | Run `npm run fund:testnet` for MockBTCB |
| Insufficient tBNB | Use BSC testnet faucet |
| `users(address)` / BAD_DATA | `CORE_CONTRACT` points at wrong contract — re-sync from `deployed-addresses.json` |
| RPC errors | Try alternate RPC: `https://bsc-testnet-rpc.publicnode.com` in both `.env` files |
| Deploy OOG / fail | Top up deployer tBNB; retry |

---

## Mainnet later

When ready for production:

1. Set `TOKEN_ADDRESS` to the real BEP-20  
2. Set `CHAINLINK_BTC_USD=0x264990fbd0A4796A3BE9d60A1AC48F2399DF4EBd` (mainnet)  
3. `DEPLOY_MOCKS=0`  
4. `npm run deploy:bsc`  
5. Point Laravel `BLOCKCHAIN_CHAIN_ID=56` + mainnet RPC + new addresses  

**Never deploy MockBTCB to mainnet.**
