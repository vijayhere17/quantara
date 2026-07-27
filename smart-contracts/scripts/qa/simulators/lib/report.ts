/**
 * PASS / FAIL report helpers for Phase 5 QA simulators.
 */
import fs from "fs";
import path from "path";

export type CheckResult = {
  name: string;
  ok: boolean;
  note?: string;
};

export type SimulatorReport = {
  simulator: string;
  startedAt: string;
  finishedAt?: string;
  checks: CheckResult[];
  passed: number;
  failed: number;
  status: "PASS" | "FAIL" | "RUNNING";
};

export class ReportCollector {
  readonly simulator: string;
  readonly checks: CheckResult[] = [];
  readonly startedAt: string;

  constructor(simulator: string) {
    this.simulator = simulator;
    this.startedAt = new Date().toISOString();
  }

  check(name: string, ok: boolean, note?: string): boolean {
    this.checks.push({ name, ok, note });
    const mark = ok ? "✅ PASS" : "❌ FAIL";
    console.log(`${mark} | [${this.simulator}] ${name}${note ? ` — ${note}` : ""}`);
    return ok;
  }

  finish(): SimulatorReport {
    const passed = this.checks.filter((c) => c.ok).length;
    const failed = this.checks.filter((c) => !c.ok).length;
    const report: SimulatorReport = {
      simulator: this.simulator,
      startedAt: this.startedAt,
      finishedAt: new Date().toISOString(),
      checks: this.checks,
      passed,
      failed,
      status: failed === 0 ? "PASS" : "FAIL",
    };
    console.log(
      `\n── ${this.simulator}: ${report.status} (${passed} passed, ${failed} failed) ──\n`,
    );
    return report;
  }
}

export function writeReports(
  reports: SimulatorReport[],
  outDir = "scripts/qa/reports",
): string {
  const abs = path.resolve(outDir);
  fs.mkdirSync(abs, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(abs, `phase5-simulators-${stamp}.json`);
  const mdPath = path.join(abs, `phase5-simulators-${stamp}.md`);
  const latestJson = path.join(abs, "phase5-simulators-latest.json");
  const latestMd = path.join(abs, "phase5-simulators-latest.md");

  const summary = {
    generatedAt: new Date().toISOString(),
    overall: reports.every((r) => r.status === "PASS") ? "PASS" : "FAIL",
    totals: {
      simulators: reports.length,
      passed: reports.filter((r) => r.status === "PASS").length,
      failed: reports.filter((r) => r.status === "FAIL").length,
      checksPassed: reports.reduce((a, r) => a + r.passed, 0),
      checksFailed: reports.reduce((a, r) => a + r.failed, 0),
    },
    reports,
  };

  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
  fs.writeFileSync(latestJson, JSON.stringify(summary, null, 2));

  const lines: string[] = [
    `# Phase 5 QA Simulator Report`,
    ``,
    `Generated: ${summary.generatedAt}`,
    `Overall: **${summary.overall}**`,
    ``,
    `| Simulator | Status | Passed | Failed |`,
    `|---|---|---:|---:|`,
  ];
  for (const r of reports) {
    lines.push(
      `| ${r.simulator} | ${r.status} | ${r.passed} | ${r.failed} |`,
    );
  }
  lines.push(``, `## Details`, ``);
  for (const r of reports) {
    lines.push(`### ${r.simulator} — ${r.status}`, ``);
    for (const c of r.checks) {
      lines.push(`- ${c.ok ? "PASS" : "FAIL"}: ${c.name}${c.note ? ` (${c.note})` : ""}`);
    }
    lines.push(``);
  }
  const md = lines.join("\n");
  fs.writeFileSync(mdPath, md);
  fs.writeFileSync(latestMd, md);

  console.log(`Report written:\n  ${latestMd}\n  ${latestJson}`);
  return latestMd;
}

/** Net user payout after Phase 2 recycling (70% + dust). */
export function netAfterRecycle(gross: bigint): bigint {
  const toRoi = (gross * 2500n) / 10000n;
  const toReserve = (gross * 300n) / 10000n;
  const toCommunity = (gross * 200n) / 10000n;
  return gross - toRoi - toReserve - toCommunity;
}

export function fiftyFiftyVolume(strongest: bigint, total: bigint): bigint {
  if (total === 0n || strongest === 0n) return 0n;
  const remaining = total - strongest;
  const capped = strongest < remaining ? strongest : remaining;
  return capped * 2n;
}
