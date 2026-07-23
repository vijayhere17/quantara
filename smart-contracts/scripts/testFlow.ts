import hre from "hardhat";

/**
 * Manual smoke-flow script for local verification.
 * Deploy + wire + register + activate $50 package.
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [owner, user1, user2] = await ethers.getSigners();

  console.log("Deploying Quantara system...\n");

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
  const contributionReward = await ethers.deployContract("ContributionReward");
  const contributionBooster = await ethers.deployContract(
    "ContributionBooster"
  );
  const rankReward = await ethers.deployContract("RankReward");
  const communityBuilder = await ethers.deployContract("CommunityBuilder", [
    await treasury.getAddress(),
  ]);

  await core.setTreasury(await treasury.getAddress());
  await core.setRankReward(await rankReward.getAddress());
  await core.setContributionReward(await contributionReward.getAddress());
  await core.setContributionBooster(await contributionBooster.getAddress());
  await core.setInterdependentReward(await interdependentReward.getAddress());
  await core.setIncomeManager(await incomeManager.getAddress());

  await treasury.setCoreContract(await core.getAddress());
  await treasury.setRewardContract(await interdependentReward.getAddress());
  await treasury.setCommunityBuilderContract(
    await communityBuilder.getAddress()
  );
  await treasury.setWorkingPayer(await contributionReward.getAddress(), true);
  await treasury.setWorkingPayer(await contributionBooster.getAddress(), true);
  await treasury.setWorkingPayer(await rankReward.getAddress(), true);

  await incomeManager.setCoreContract(await core.getAddress());
  await incomeManager.setRankReward(await rankReward.getAddress());
  await incomeManager.setAuthorizedContract(await core.getAddress(), true);
  await incomeManager.setAuthorizedContract(
    await interdependentReward.getAddress(),
    true
  );
  await incomeManager.setAuthorizedContract(
    await contributionReward.getAddress(),
    true
  );
  await incomeManager.setAuthorizedContract(
    await contributionBooster.getAddress(),
    true
  );
  await incomeManager.setAuthorizedContract(await rankReward.getAddress(), true);
  await incomeManager.setAuthorizedContract(
    await communityBuilder.getAddress(),
    true
  );

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
  await rankReward.setSameRankReporter(
    await interdependentReward.getAddress(),
    true
  );
  await rankReward.setSameRankReporter(
    await contributionReward.getAddress(),
    true
  );
  await rankReward.setSameRankReporter(
    await contributionBooster.getAddress(),
    true
  );
  await rankReward.setSameRankReporter(
    await communityBuilder.getAddress(),
    true
  );

  await communityBuilder.setRankRewardContract(await rankReward.getAddress());
  await communityBuilder.setIncomeManager(await incomeManager.getAddress());

  console.log("Wiring complete");

  const amount = ethers.parseUnits("10000", 18);
  await mockBTCB.transfer(user1.address, amount);
  await mockBTCB.transfer(user2.address, amount);
  await mockBTCB.connect(user1).approve(await core.getAddress(), amount);
  await mockBTCB.connect(user2).approve(await core.getAddress(), amount);

  await core.connect(user1).register(ethers.ZeroAddress);
  await core.connect(user2).register(user1.address);

  await core.connect(user1).activatePackage(50);
  await core.connect(user2).activatePackage(50);

  console.log("User1 package:", (await core.users(user1.address)).packageAmount.toString());
  console.log("User1 contribution:", (await contributionReward.contributionIncome(user1.address)).toString());
  console.log("Working fund:", (await treasury.workingFundBalance()).toString());
  console.log("ROI fund:", (await treasury.interdependentFundBalance()).toString());
  console.log("\nSmoke flow OK");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
