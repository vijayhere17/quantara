/**
 * Read-only transaction inspector.
 *
 *   VERIFY_TX=0x... npm run qa:inspect:tx
 */
import hre from "hardhat";
import { loadContracts, printTransaction } from "./lib/chainInspect";

async function main() {
  const { ethers } = await hre.network.connect();
  const tx = (process.env.VERIFY_TX || "").trim();
  if (!tx) {
    throw new Error("Set VERIFY_TX=0x...");
  }
  const c = await loadContracts(ethers);
  const info = await printTransaction(ethers, c, tx);
  if (info.status !== 1) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
