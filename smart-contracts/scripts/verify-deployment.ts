/**
 * Deployment health audit — verifies every address in deployed-addresses.json
 * has bytecode and that BTCPlanCore.users(address) decodes correctly.
 *
 *   npx hardhat run scripts/verify-deployment.ts --network localhost
 */
import hre from "hardhat";
import {
  assertBtcPlanCore,
  hasContractCode,
  loadDeployedAddresses,
} from "./lib/deploymentHealth";

async function main() {
  const { ethers } = await hre.network.connect();
  const [deployer] = await ethers.getSigners();
  const provider = ethers.provider;
  const addresses = loadDeployedAddresses();
  const network = await provider.getNetwork();

  console.log("=======================================");
  console.log("Quantara Deployment Verification");
  console.log("=======================================");
  console.log("Chain ID:", Number(network.chainId));
  console.log("Deployer:", deployer.address);
  console.log("");

  const contractKeys = [
    "MockBTCB",
    "Token",
    "MockBTCPriceFeed",
    "PriceFeed",
    "BTCPlanCore",
    "IncomeManager",
    "TreasuryManager",
    "InterdependentReward",
    "ContributionReward",
    "ContributionBooster",
    "RankReward",
    "CommunityBuilder",
  ] as const;

  const seen = new Set<string>();
  const rows: Array<{
    name: string;
    address: string;
    code: boolean;
    status: string;
  }> = [];

  let failed = 0;

  for (const key of contractKeys) {
    const addr = addresses[key];
    if (typeof addr !== "string" || !addr.startsWith("0x")) continue;
    const normalized = addr.toLowerCase();
    if (seen.has(`${key}:${normalized}`)) continue;
    seen.add(`${key}:${normalized}`);

    const code = await hasContractCode(provider, addr);
    let status = code ? "PASS" : "FAIL (no bytecode)";
    if (!code) failed += 1;

    if (key === "BTCPlanCore" && code) {
      try {
        await assertBtcPlanCore(ethers, addr, deployer.address);
        status = "PASS (users OK)";
      } catch (err) {
        failed += 1;
        status = `FAIL (${err instanceof Error ? err.message.slice(0, 80) : "users"})`;
      }
    }

    rows.push({ name: key, address: addr, code, status });
  }

  console.log(
    `${"Contract".padEnd(24)} ${"Address".padEnd(44)} ${"Code".padEnd(6)} Status`,
  );
  console.log("-".repeat(100));
  for (const row of rows) {
    console.log(
      `${row.name.padEnd(24)} ${row.address.padEnd(44)} ${(row.code ? "YES" : "NO").padEnd(6)} ${row.status}`,
    );
  }

  // Detect classic CORE/INCOME swap
  const core = addresses.BTCPlanCore;
  const income = addresses.IncomeManager;
  if (
    typeof core === "string" &&
    typeof income === "string" &&
    core.toLowerCase() === income.toLowerCase()
  ) {
    console.error("\nFAIL: BTCPlanCore and IncomeManager share the same address");
    failed += 1;
  }

  // Probe wrong-contract failure mode for diagnostics
  if (typeof income === "string" && typeof core === "string") {
    try {
      await assertBtcPlanCore(ethers, income, deployer.address);
      console.error(
        "\nFAIL: IncomeManager unexpectedly answered BTCPlanCore.users()",
      );
      failed += 1;
    } catch {
      console.log(
        "\nOK: calling users() on IncomeManager fails as expected (prevents silent mis-wiring)",
      );
    }
  }

  console.log("\n=======================================");
  if (failed > 0) {
    console.error(`RESULT: FAIL (${failed} issue(s))`);
    process.exit(1);
  }
  console.log("RESULT: PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
