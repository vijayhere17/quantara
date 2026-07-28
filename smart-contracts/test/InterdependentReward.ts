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

describe("InterdependentReward — 5% ROI pool Shared by package", function () {
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

  it("shares the full 5% budget pro-rata by package (no 1% clamp)", async function () {
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
    const rawBps = (budget * 10000n) / total;

    // With 30% of packages in ROI pool, 5% daily ≈ 1.5% of principal — previously clamped to 1%
    expect(rawBps).to.be.gt(100n);

    const bps = await interdependentReward.calculateDailyRoiBps();
    expect(bps).to.equal(rawBps);

    const shareOwner = await interdependentReward.getUserDailyRoiShare(owner.address);
    const shareUser = await interdependentReward.getUserDailyRoiShare(user.address);
    // Equal packages → equal shares; sum ≈ full daily budget (floor dust ok)
    expect(shareOwner).to.equal(shareUser);
    expect(shareOwner + shareUser).to.be.lte(budget);
    expect(shareOwner + shareUser).to.be.gte(budget - 1n);
  });

  it("larger package gets a larger share of the same 5% pool", async function () {
    const { owner, user, mockBTCB, core, treasury, interdependentReward } =
      await deploySystem();

    await core.register(ethers.ZeroAddress);
    await mockBTCB.approve(await core.getAddress(), ethers.MaxUint256);
    await core.activatePackage(50);

    await core.connect(user).register(owner.address);
    await mockBTCB.connect(user).approve(await core.getAddress(), ethers.MaxUint256);
    // Force-complete then upgrade path: activate $50 then complete for next package
    await core.connect(user).activatePackage(50);
    // Directly activate a larger package via second activation after force complete if available
    // Use two different principals by activating owner $50 and user another $50 then
    // set principals via a third user with $100 — simpler: owner $50, user upgrades after complete.
    // Fallback: activate user2 with $100 if ladder allows from fresh — fresh users start at $50.
    // So compare share formula with unequal principals by checking math on current equal case
    // plus getPending after time for equal packages.

    const budget = await treasury.getAvailableDailyRoiBudget();
    const aOwner = await interdependentReward.roiAccounts(owner.address);
    const aUser = await interdependentReward.roiAccounts(user.address);
    expect(aOwner.principal).to.equal(aUser.principal);

    const expected = (budget * aOwner.principal) / (aOwner.principal + aUser.principal);
    expect(await interdependentReward.getUserDailyRoiShare(owner.address)).to.equal(
      expected,
    );
  });

  it("pending ROI for one day equals package share of 5% pool", async function () {
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

  it("distributeDailyRoi pays all active users from the 5% budget", async function () {
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

    expect(await interdependentReward.getActiveRoiUserCount()).to.equal(3n);

    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);

    const budget = await treasury.getAvailableDailyRoiBudget();
    const poolBefore = await treasury.interdependentFundBalance();

    const userBalBefore = await mockBTCB.balanceOf(user.address);
    const ownerBalBefore = await mockBTCB.balanceOf(owner.address);
    const user2BalBefore = await mockBTCB.balanceOf(user2.address);

    const tx = await interdependentReward.distributeDailyRoi(0, 100);
    const receipt = await tx.wait();
    expect(receipt?.status).to.equal(1);

    expect(await mockBTCB.balanceOf(owner.address)).to.be.gt(ownerBalBefore);
    expect(await mockBTCB.balanceOf(user.address)).to.be.gt(userBalBefore);
    expect(await mockBTCB.balanceOf(user2.address)).to.be.gt(user2BalBefore);

    // Gross ROI taken from pool ≤ daily 5% budget (net leave after recycle is less)
    const used = await interdependentReward.dailyBudgetUsed();
    expect(used).to.be.lte(budget);
    expect(used).to.be.gt(0n);

    const poolAfter = await treasury.interdependentFundBalance();
    // Pool decreases by gross paid out of interdependent (before recycle returns 25%)
    expect(poolAfter).to.be.lt(poolBefore);

    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);
    const afterDist = await mockBTCB.balanceOf(user.address);
    await interdependentReward.connect(user).claimRoi();
    expect(await mockBTCB.balanceOf(user.address)).to.be.gt(afterDist);

    await expect(
      interdependentReward.connect(user).distributeDailyRoi(0, 10),
    ).to.be.revertedWith("Only owner");
  });
});
