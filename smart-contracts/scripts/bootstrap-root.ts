import hre from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Bootstrap the genesis/root on-chain user for an already-deployed BTCPlanCore.
 *
 * Contract rule (BTCPlanCore.register):
 * - address(0) is the only allowed sponsor for the first user
 * - every later sponsor must have users[sponsor].isActive == true
 *
 * Constructor / deploy wiring alone do NOT register anyone in `users`.
 * This script performs the missing step:
 *   core.register(address(0))  // as the deployer / owner wallet
 *
 * Usage (against a running Hardhat node):
 *   CORE_CONTRACT=0x... npx hardhat run scripts/bootstrap-root.ts --network localhost
 *
 * Or with addresses from deployed-addresses.json:
 *   npx hardhat run scripts/bootstrap-root.ts --network localhost
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [deployer] = await ethers.getSigners();

  const addressesPath = path.resolve("deployed-addresses.json");
  let coreAddress = (process.env.CORE_CONTRACT || "").trim();

  if (!coreAddress && fs.existsSync(addressesPath)) {
    const json = JSON.parse(fs.readFileSync(addressesPath, "utf8")) as {
      BTCPlanCore?: string;
      RootUser?: string;
    };
    coreAddress = json.BTCPlanCore || "";
  }

  if (!coreAddress || !ethers.isAddress(coreAddress)) {
    throw new Error(
      "CORE_CONTRACT is missing. Set CORE_CONTRACT in the environment or ensure deployed-addresses.json exists.",
    );
  }

  const core = await ethers.getContractAt("BTCPlanCore", coreAddress);
  const owner = await core.owner();

  console.log("=======================================");
  console.log("Quantara Root Bootstrap");
  console.log("=======================================");
  console.log("Network signer:", deployer.address);
  console.log("Core contract:", coreAddress);
  console.log("Core owner:   ", owner);

  if (deployer.address.toLowerCase() !== owner.toLowerCase()) {
    console.warn(
      "WARNING: signer is not core.owner(). register() uses msg.sender — " +
        "the wallet that calls this becomes the root user, not necessarily the Solidity owner.",
    );
  }

  const before = await core.users(deployer.address);
  if (before.isActive) {
    console.log("Root already active on-chain.");
    console.log("  wallet :", before.wallet);
    console.log("  sponsor:", before.sponsor);
    console.log("  package:", before.packageAmount.toString());
    return;
  }

  console.log("Calling register(address(0)) as genesis/root...");
  const tx = await core.register(ethers.ZeroAddress);
  const receipt = await tx.wait();
  console.log("Tx hash:", receipt?.hash || tx.hash);

  const after = await core.users(deployer.address);
  if (!after.isActive) {
    throw new Error("Bootstrap failed — users[signer].isActive is still false");
  }

  // Persist root wallet into deployed-addresses.json when present
  if (fs.existsSync(addressesPath)) {
    const json = JSON.parse(fs.readFileSync(addressesPath, "utf8")) as Record<
      string,
      string
    >;
    json.RootUser = deployer.address;
    json.BTCPlanCore = coreAddress;
    fs.writeFileSync(addressesPath, JSON.stringify(json, null, 2));
  }

  console.log("=======================================");
  console.log("Root bootstrap complete");
  console.log("=======================================");
  console.log("Root wallet (use as Laravel sponsor):", deployer.address);
  console.log("users[root].isActive:", after.isActive);
  console.log("users[root].sponsor :", after.sponsor);
  console.log("");
  console.log("Next: ensure your Laravel sponsor/admin user.username or");
  console.log("wallet_addr equals this root wallet, then new members can");
  console.log("register under that sponsor id.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
