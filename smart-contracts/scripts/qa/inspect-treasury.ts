/**
 * Read-only treasury dump.
 *
 *   npm run qa:inspect:treasury
 *   npm run qa:inspect:treasury:bsc-testnet
 */
import hre from "hardhat";
import { loadContracts, getBtcUsd, printTreasury, printContractState } from "./lib/chainInspect";

async function main() {
  const { ethers } = await hre.network.connect();
  const c = await loadContracts(ethers);
  const btcUsd = await getBtcUsd(c);
  await printTreasury(ethers, c, btcUsd);
  try {
    await printContractState(ethers, c, btcUsd);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `\n── Contract State ──\n  (skipped event scan on this RPC: ${msg.slice(0, 120)})\n` +
        "  Treasury balances above are enough to confirm package funds.",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
