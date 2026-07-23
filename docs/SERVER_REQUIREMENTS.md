# Quantara server requirements

## PHP

- PHP **8.1+**
- Extensions (recommended):
  - **`ext-gmp`** — preferred for wei / hex integer compares during approval verification and income indexing
  - `ext-bcmath` — optional fallback if GMP is unavailable
  - `ext-json`, `ext-mbstring`, `ext-openssl`, `ext-pdo_mysql`, `ext-curl`

GMP is **recommended but not hard-required**. Blockchain math goes through `App\Services\BigInteger`, which uses:

1. GMP (`\gmp_*`) when loaded  
2. BCMath when GMP is missing  
3. Pure-PHP hex/decimal fallback otherwise  

Never call bare `gmp_init()` inside an `App\…` namespace — PHP resolves it as `App\Services\gmp_init` and fatals even when the extension is installed.

### Install GMP (examples)

```bash
# Ubuntu / Debian
sudo apt-get install php-gmp
sudo phpenmod gmp
sudo systemctl reload php8.2-fpm   # version may differ

# Verify
php -m | grep gmp
```

## Node (member panel build)

- Node 20+ for `npm run build` / Hardhat

## Blockchain

- Configured RPC + `CORE_CONTRACT` / `TOKEN_CONTRACT` / `TREASURY_CONTRACT` / `REWARD_CONTRACT`
- Production: real BTCB + Chainlink — never Mock* contracts
