/**
 * Phase 5 — run all QA simulators and write PASS/FAIL reports.
 *
 *   npm run qa:simulators
 *   npx hardhat run scripts/qa/simulators/run-all.ts
 *
 * Env:
 *   QA_TREE_DEPTH=2 QA_TREE_DIRECTS=2
 *   QA_SIM=PackageSimulator   # optional: run a single simulator by name substring
 */
import hre from "hardhat";
import { ALL_SIMULATORS } from "./simulations";
import { writeReports, type SimulatorReport } from "./lib/report";

async function main() {
  const { ethers } = await hre.network.connect();
  const filter = (process.env.QA_SIM || "").toLowerCase();

  console.log("\n══════════════════════════════════════════════════");
  console.log("  PHASE 5 — QA Simulator Suite");
  console.log("══════════════════════════════════════════════════\n");

  const reports: SimulatorReport[] = [];
  for (const sim of ALL_SIMULATORS) {
    if (filter && !sim.name.toLowerCase().includes(filter)) {
      continue;
    }
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
