#!/usr/bin/env node
/**
 * Sync ABIs + deployed-addresses into the QA dashboard.
 * Run after `hardhat build` and `hardhat run scripts/deploy.ts --network localhost`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const dash = path.join(root, "qa-dashboard");
const abiOut = path.join(dash, "src", "abis");
const publicOut = path.join(dash, "public");

const contracts = [
  "BTCPlanCore",
  "TreasuryManager",
  "IncomeManager",
  "InterdependentReward",
  "ContributionReward",
  "ContributionBooster",
  "RankReward",
  "CommunityBuilder",
  "MockBTCB",
  "MockBTCPriceFeed",
];

fs.mkdirSync(abiOut, { recursive: true });
fs.mkdirSync(publicOut, { recursive: true });

for (const name of contracts) {
  const candidates = [
    path.join(root, "artifacts", "contracts", `${name}.sol`, `${name}.json`),
    path.join(
      root,
      "artifacts",
      "contracts",
      "adapters",
      `${name}.sol`,
      `${name}.json`,
    ),
  ];
  const src = candidates.find((p) => fs.existsSync(p));
  if (!src) {
    console.warn(`Skip missing artifact: ${name}`);
    continue;
  }
  const json = JSON.parse(fs.readFileSync(src, "utf8"));
  fs.writeFileSync(
    path.join(abiOut, `${name}.json`),
    JSON.stringify({ contractName: name, abi: json.abi }, null, 2),
  );
  console.log(`ABI  ${name}`);
}

const addrSrc = path.join(root, "deployed-addresses.json");
if (fs.existsSync(addrSrc)) {
  fs.copyFileSync(addrSrc, path.join(publicOut, "deployed-addresses.json"));
  console.log("Copied deployed-addresses.json → qa-dashboard/public/");
} else {
  console.warn("deployed-addresses.json not found — deploy first");
}

console.log("QA dashboard assets synced.");
