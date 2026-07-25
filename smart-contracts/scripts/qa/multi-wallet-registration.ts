/**
 * Multi-wallet registration proof — mirrors frontend existence-check flow:
 *
 *   isRegistered(wallet) → if false, skip users() → register → approve → activate
 *
 * Runs THREE completely fresh wallets sequentially against the live localhost deploy.
 *
 *   npx hardhat run scripts/qa/multi-wallet-registration.ts --network localhost
 */
import hre from "hardhat";
import { loadDeployedAddresses, hasContractCode } from "../lib/deploymentHealth";

type Check = { name: string; ok: boolean; note?: string };

const PACKAGE_USD = 50n;

async function main() {
  const { ethers } = await hre.network.connect();
  const signers = await ethers.getSigners();
  const root = signers[0];
  // Hardhat accounts #10, #11, #12 — reserved for multi-wallet proof (avoid #4 used by phase1)
  const freshWallets = [signers[10], signers[11], signers[12]];
  const provider = ethers.provider;
  const addresses = loadDeployedAddresses();

  const checks: Check[] = [];
  const check = (name: string, ok: boolean, note?: string) => {
    checks.push({ name, ok, note });
    console.log(`${ok ? "✅ PASS" : "❌ FAIL"} | ${name}${note ? " — " + note : ""}`);
  };

  console.log("\n══════════════════════════════════════════════════");
  console.log("  MULTI-WALLET REGISTRATION PROOF (×3)");
  console.log("══════════════════════════════════════════════════\n");

  const coreAddr = String(addresses.BTCPlanCore || "");
  const tokenAddr = String(addresses.MockBTCB || addresses.Token || "");

  check("Bytecode / BTCPlanCore", await hasContractCode(provider, coreAddr), coreAddr);
  check("Bytecode / Token", await hasContractCode(provider, tokenAddr), tokenAddr);

  const core = await ethers.getContractAt("BTCPlanCore", coreAddr);
  const token = await ethers.getContractAt("MockBTCB", tokenAddr);

  // Confirm isRegistered exists on deployed bytecode (selector present)
  let isRegisteredSupported = true;
  try {
    await core.isRegistered.staticCall(ethers.ZeroAddress);
  } catch (err) {
    isRegisteredSupported = false;
    check(
      "ABI / isRegistered present",
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
  if (isRegisteredSupported) {
    check("ABI / isRegistered present", true);
  }

  // Bootstrap root sponsor if needed (via isRegistered — never assume users() first)
  const rootRegistered = await core.isRegistered(root.address);
  if (!rootRegistered) {
    console.log("→ Bootstrapping root via register(address(0))…");
    await (await core.connect(root).register(ethers.ZeroAddress)).wait();
  }
  check("Sponsor / root isRegistered", await core.isRegistered(root.address), root.address);

  for (let i = 0; i < freshWallets.length; i++) {
    const user = freshWallets[i];
    const label = `Wallet ${i + 1}`;
    console.log(`\n── ${label}: ${user.address} ──`);

    // FRONTEND RULE: existence check BEFORE any users() decode
    const before = await core.isRegistered(user.address);
    check(`${label} / isRegistered before register == false`, before === false);

    if (before) {
      check(`${label} / skipped — already registered (pick unused Hardhat account)`, false);
      continue;
    }

    // Prove we do NOT need users() for the unregistered path.
    // (Calling users() on a healthy Core would return zeros — but the product forbids it.)
    console.log(`→ ${label}: mint Demo BTCB → register → approve → activate`);

    const tokenAmount: bigint = await core.getPackageBTCBAmount(PACKAGE_USD);

    // Mint / fund (demo faucet equivalent)
    const balBefore: bigint = await token.balanceOf(user.address);
    if (balBefore < tokenAmount) {
      const mintFn = (token as { mint?: (to: string, amount: bigint) => Promise<{ wait: () => Promise<unknown> }> }).mint;
      if (typeof mintFn === "function") {
        await (await mintFn.call(token, user.address, tokenAmount * 2n)).wait();
      } else {
        await (await token.connect(root).transfer(user.address, tokenAmount * 2n)).wait();
      }
    }

    const regTx = await core.connect(user).register(root.address);
    const regReceipt = await regTx.wait();
    check(`${label} / register mined`, Boolean(regReceipt?.hash), regReceipt?.hash);

    const afterReg = await core.isRegistered(user.address);
    check(`${label} / isRegistered after register == true`, afterReg === true);

    // Only NOW is users() allowed
    const row = await core.users(user.address);
    check(`${label} / users().isActive after register`, Boolean(row.isActive));
    check(
      `${label} / users().packageAmount == 0 pre-activate`,
      Number(row.packageAmount) === 0,
    );

    await (await token.connect(user).approve(coreAddr, tokenAmount)).wait();
    const actTx = await core.connect(user).activatePackage(PACKAGE_USD);
    const actReceipt = await actTx.wait();
    check(`${label} / activate mined`, Boolean(actReceipt?.hash), actReceipt?.hash);

    const afterAct = await core.users(user.address);
    check(
      `${label} / packageAmount == $50 after activate`,
      Number(afterAct.packageAmount) === 50,
      String(afterAct.packageAmount),
    );
  }

  const failed = checks.filter((c) => !c.ok);
  console.log("\n══════════════════════════════════════════════════");
  console.log(`  RESULT: ${checks.length - failed.length}/${checks.length} checks passed`);
  console.log("══════════════════════════════════════════════════\n");

  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
