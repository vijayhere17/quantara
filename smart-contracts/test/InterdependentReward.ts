import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

async function deploySystem() {
  const [owner, user, user2] = await ethers.getSigners();

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
  await contributionReward.setContributionBooster(
    await contributionBooster.getAddress()
  );

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
  await mockBTCB.mint(owner.address, fund);
  await mockBTCB.mint(user.address, fund);
  await mockBTCB.mint(user2.address, fund);

  return {
    owner,
    user,
    user2,
    mockBTCB,
    treasury,
    core,
    interdependentReward,
    incomeManager,
  };
}

function expectedBps(
  budget: bigint,
  totalPrincipal: bigint,
  maxBps: bigint,
): bigint {
  if (budget === 0n || totalPrincipal === 0n) return 0n;
  const raw = (budget * 10000n) / totalPrincipal;
  return raw > maxBps ? maxBps : raw;
}

describe("InterdependentReward — 5% pool, max 1% per user", function () {
  it("daily budget is exactly 5% of ROI pool", async function () {
    const { owner, user, mockBTCB, core, treasury } = await deploySystem();

    await core.register(ethers.ZeroAddress);
    await mockBTCB.approve(await core.getAddress(), ethers.MaxUint256);
    await core.activatePackage(50);

    await core.connect(user).register(owner.address);
    await mockBTCB.connect(user).approve(await core.getAddress(), ethers.MaxUint256);
    await core.connect(user).activatePackage(50);

    const pool = await treasury.interdependentFundBalance();
    const budget = await treasury.getAvailableDailyRoiBudget();
    expect(budget).to.equal((pool * 5n) / 100n);
    expect(budget).to.be.gt(0n);
  });

  it("caps daily rate at 1% when 5% pool / principal would exceed max", async function () {
    const { owner, user, mockBTCB, core, treasury, interdependentReward } =
      await deploySystem();

    await core.register(ethers.ZeroAddress);
    await mockBTCB.approve(await core.getAddress(), ethers.MaxUint256);
    await core.activatePackage(50);

    await core.connect(user).register(owner.address);
    await mockBTCB.connect(user).approve(await core.getAddress(), ethers.MaxUint256);
    await core.connect(user).activatePackage(50);

    const budget = await treasury.getAvailableDailyRoiBudget();
    const total = await interdependentReward.totalActivePrincipal();
    const maxBps = await interdependentReward.MAX_DAILY_ROI_BPS();
    const rawBps = (budget * 10000n) / total;

    expect(rawBps).to.be.gt(maxBps);

    const bps = await interdependentReward.calculateDailyRoiBps();
    expect(bps).to.equal(maxBps);
    expect(bps).to.equal(expectedBps(budget, total, maxBps));
  });

  it("user share is min(pro-rata 5% pool, 1% of package)", async function () {
    const { owner, user, mockBTCB, core, treasury, interdependentReward } =
      await deploySystem();

    await core.register(ethers.ZeroAddress);
    await mockBTCB.approve(await core.getAddress(), ethers.MaxUint256);
    await core.activatePackage(50);

    await core.connect(user).register(owner.address);
    await mockBTCB.connect(user).approve(await core.getAddress(), ethers.MaxUint256);
    await core.connect(user).activatePackage(50);

    const budget = await treasury.getAvailableDailyRoiBudget();
    const aOwner = await interdependentReward.roiAccounts(owner.address);
    const proRataOwner =
      (budget * aOwner.principal) /
      (await interdependentReward.totalActivePrincipal());
    const maxOwner = (aOwner.principal * 100n) / 10000n;
    const shareOwner = await interdependentReward.getUserDailyRoiShare(
      owner.address,
    );

    expect(shareOwner).to.equal(proRataOwner < maxOwner ? proRataOwner : maxOwner);
    expect(shareOwner).to.equal(maxOwner); // capped at 1% in typical 2-user $50 setup
  });

  it("unused 5% pool stays in ROI wallet when 1% cap binds", async function () {
    const { owner, mockBTCB, core, treasury, interdependentReward } =
      await deploySystem();

    await core.register(ethers.ZeroAddress);
    await mockBTCB.approve(await core.getAddress(), ethers.MaxUint256);
    await core.activatePackage(50);

    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);

    const poolBefore = await treasury.interdependentFundBalance();
    const budget = await treasury.getAvailableDailyRoiBudget();
    const pending = await interdependentReward.getPendingRoi(owner.address);

    expect(pending).to.be.gt(0n);
    expect(pending).to.be.lt(budget); // 1% of package < full 5% pool for one user

    await interdependentReward.connect(owner).claimRoi();

    const poolAfter = await treasury.interdependentFundBalance();
    const used = poolBefore - poolAfter;
    // Gross leaves pool; net less after recycle — but definitely not full 5% budget
    expect(used).to.be.lt(budget);
  });

  it("pending ROI for one day equals getUserDailyRoiShare", async function () {
    const { owner, user, mockBTCB, core, interdependentReward } =
      await deploySystem();

    await core.register(ethers.ZeroAddress);
    await mockBTCB.approve(await core.getAddress(), ethers.MaxUint256);
    await core.activatePackage(50);

    await core.connect(user).register(owner.address);
    await mockBTCB.connect(user).approve(await core.getAddress(), ethers.MaxUint256);
    await core.connect(user).activatePackage(50);

    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);

    const share = await interdependentReward.getUserDailyRoiShare(user.address);
    const pending = await interdependentReward.getPendingRoi(user.address);
    expect(pending).to.equal(share);
    expect(pending).to.be.gt(0n);
  });

  it("distributeDailyRoi pays active users within 5% budget", async function () {
    const { owner, user, user2, mockBTCB, core, treasury, interdependentReward } =
      await deploySystem();

    await core.register(ethers.ZeroAddress);
    await mockBTCB.approve(await core.getAddress(), ethers.MaxUint256);
    await core.activatePackage(50);

    await core.connect(user).register(owner.address);
    await mockBTCB.connect(user).approve(await core.getAddress(), ethers.MaxUint256);
    await core.connect(user).activatePackage(50);

    await core.connect(user2).register(user.address);
    await mockBTCB.connect(user2).approve(await core.getAddress(), ethers.MaxUint256);
    await core.connect(user2).activatePackage(50);

    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);

    const budget = await treasury.getAvailableDailyRoiBudget();
    const tx = await interdependentReward.distributeDailyRoi(0, 100);
    await tx.wait();

    const used = await interdependentReward.dailyBudgetUsed();
    expect(used).to.be.lte(budget);
    expect(used).to.be.gt(0n);

    await expect(
      interdependentReward.connect(user).distributeDailyRoi(0, 10),
    ).to.be.revertedWith("Only owner");
  });
});
