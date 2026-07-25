/**
 * Read-only referral tree dump.
 *
 *   npm run qa:inspect:tree
 *
 * Optional: VERIFY_ROOT / VERIFY_USER1 / VERIFY_USER2 / VERIFY_USER3
 * Or uses phase2-handoff.json / Hardhat #0–#3.
 */
import hre from "hardhat";
import { loadContracts, loadWalletSet, printReferralTree } from "./lib/chainInspect";

async function main() {
  const { ethers } = await hre.network.connect();
  const signers = await ethers.getSigners();
  const c = await loadContracts(ethers);
  const wallets = loadWalletSet(ethers, signers);
  const tree = await printReferralTree(c, wallets);
  if (!tree.ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
