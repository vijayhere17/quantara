/**
 * Demo / QA harness — time travel, fund wallets, force rank, claim ROI.
 * Uses public owner APIs + Hardhat EVM helpers (no raw storage edits).
 *
 *   npx hardhat run scripts/demo-harness.ts --network localhost
 */
import { network } from "hardhat";

const { ethers } = await network.connect();

async function increaseDays(days: number) {
  await network.provider.send("evm_increaseTime", [days * 24 * 60 * 60]);
  await network.provider.send("evm_mine");
}

async function main() {
  const [deployer, alice] = await ethers.getSigners();
  console.log("=== Quantara Demo Harness ===");
  console.log("Deployer:", deployer.address);

  const mockBTCB = await ethers.deployContract("MockBTCB");
  const mockPriceFeed = await ethers.deployContract("MockBTCPriceFeed", [60000]);

  const incomeManager = await ethers.deployContract("IncomeManager");
  const treasury = await ethers.deployContract("TreasuryManager", [
    await mockBTCB.getAddress(),
  ]);
  const core = await ethers.deployContract("BTCPlanCore", [
    await mockBTCB.getAddress(),
    await mockPriceFeed.getAddress(),
  ]);
  const interdependentReward = await ethers.deployContract("InterdependentReward");
  const contributionReward = await ethers.deployContract("ContributionReward");
  const contributionBooster = await ethers.deployContract("ContributionBooster");
  const rankReward = await ethers.deployContract("RankReward");
  const communityBuilder = await ethers.deployContract("CommunityBuilder", [
    await treasury.getAddress(),
  ]);

  await core.setTreasury(await treasury.getAddress());
  await core.setContributionReward(await contributionReward.getAddress());
  await core.setContributionBooster(await contributionBooster.getAddress());
  await core.setIncomeManager(await incomeManager.getAddress());
  await core.setInterdependentReward(await interdependentReward.getAddress());
  await core.setRankReward(await rankReward.getAddress());

  await treasury.setCoreContract(await core.getAddress());
  await treasury.setRewardContract(await interdependentReward.getAddress());
  await treasury.setCommunityBuilderContract(await communityBuilder.getAddress());
  await treasury.setWorkingPayer(await contributionReward.getAddress(), true);
  await treasury.setWorkingPayer(await contributionBooster.getAddress(), true);
  await treasury.setWorkingPayer(await rankReward.getAddress(), true);
  await treasury.setRegenerationWallet(deployer.address);

  await incomeManager.setCoreContract(await core.getAddress());
  await incomeManager.setRankReward(await rankReward.getAddress());
  await incomeManager.setAuthorizedContract(await core.getAddress(), true);
  await incomeManager.setAuthorizedContract(await interdependentReward.getAddress(), true);
  await incomeManager.setAuthorizedContract(await contributionReward.getAddress(), true);
  await incomeManager.setAuthorizedContract(await contributionBooster.getAddress(), true);
  await incomeManager.setAuthorizedContract(await rankReward.getAddress(), true);
  await incomeManager.setAuthorizedContract(await communityBuilder.getAddress(), true);

  await interdependentReward.setCoreContract(await core.getAddress());
  await interdependentReward.setTreasury(await treasury.getAddress());
  await interdependentReward.setRankReward(await rankReward.getAddress());
  await interdependentReward.setIncomeManager(await incomeManager.getAddress());

  await contributionReward.setCoreContract(await core.getAddress());
  await contributionReward.setIncomeManager(await incomeManager.getAddress());
  await contributionReward.setTreasury(await treasury.getAddress());
  await contributionReward.setRankReward(await rankReward.getAddress());

  await contributionBooster.setCoreContract(await core.getAddress());
  await contributionBooster.setIncomeManager(await incomeManager.getAddress());
  await contributionBooster.setTreasury(await treasury.getAddress());
  await contributionBooster.setRankReward(await rankReward.getAddress());

  await rankReward.setCoreContract(await core.getAddress());
  await rankReward.setRewardContract(await interdependentReward.getAddress());
  await rankReward.setIncomeManager(await incomeManager.getAddress());
  await rankReward.setTreasury(await treasury.getAddress());
  await rankReward.setCommunityBuilder(await communityBuilder.getAddress());
  await rankReward.setSameRankReporter(await interdependentReward.getAddress(), true);
  await rankReward.setSameRankReporter(await contributionReward.getAddress(), true);
  await rankReward.setSameRankReporter(await contributionBooster.getAddress(), true);

  await communityBuilder.setRankRewardContract(await rankReward.getAddress());
  await communityBuilder.setIncomeManager(await incomeManager.getAddress());

  const fund = ethers.parseEther("100");
  await mockBTCB.mint(deployer.address, fund);
  await mockBTCB.mint(alice.address, fund);

  await core.register(ethers.ZeroAddress);
  await mockBTCB.approve(await core.getAddress(), ethers.MaxUint256);
  await core.activatePackage(50);

  await core.connect(alice).register(deployer.address);
  await mockBTCB.connect(alice).approve(await core.getAddress(), ethers.MaxUint256);
  await core.connect(alice).activatePackage(50);

  console.log("Root active:", (await core.users(deployer.address)).isActive);
  console.log("Alice sponsor:", (await core.users(alice.address)).sponsor);

  await increaseDays(2);
  const pending = await interdependentReward.getPendingRoi(deployer.address);
  console.log("Pending ROI:", pending.toString());
  if (pending > 0n) {
    await interdependentReward.claimRoi();
    console.log("ROI claimed");
  }

  await rankReward.setRank(deployer.address, 1);
  console.log("Root rank:", await rankReward.userRanks(deployer.address));

  console.log("Regen fund:", (await treasury.regenerationFundBalance()).toString());
  console.log("ROI fund:", (await treasury.interdependentFundBalance()).toString());
  console.log("Working fund:", (await treasury.workingFundBalance()).toString());
  console.log("Reserve fund:", (await treasury.reserveFundBalance()).toString());
  console.log("Community fund:", (await treasury.communityBuilderFundBalance()).toString());
  console.log("=== Demo harness complete ===");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
