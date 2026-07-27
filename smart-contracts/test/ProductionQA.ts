/**
 * Production QA — distribution, caps, same-rank achievement.
 */
import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

async function deployWired() {
  const [owner, alice, bob] = await ethers.getSigners();

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
  await rankReward.setSameRankReporter(await communityBuilder.getAddress(), true);

  await communityBuilder.setRankRewardContract(await rankReward.getAddress());
  await communityBuilder.setIncomeManager(await incomeManager.getAddress());

  const fund = ethers.parseEther("1000");
  await mockBTCB.mint(owner.address, fund);
  await mockBTCB.mint(alice.address, fund);
  await mockBTCB.mint(bob.address, fund);

  return {
    owner,
    alice,
    bob,
    mockBTCB,
    treasury,
    incomeManager,
    rankReward,
    core,
  };
}

describe("ProductionQA", function () {
  it("distributes activation as 30% ROI pool + 70% working (5% of working → charity)", async function () {
    const { mockBTCB, core, treasury } = await deployWired();

    await core.register(ethers.ZeroAddress);
    await mockBTCB.approve(await core.getAddress(), ethers.MaxUint256);
    await core.activatePackage(50);

    const regen = await treasury.regenerationFundBalance();
    const roi = await treasury.interdependentFundBalance();
    const reserve = await treasury.reserveFundBalance();
    const community = await treasury.communityBuilderFundBalance();
    const charity = await treasury.charityFundBalance();
    const working = await treasury.workingFundBalance();
    const sum = regen + roi + reserve + community + charity + working;

    expect(sum).to.be.gt(0n);
    expect(regen).to.equal(0n);
    expect(reserve).to.equal(0n);
    expect(community).to.equal(0n);

    // BPS ratios within 1 bps of target (flooring)
    const bps = (part: bigint) => (part * 10000n) / sum;
    expect(bps(roi) >= 2999n && bps(roi) <= 3000n).to.equal(true);
    // Charity ≈ 3.5% of package (5% of 70%)
    expect(bps(charity) >= 349n && bps(charity) <= 351n).to.equal(true);
    // Working incomes ≈ 66.5%
    expect(bps(working) >= 6649n && bps(working) <= 6651n).to.equal(true);
  });

  it("stops ROI when total income hits 3X even if ROI stream alone is under 3X", async function () {
    const { owner, mockBTCB, core, incomeManager } = await deployWired();

    await core.register(ethers.ZeroAddress);
    await mockBTCB.approve(await core.getAddress(), ethers.MaxUint256);
    await core.activatePackage(50);

    const principal = await incomeManager.principal(owner.address);
    await incomeManager.setAuthorizedContract(owner.address, true);

    // 2.5X Contribution (working)
    await incomeManager.recordIncome(owner.address, (principal * 25n) / 10n, 1);

    const remaining = await incomeManager.getRemainingRoiCap(owner.address);
    const half = principal / 2n;
    expect(remaining === half || remaining === half + 1n || remaining === half - 1n).to.equal(
      true,
    );

    await incomeManager.recordIncome(owner.address, principal, 0);
    expect(await incomeManager.isRoiCapReached(owner.address)).to.equal(true);
    expect(await incomeManager.getRemainingWorkingCap(owner.address)).to.be.gt(0n);
  });

  it("pays one-time same-rank achievement bonus of 10% total income", async function () {
    const { owner, alice, mockBTCB, core, incomeManager, rankReward } =
      await deployWired();

    await core.register(ethers.ZeroAddress);
    await mockBTCB.approve(await core.getAddress(), ethers.MaxUint256);
    await core.activatePackage(50);

    await core.connect(alice).register(owner.address);
    await mockBTCB.connect(alice).approve(await core.getAddress(), ethers.MaxUint256);
    await core.connect(alice).activatePackage(50);

    await incomeManager.setAuthorizedContract(owner.address, true);
    const principal = await incomeManager.principal(alice.address);
    await incomeManager.recordIncome(alice.address, principal, 1);

    await rankReward.setRank(owner.address, 1); // Seed
    const before = await rankReward.sameRankAchievementIncome(owner.address);
    await rankReward.setRank(alice.address, 1); // Seed — matches sponsor

    const after = await rankReward.sameRankAchievementIncome(owner.address);
    expect(after - before).to.equal(principal / 10n);
    expect(await rankReward.sameRankAchievementPaid(alice.address, owner.address, 1)).to.equal(
      true,
    );
  });
});
