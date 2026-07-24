/**
 * Sync Laravel application/.env (+ local config fallbacks) from deployed-addresses.json.
 *
 *   npx hardhat run scripts/sync-laravel-env.ts --network localhost
 */
import fs from "fs";
import path from "path";
import {
  loadDeployedAddresses,
  syncLaravelEnvFromAddresses,
  syncLaravelLocalConfigFallbacks,
} from "./lib/deploymentHealth";

async function main() {
  const addresses = loadDeployedAddresses();
  if (!addresses.BTCPlanCore) {
    throw new Error("deployed-addresses.json missing BTCPlanCore — run deploy first");
  }

  const laravelEnv = path.resolve(process.cwd(), "../application/.env");
  const phpConfig = path.resolve(
    process.cwd(),
    "../application/config/blockchain.php",
  );

  if (!fs.existsSync(laravelEnv)) {
    throw new Error(`Missing ${laravelEnv}`);
  }

  syncLaravelEnvFromAddresses(addresses, laravelEnv);
  console.log("Updated", laravelEnv);
  console.log("  CORE_CONTRACT     =", addresses.BTCPlanCore);
  console.log("  TOKEN_CONTRACT    =", addresses.MockBTCB || addresses.Token);
  console.log("  TREASURY_CONTRACT =", addresses.TreasuryManager);
  console.log("  REWARD_CONTRACT   =", addresses.InterdependentReward);
  console.log("  INCOME_CONTRACT   =", addresses.IncomeManager);

  if (fs.existsSync(phpConfig)) {
    syncLaravelLocalConfigFallbacks(addresses, phpConfig);
    console.log("Updated local fallbacks in", phpConfig);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
