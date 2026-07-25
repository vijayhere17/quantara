/**
 * Read-only event scanner.
 *
 *   npm run qa:inspect:events
 *   VERIFY_FROM_BLOCK=0 npm run qa:inspect:events
 */
import hre from "hardhat";
import { loadContracts, fetchEvents, printEvents } from "./lib/chainInspect";

async function main() {
  const { ethers } = await hre.network.connect();
  const c = await loadContracts(ethers);
  const from = Number(process.env.VERIFY_FROM_BLOCK || 0);
  printEvents("UserRegistered", await fetchEvents(ethers, c.core, "UserRegistered", from), 50);
  printEvents("PackageActivated", await fetchEvents(ethers, c.core, "PackageActivated", from), 50);
  printEvents(
    "ContributionRewardPaid",
    await fetchEvents(ethers, c.contrib, "ContributionRewardPaid", from),
    50,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
