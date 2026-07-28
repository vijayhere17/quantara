# Phase 5 — QA Simulator Guide

Complete PASS/FAIL simulation suite for Quantara business rules.

## Run all

```bash
cd smart-contracts
npm run qa:simulators
```

Writes:

- `scripts/qa/reports/phase5-simulators-latest.md`
- `scripts/qa/reports/phase5-simulators-latest.json`

## Run one simulator

| Command | Simulator |
|---------|-----------|
| `npm run qa:simulators:tree` | Referral Tree Generator (depth 1–9, directs 1–5) |
| `npm run qa:simulators:package` | Package / first $50 + treasury split |
| `npm run qa:simulators:upgrade` | Two activations per package before unlock |
| `npm run qa:simulators:topup` | Unlimited $10000 top-ups |
| `npm run qa:simulators:roi` | Self ROI + recycling |
| `npm run qa:simulators:contribution` | Direct Income L1–L3 |
| `npm run qa:simulators:ga` | Growth Accelerator 50:50 + L1 10% |
| `npm run qa:simulators:rank` | Auto rank (Seed+) |
| `npm run qa:simulators:community` | Community Builder points + claim |
| `npm run qa:simulators:tier` | Tier Booster (Self ROI only) |
| `npm run qa:simulators:recycle` | Income recycling 70/25/3/2 |

Or via the Node launcher (works on Windows + Unix; Hardhat 3 rejects `--` script args):

```bash
node scripts/qa/simulators/launch.mjs PackageSimulator
```

PowerShell env fallback:

```powershell
$env:QA_SIM="PackageSimulator"; npx hardhat run scripts/qa/simulators/run-all.ts
```

## Tree generator options

```bash
node scripts/qa/simulators/launch.mjs ReferralTree --depth 3 --directs 2
```

- `--depth`: 1–9 (default 2)
- `--directs`: 1–5 (default 2)

## What each verifies

| Simulator | Checks |
|-----------|--------|
| ReferralTreeGenerator | Depth/directs bounds, on-chain register + sponsor links |
| PackageSimulator | First must be $50; ROI 30% unsplit; charity; reserve/community 0 |
| PackageUpgradeSimulator | Two cycles before next package; cannot skip |
| UnlimitedTopupSimulator | After $10000 C2, unlimited $10000 C2 top-ups |
| SelfRoiSimulator | Pending ROI, claim, gross caps vs net wallet, recycle buckets |
| DirectIncome+Contribution | L1 5% / L2 3% / L3 2% |
| GrowthAcceleratorSimulator | 50:50 ≥1000 qualifies; L1 becomes 10% |
| RankSimulator | Rank BPS; Seed auto-qualify path |
| CommunityBuilderSimulator | Forest–Genesis points; proportional claim + recycle |
| TierBoosterSimulator | 10% of Self ROI when same rank; none when ranks differ |
| IncomeRecyclingSimulator | preview + working/ROI/community payouts |

## Architecture

```
scripts/qa/simulators/
  run-all.ts          # entrypoint
  simulations.ts      # all simulators
  lib/
    report.ts         # PASS/FAIL collector + markdown/json writer
    deploySystem.ts   # fresh contract deploy
    tree.ts           # referral tree generator
    packages.ts       # activate / complete helpers
```

Each run deploys a **fresh** local system (no dependency on `deployed-addresses.json`).
