#!/usr/bin/env node
/**
 * Cross-platform launcher for Phase 5 QA simulators.
 *
 * Hardhat 3 does not forward `--` script args (HHE506), and Windows CMD
 * rejects Unix-style `QA_SIM=...` prefixes. This wrapper sets env vars then
 * runs Hardhat.
 *
 * Usage:
 *   node scripts/qa/simulators/launch.mjs
 *   node scripts/qa/simulators/launch.mjs PackageSimulator
 *   node scripts/qa/simulators/launch.mjs ReferralTree --depth 3 --directs 2
 *   npm run qa:simulators:package
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const smartContractsRoot = path.resolve(__dirname, "../../..");

function takeFlag(argv, flag) {
  const eq = argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) {
    argv.splice(argv.indexOf(eq), 1);
    return eq.slice(flag.length + 1);
  }
  const idx = argv.indexOf(flag);
  if (idx >= 0) {
    const val = argv[idx + 1] || "";
    argv.splice(idx, val ? 2 : 1);
    return val;
  }
  return "";
}

const argv = process.argv.slice(2);
const depth = takeFlag(argv, "--depth");
const directs = takeFlag(argv, "--directs");
const filter = argv.find((a) => !a.startsWith("-")) || "";

const env = { ...process.env };
if (filter) env.QA_SIM = filter;
if (depth) env.QA_TREE_DEPTH = depth;
if (directs) env.QA_TREE_DIRECTS = directs;

const hardhatBin = path.join(
  smartContractsRoot,
  "node_modules",
  "hardhat",
  "dist",
  "src",
  "cli.js",
);
const script = path.join("scripts", "qa", "simulators", "run-all.ts");

const child = spawn(
  process.execPath,
  [hardhatBin, "run", script],
  {
    cwd: smartContractsRoot,
    env,
    stdio: "inherit",
    shell: false,
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on("error", (err) => {
  console.error("Failed to launch Hardhat:", err.message);
  console.error(
    "Fallback: set QA_SIM in PowerShell then run hardhat, e.g.\n" +
      '  $env:QA_SIM="PackageSimulator"; npx hardhat run scripts/qa/simulators/run-all.ts',
  );
  process.exit(1);
});
