import hre from "hardhat";

/**
 * Deploys the system and exercises income cap completion.
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [owner] = await ethers.getSigners();

  console.log("Income cap smoke test\n");

  const mockBTCB = await ethers.deployContract("MockBTCB");
  const priceFeed = await ethers.deployContract("MockBTCPriceFeed", [60000]);
  const incomeManager = await ethers.deployContract("IncomeManager");
  const treasury = await ethers.deployContract("TreasuryManager", [
    await mockBTCB.getAddress(),
  ]);
  const core = await ethers.deployContract("BTCPlanCore", [
    await mockBTCB.getAddress(),
    await priceFeed.getAddress(),
  ]);
  const interdependentReward = await ethers.deployContract(
    "InterdependentReward"
  );

  await core.setTreasury(await treasury.getAddress());
  await core.setIncomeManager(await incomeManager.getAddress());
  await core.setInterdependentReward(await interdependentReward.getAddress());

  await treasury.setCoreContract(await core.getAddress());
  await treasury.setRewardContract(await interdependentReward.getAddress());

  await incomeManager.setCoreContract(await core.getAddress());
  await incomeManager.setAuthorizedContract(await core.getAddress(), true);
  await incomeManager.setAuthorizedContract(owner.address, true);

  await interdependentReward.setCoreContract(await core.getAddress());
  await interdependentReward.setTreasury(await treasury.getAddress());
  await interdependentReward.setIncomeManager(await incomeManager.getAddress());

  await core.register(ethers.ZeroAddress);
  await mockBTCB.approve(await core.getAddress(), ethers.MaxUint256);
  await core.activatePackage(50);

  const principal = await incomeManager.principal(owner.address);
  console.log("Principal:", principal.toString());

  await incomeManager.recordIncome(owner.address, principal * 3n, 0);

  console.log("ROI earned:", (await incomeManager.roiEarned(owner.address)).toString());
  console.log(
    "Package completed:",
    (await core.users(owner.address)).packageCompleted
  );
  console.log(
    "ROI active:",
    (await interdependentReward.roiAccounts(owner.address)).isActive
  );

  const [nextPkg, nextCycle] = await core.getNextEligiblePackage(owner.address);
  console.log("Next eligible:", nextPkg.toString(), "cycle", nextCycle.toString());
  console.log("\nIncome cap smoke OK");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
