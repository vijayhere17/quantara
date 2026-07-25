# Terminal Verification Checklist (Read-Only)

Inspect Phase 1 (Registration) + Phase 2 (Contribution) **directly from the VS Code / Hardhat terminal**.  
These commands **never modify** chain state.

## Prerequisites

```bash
# Terminal A
cd smart-contracts && npx hardhat node

# Terminal B — only if contracts are not already deployed
FORCE_DEPLOY=1 npm run bootstrap:demo
# Then run Phase 1/2 QA (or use an already-populated local chain)
npm run qa:phase1
npm run qa:phase2
```

Wallets for the standard tree (Hardhat accounts):

| Role  | Account |
| ----- | ------- |
| Root  | #0 `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` |
| User1 | #1 `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` |
| User2 | #2 `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` |
| User3 | #3 `0x90F79bf6EB2c4f870365E785982E1f101E93b906` |

---

## One-command summary

```bash
npm run qa:verify
```

Expected:

```
==============================
REGISTRATION
✔ PASS

PACKAGE
✔ PASS

TOKEN
✔ PASS

TREASURY
✔ PASS

CONTRIBUTION
✔ PASS

REFERRAL TREE
✔ PASS

EVENTS
✔ PASS

TRANSACTIONS
✔ PASS

==============================

TOTAL
8/8 PASS

READY FOR PHASE 3
```

---

## Helper scripts

| Command | Purpose |
| ------- | ------- |
| `npm run qa:verify` | Full 8-section checklist |
| `VERIFY_USER=0x... npm run qa:inspect:user` | Registration + token + package + contribution for one wallet |
| `VERIFY_TX=0x... npm run qa:inspect:tx` | Receipt status, gas, decoded events |
| `npm run qa:inspect:treasury` | Working / ROI / Reserve / Community / Regeneration |
| `npm run qa:inspect:tree` | Root → User1 → User2 → User3 sponsors |
| `npm run qa:inspect:events` | `UserRegistered`, `PackageActivated`, `ContributionRewardPaid` |

Optional env:

- `VERIFY_ROOT` / `VERIFY_USER1` / `VERIFY_USER2` / `VERIFY_USER3`
- `VERIFY_FROM_BLOCK` (default `0`)
- Uses `scripts/qa/reports/phase2-handoff.json` when present (from `qa:phase2`)

---

## Hardhat console (manual)

```bash
npx hardhat console --network localhost
```

```js
const addr = require("./deployed-addresses.json");
const core = await ethers.getContractAt("BTCPlanCore", addr.BTCPlanCore);
const token = await ethers.getContractAt("MockBTCB", addr.MockBTCB || addr.Token);
const treasury = await ethers.getContractAt("TreasuryManager", addr.TreasuryManager);
const contrib = await ethers.getContractAt("ContributionReward", addr.ContributionReward);
const income = await ethers.getContractAt("IncomeManager", addr.IncomeManager);

const USER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // User1
```

### Registration

```js
const u = await core.users(USER);
console.log({
  wallet: u.wallet,
  sponsor: u.sponsor,
  packageAmount: u.packageAmount.toString(), // expect 50
  packageCycle: u.packageCycle.toString(),
  joinedAt: u.joinedAt.toString(),
  isActive: u.isActive,
  packageCompleted: u.packageCompleted,
  isBlocked: "N/A — not stored on-chain",
});
```

### Token

```js
await token.balanceOf(USER);
await token.balanceOf(addr.TreasuryManager);
await token.balanceOf(addr.BTCPlanCore);
await token.allowance(USER, addr.BTCPlanCore);
```

### Package

```js
const u = await core.users(USER);
const inc = await income.incomes(USER);
console.log({
  packageAmountUsd: u.packageAmount.toString(),
  packageCycle: u.packageCycle.toString(),
  principal: inc.principal.toString(),
  packageActive: inc.packageActive,
  packageCompleted: u.packageCompleted,
});
```

### Contribution (L1 / L2 / L3)

```js
const total = await contrib.contributionIncome(USER);
const l1 = await contrib.levelIncome(USER, 1);
const l2 = await contrib.levelIncome(USER, 2);
const l3 = await contrib.levelIncome(USER, 3);
console.log({
  total: total.toString(),
  l1: l1.toString(),
  l2: l2.toString(),
  l3: l3.toString(),
  pending: "0 (paid instantly)",
  incomeManager: (await income.contributionEarned(USER)).toString(),
});
```

### Treasury

```js
console.log({
  working: (await treasury.workingFundBalance()).toString(),
  roi: (await treasury.interdependentFundBalance()).toString(),
  reserve: (await treasury.reserveFundBalance()).toString(),
  community: (await treasury.communityBuilderFundBalance()).toString(),
  regeneration: (await treasury.regenerationFundBalance()).toString(),
  tokenBalance: (await token.balanceOf(addr.TreasuryManager)).toString(),
});
```

Split on each activation: **30% regen / 25% ROI / 3% reserve / 2% community / 40% working**.

### Events

```js
await core.queryFilter(core.filters.UserRegistered(), 0, "latest");
await core.queryFilter(core.filters.PackageActivated(), 0, "latest");
await contrib.queryFilter(contrib.filters.ContributionRewardPaid(), 0, "latest");
```

### Transaction

```js
const txHash = "0x...";
const rc = await ethers.provider.getTransactionReceipt(txHash);
const block = await ethers.provider.getBlock(rc.blockNumber);
console.log({ status: rc.status, gasUsed: rc.gasUsed.toString(), block: rc.blockNumber, ts: block.timestamp, logs: rc.logs.length });
```

### Referral tree

```js
const root = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const user1 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const user2 = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
const user3 = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
console.log({
  user1_sponsor: (await core.users(user1)).sponsor,
  user2_sponsor: (await core.users(user2)).sponsor,
  user3_sponsor: (await core.users(user3)).sponsor,
  contrib_sponsors: {
    user1: await contrib.sponsors(user1),
    user2: await contrib.sponsors(user2),
    user3: await contrib.sponsors(user3),
  },
});
```

---

## Notes

- **`isBlocked`** is not a field on `BTCPlanCore.User` — inactive package (`packageAmount == 0`) is what blocks earning.
- Contribution rewards are paid **immediately** (`pending = 0`). Lifetime == total on `ContributionReward.contributionIncome`.
- After Phase 2 edge cases, Root may show **$6.50** contribution (Steps 1–3 **$5.00** + Edge1 L2 **$1.50**). `qa:verify` accepts both.
- Do **not** start Phase 3 (ROI) until `npm run qa:verify` prints `8/8 PASS`.
