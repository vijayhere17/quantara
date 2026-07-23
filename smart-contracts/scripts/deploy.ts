import hre from "hardhat";
import fs from "fs";

/**
 * Quantara deployment order:
 * 1. MockBTCB + PriceFeed (dev)
 * 2. IncomeManager
 * 3. TreasuryManager
 * 4. BTCPlanCore
 * 5. Reward contracts
 * 6. CommunityBuilder
 * 7. Wire dependencies + authorizations
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [deployer] = await ethers.getSigners();

  console.log("=======================================");
  console.log("Quantara Deployment");
  console.log("=======================================");
  console.log("Deployer:", deployer.address);

  const MockBTCB = await ethers.getContractFactory("MockBTCB");
  const token = await MockBTCB.deploy();
  await token.waitForDeployment();
  console.log("MockBTCB:", await token.getAddress());

  const MockBTCPriceFeed = await ethers.getContractFactory("MockBTCPriceFeed");
  const priceFeed = await MockBTCPriceFeed.deploy(10000000);
  await priceFeed.waitForDeployment();
  console.log("PriceFeed:", await priceFeed.getAddress());

  const IncomeManager = await ethers.getContractFactory("IncomeManager");
  const income = await IncomeManager.deploy();
  await income.waitForDeployment();
  console.log("IncomeManager:", await income.getAddress());

  const TreasuryManager = await ethers.getContractFactory("TreasuryManager");
  const treasury = await TreasuryManager.deploy(await token.getAddress());
  await treasury.waitForDeployment();
  console.log("TreasuryManager:", await treasury.getAddress());

  const BTCPlanCore = await ethers.getContractFactory("BTCPlanCore");
  const core = await BTCPlanCore.deploy(
    await token.getAddress(),
    await priceFeed.getAddress()
  );
  await core.waitForDeployment();
  console.log("BTCPlanCore:", await core.getAddress());

  const InterdependentReward = await ethers.getContractFactory(
    "InterdependentReward"
  );
  const interReward = await InterdependentReward.deploy();
  await interReward.waitForDeployment();
  console.log("InterdependentReward:", await interReward.getAddress());

  const ContributionReward = await ethers.getContractFactory(
    "ContributionReward"
  );
  const contributionReward = await ContributionReward.deploy();
  await contributionReward.waitForDeployment();
  console.log("ContributionReward:", await contributionReward.getAddress());

  const ContributionBooster = await ethers.getContractFactory(
    "ContributionBooster"
  );
  const booster = await ContributionBooster.deploy();
  await booster.waitForDeployment();
  console.log("ContributionBooster:", await booster.getAddress());

  const RankReward = await ethers.getContractFactory("RankReward");
  const rank = await RankReward.deploy();
  await rank.waitForDeployment();
  console.log("RankReward:", await rank.getAddress());

  const CommunityBuilder = await ethers.getContractFactory("CommunityBuilder");
  const community = await CommunityBuilder.deploy(await treasury.getAddress());
  await community.waitForDeployment();
  console.log("CommunityBuilder:", await community.getAddress());

  console.log("Linking contracts...");

  // Core wiring
  await (await core.setTreasury(await treasury.getAddress())).wait();
  await (
    await core.setContributionReward(await contributionReward.getAddress())
  ).wait();
  await (await core.setIncomeManager(await income.getAddress())).wait();
  await (
    await core.setContributionBooster(await booster.getAddress())
  ).wait();
  await (await core.setRankReward(await rank.getAddress())).wait();
  await (
    await core.setInterdependentReward(await interReward.getAddress())
  ).wait();

  // Treasury wiring
  await (await treasury.setCoreContract(await core.getAddress())).wait();
  await (
    await treasury.setRewardContract(await interReward.getAddress())
  ).wait();
  await (
    await treasury.setCommunityBuilderContract(await community.getAddress())
  ).wait();
  await (
    await treasury.setWorkingPayer(await contributionReward.getAddress(), true)
  ).wait();
  await (
    await treasury.setWorkingPayer(await booster.getAddress(), true)
  ).wait();
  await (await treasury.setWorkingPayer(await rank.getAddress(), true)).wait();

  // IncomeManager wiring
  await (await income.setCoreContract(await core.getAddress())).wait();
  await (await income.setRankReward(await rank.getAddress())).wait();
  await (
    await income.setAuthorizedContract(await core.getAddress(), true)
  ).wait();
  await (
    await income.setAuthorizedContract(await interReward.getAddress(), true)
  ).wait();
  await (
    await income.setAuthorizedContract(
      await contributionReward.getAddress(),
      true
    )
  ).wait();
  await (
    await income.setAuthorizedContract(await booster.getAddress(), true)
  ).wait();
  await (
    await income.setAuthorizedContract(await rank.getAddress(), true)
  ).wait();
  await (
    await income.setAuthorizedContract(await community.getAddress(), true)
  ).wait();

  // InterdependentReward wiring
  await (
    await interReward.setCoreContract(await core.getAddress())
  ).wait();
  await (
    await interReward.setTreasury(await treasury.getAddress())
  ).wait();
  await (
    await interReward.setRankReward(await rank.getAddress())
  ).wait();
  await (
    await interReward.setIncomeManager(await income.getAddress())
  ).wait();

  // ContributionReward wiring
  await (
    await contributionReward.setCoreContract(await core.getAddress())
  ).wait();
  await (
    await contributionReward.setIncomeManager(await income.getAddress())
  ).wait();
  await (
    await contributionReward.setTreasury(await treasury.getAddress())
  ).wait();
  await (
    await contributionReward.setRankReward(await rank.getAddress())
  ).wait();

  // Booster wiring
  await (await booster.setCoreContract(await core.getAddress())).wait();
  await (await booster.setIncomeManager(await income.getAddress())).wait();
  await (await booster.setTreasury(await treasury.getAddress())).wait();
  await (await booster.setRankReward(await rank.getAddress())).wait();

  // Rank wiring
  await (await rank.setCoreContract(await core.getAddress())).wait();
  await (
    await rank.setRewardContract(await interReward.getAddress())
  ).wait();
  await (await rank.setIncomeManager(await income.getAddress())).wait();
  await (await rank.setTreasury(await treasury.getAddress())).wait();
  await (
    await rank.setCommunityBuilder(await community.getAddress())
  ).wait();
  await (
    await rank.setSameRankReporter(await interReward.getAddress(), true)
  ).wait();
  await (
    await rank.setSameRankReporter(await contributionReward.getAddress(), true)
  ).wait();
  await (
    await rank.setSameRankReporter(await booster.getAddress(), true)
  ).wait();
  await (
    await rank.setSameRankReporter(await community.getAddress(), true)
  ).wait();

  // Community wiring
  await (
    await community.setRankRewardContract(await rank.getAddress())
  ).wait();
  await (await community.setIncomeManager(await income.getAddress())).wait();

  console.log("Contracts linked successfully");

  const addresses = {
    MockBTCB: await token.getAddress(),
    MockBTCPriceFeed: await priceFeed.getAddress(),
    BTCPlanCore: await core.getAddress(),
    TreasuryManager: await treasury.getAddress(),
    InterdependentReward: await interReward.getAddress(),
    ContributionReward: await contributionReward.getAddress(),
    ContributionBooster: await booster.getAddress(),
    RankReward: await rank.getAddress(),
    CommunityBuilder: await community.getAddress(),
    IncomeManager: await income.getAddress(),
  };

  fs.writeFileSync(
    "deployed-addresses.json",
    JSON.stringify(addresses, null, 2)
  );

  console.log("=======================================");
  console.log("Deployment Completed");
  console.log("=======================================");
  console.log(JSON.stringify(addresses, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
