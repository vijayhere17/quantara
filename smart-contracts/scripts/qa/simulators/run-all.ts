/**
 * Phase 5 — run all QA simulators and write PASS/FAIL reports.
 *
 *   npm run qa:simulators
 *   npx hardhat run scripts/qa/simulators/run-all.ts
 *
 * Filter one simulator (Windows + Unix safe):
 *   npx hardhat run scripts/qa/simulators/run-all.ts -- --sim PackageSimulator
 *   npm run qa:simulators:package
 *
 * Optional tree knobs:
 *   --depth 3 --directs 2
 */
import hre from "hardhat";
import { ALL_SIMULATORS } from "./simulations";
import { writeReports, type SimulatorReport } from "./lib/report";

function argValue(flag: string): string {
  const argv = process.argv;
  const eq = argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const idx = argv.indexOf(flag);
  if (idx >= 0 && idx + 1 < argv.length) return argv[idx + 1];
  return "";
}

async function main() {
  const { ethers } = await hre.network.connect();

  // Prefer CLI flags (Windows-safe). Fall back to env for Unix / PowerShell.
  const filter = (
    argValue("--sim") ||
    process.env.QA_SIM ||
    ""
  ).toLowerCase();
  const depth = argValue("--depth") || process.env.QA_TREE_DEPTH || "";
  const directs = argValue("--directs") || process.env.QA_TREE_DIRECTS || "";
  if (depth) process.env.QA_TREE_DEPTH = depth;
  if (directs) process.env.QA_TREE_DIRECTS = directs;

  console.log("\n══════════════════════════════════════════════════");
  console.log("  PHASE 5 — QA Simulator Suite");
  if (filter) console.log(`  Filter: ${filter}`);
  console.log("══════════════════════════════════════════════════\n");

  const reports: SimulatorReport[] = [];
  let matched = 0;
  for (const sim of ALL_SIMULATORS) {
    if (filter && !sim.name.toLowerCase().includes(filter)) {
      continue;
    }
    matched += 1;
    console.log(`\n▶ Running ${sim.name}…`);
    try {
      reports.push(await sim.run(ethers));
    } catch (e) {
      console.error(`Simulator ${sim.name} crashed:`, e);
      reports.push({
        simulator: sim.name,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        checks: [
          {
            name: "Simulator completed without crash",
            ok: false,
            note: String((e as Error).message || e).slice(0, 200),
          },
        ],
        passed: 0,
        failed: 1,
        status: "FAIL",
      });
    }
  }

  if (filter && matched === 0) {
    console.error(
      `No simulator matched filter "${filter}". Known names:\n` +
        ALL_SIMULATORS.map((s) => `  - ${s.name}`).join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  const path = writeReports(reports);
  const overall = reports.every((r) => r.status === "PASS") ? "PASS" : "FAIL";
  console.log(`\nOverall: ${overall}`);
  console.log(`Report: ${path}\n`);

  if (overall === "FAIL") {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
