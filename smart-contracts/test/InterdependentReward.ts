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

function expectedDynamicBps(
  availableDailyBudget: bigint,
  totalActivePrincipal: bigint,
  minBps: bigint,
  maxBps: bigint,
): bigint {
  if (availableDailyBudget === 0n || totalActivePrincipal === 0n) return 0n;
  const raw = (availableDailyBudget * 10000n) / totalActivePrincipal;
  if (raw > maxBps) return maxBps;
  if (raw < minBps) return minBps;
  return raw;
}

describe("InterdependentReward — dynamic ROI", function () {
  it("exposes MIN 0.10% and MAX 1.00% constants", async function () {
    const { interdependentReward } = await deploySystem();
    expect(await interdependentReward.MIN_DAILY_ROI_BPS()).to.equal(10n);
    expect(await interdependentReward.MAX_DAILY_ROI_BPS()).to.equal(100n);
  });

  it("caps daily rate at 1% when ROI wallet / principal would exceed max", async function () {
    const { owner, user, mockBTCB, core, treasury, interdependentReward } =
      await deploySystem();

    await core.register(ethers.ZeroAddress);
    await mockBTCB.approve(await core.getAddress(), ethers.MaxUint256);
    await core.activatePackage(50);

    await core.connect(user).register(owner.address);
    await mockBTCB.connect(user).approve(await core.getAddress(), ethers.MaxUint256);
    await core.connect(user).activatePackage(50);

    // Fresh activations: ROI fund = 25% of principals → raw bps ≈ 125 → clamp to 100
    const budget = await treasury.getAvailableDailyRoiBudget();
    const total = await interdependentReward.totalActivePrincipal();
    const minBps = await interdependentReward.MIN_DAILY_ROI_BPS();
    const maxBps = await interdependentReward.MAX_DAILY_ROI_BPS();
    const expectBps = expectedDynamicBps(budget, total, minBps, maxBps);

    const bps = await interdependentReward.calculateDailyRoiBps();
    expect(bps).to.equal(expectBps);
    expect(bps).to.equal(100n); // max clamp
    expect(bps).to.be.gte(minBps);
    expect(bps).to.be.lte(maxBps);
  });

  it("lowers daily rate as ROI wallet shrinks (still within 0.10%–1.00%)", async function () {
    const { owner, user, mockBTCB, core, treasury, interdependentReward } =
      await deploySystem();

    await core.register(ethers.ZeroAddress);
    await mockBTCB.approve(await core.getAddress(), ethers.MaxUint256);
    await core.activatePackage(50);

    await core.connect(user).register(owner.address);
    await mockBTCB.connect(user).approve(await core.getAddress(), ethers.MaxUint256);
    await core.connect(user).activatePackage(50);

    const bpsStart = await interdependentReward.calculateDailyRoiBps();
    expect(bpsStart).to.equal(100n);

    // Drain ROI wallet via repeated 1-day claims (both users) until rate drops below max
    let bpsNow = bpsStart;
    for (let i = 0; i < 40 && bpsNow >= 100n; i++) {
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);
      try {
        await interdependentReward.connect(owner).claimRoi();
      } catch {
        // budget / cap
      }
      try {
        await interdependentReward.connect(user).claimRoi();
      } catch {
        // budget / cap
      }
      bpsNow = await interdependentReward.calculateDailyRoiBps();
    }

    const budget = await treasury.getAvailableDailyRoiBudget();
    const total = await interdependentReward.totalActivePrincipal();
    const minBps = await interdependentReward.MIN_DAILY_ROI_BPS();
    const maxBps = await interdependentReward.MAX_DAILY_ROI_BPS();

    if (budget > 0n && total > 0n) {
      const expectBps = expectedDynamicBps(budget, total, minBps, maxBps);
      expect(bpsNow).to.equal(expectBps);
      expect(bpsNow).to.be.gte(minBps);
      expect(bpsNow).to.be.lte(maxBps);
      // After enough claims, rate should leave the max ceiling
      expect(bpsNow).to.be.lt(100n);
    }
  });

  it("pending ROI uses dynamic bps for exactly one day", async function () {
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

    const bps = await interdependentReward.calculateDailyRoiBps();
    const account = await interdependentReward.roiAccounts(user.address);
    const pending = await interdependentReward.getPendingRoi(user.address);
    expect(pending).to.equal((account.principal * bps * 1n) / 10000n);
    expect(pending).to.be.gt(0n);
  });

  it("tracks activeRoiUsers and distributes via distributeDailyRoi", async function () {
    const { owner, user, user2, mockBTCB, core, interdependentReward } =
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
    expect(await interdependentReward.activeIndex(owner.address)).to.be.gt(0n);
    expect(await interdependentReward.activeIndex(user.address)).to.be.gt(0n);
    expect(await interdependentReward.activeIndex(user2.address)).to.be.gt(0n);

    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);

    const userBalBefore = await mockBTCB.balanceOf(user.address);
    const ownerBalBefore = await mockBTCB.balanceOf(owner.address);
    const user2BalBefore = await mockBTCB.balanceOf(user2.address);

    const tx = await interdependentReward.distributeDailyRoi(0, 100);
    const receipt = await tx.wait();
    expect(receipt?.status).to.equal(1);

    // All three should have been paid (daily budget sufficient for one day at max bps)
    expect(await mockBTCB.balanceOf(owner.address)).to.be.gt(ownerBalBefore);
    expect(await mockBTCB.balanceOf(user.address)).to.be.gt(userBalBefore);
    expect(await mockBTCB.balanceOf(user2.address)).to.be.gt(user2BalBefore);

    // claimRoi still works as fallback the next day
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);
    const afterDist = await mockBTCB.balanceOf(user.address);
    await interdependentReward.connect(user).claimRoi();
    expect(await mockBTCB.balanceOf(user.address)).to.be.gt(afterDist);

    // Non-owner cannot distribute
    await expect(
      interdependentReward.connect(user).distributeDailyRoi(0, 10),
    ).to.be.revertedWith("Only owner");
  });
});
