/**
 * Read-only dump for one wallet.
 *
 *   VERIFY_USER=0x... npm run qa:inspect:user
 */
import hre from "hardhat";
import {
  loadContracts,
  getBtcUsd,
  readUser,
  printUser,
  printToken,
  printPackage,
  printContribution,
} from "./lib/chainInspect";

async function main() {
  const { ethers } = await hre.network.connect();
  const user = (process.env.VERIFY_USER || process.env.QA_WALLET || "").trim();
  if (!user) {
    throw new Error("Set VERIFY_USER=0x... (or QA_WALLET)");
  }
  const c = await loadContracts(ethers);
  const btcUsd = await getBtcUsd(c);
  const u = await readUser(c.core, user);
  printUser("User", user, u);
  await printToken(ethers, c, user);
  await printPackage(ethers, c, user, btcUsd);
  await printContribution(ethers, c, user, btcUsd);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
