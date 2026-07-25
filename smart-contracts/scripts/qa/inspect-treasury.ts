/**
 * Read-only treasury dump.
 *
 *   npm run qa:inspect:treasury
 */
import hre from "hardhat";
import { loadContracts, getBtcUsd, printTreasury, printContractState } from "./lib/chainInspect";

async function main() {
  const { ethers } = await hre.network.connect();
  const c = await loadContracts(ethers);
  const btcUsd = await getBtcUsd(c);
  await printTreasury(ethers, c, btcUsd);
  await printContractState(ethers, c, btcUsd);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
