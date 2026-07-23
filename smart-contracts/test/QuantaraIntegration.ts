import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

/**
 * End-to-end independent caps + same-rank tracking.
 */
describe("Quantara Integration", function () {
  it("Should keep ROI 3X and Working 4X independent then unlock next package", async function () {
    const [owner] = await ethers.getSigners();

    const mockBTCB = await ethers.deployContract("MockBTCB");
    const priceFeed = await ethers.deployContract("MockBTCPriceFeed", [60000]);
    const income = await ethers.deployContract("IncomeManager");
    const treasury = await ethers.deployContract("TreasuryManager", [
      await mockBTCB.getAddress(),
    ]);
    const core = await ethers.deployContract("BTCPlanCore", [
      await mockBTCB.getAddress(),
      await priceFeed.getAddress(),
    ]);
    const reward = await ethers.deployContract("InterdependentReward");
    const contribution = await ethers.deployContract("ContributionReward");
    const booster = await ethers.deployContract("ContributionBooster");
    const rank = await ethers.deployContract("RankReward");

    await core.setTreasury(await treasury.getAddress());
    await core.setIncomeManager(await income.getAddress());
    await core.setInterdependentReward(await reward.getAddress());
    await core.setContributionReward(await contribution.getAddress());
    await core.setContributionBooster(await booster.getAddress());
    await core.setRankReward(await rank.getAddress());

    await treasury.setCoreContract(await core.getAddress());
    await treasury.setRewardContract(await reward.getAddress());
    await treasury.setWorkingPayer(await contribution.getAddress(), true);
    await treasury.setWorkingPayer(await booster.getAddress(), true);
    await treasury.setWorkingPayer(await rank.getAddress(), true);

    await income.setCoreContract(await core.getAddress());
    await income.setRankReward(await rank.getAddress());
    await income.setAuthorizedContract(await core.getAddress(), true);
    await income.setAuthorizedContract(await reward.getAddress(), true);
    await income.setAuthorizedContract(await contribution.getAddress(), true);
    await income.setAuthorizedContract(await booster.getAddress(), true);
    await income.setAuthorizedContract(await rank.getAddress(), true);
    await income.setAuthorizedContract(owner.address, true);

    await reward.setCoreContract(await core.getAddress());
    await reward.setTreasury(await treasury.getAddress());
    await reward.setIncomeManager(await income.getAddress());
    await reward.setRankReward(await rank.getAddress());

    await contribution.setCoreContract(await core.getAddress());
    await contribution.setIncomeManager(await income.getAddress());
    await contribution.setTreasury(await treasury.getAddress());
    await contribution.setRankReward(await rank.getAddress());

    await booster.setCoreContract(await core.getAddress());
    await booster.setIncomeManager(await income.getAddress());
    await booster.setTreasury(await treasury.getAddress());
    await booster.setRankReward(await rank.getAddress());

    await rank.setCoreContract(await core.getAddress());
    await rank.setRewardContract(await reward.getAddress());
    await rank.setIncomeManager(await income.getAddress());
    await rank.setTreasury(await treasury.getAddress());

    await core.register(ethers.ZeroAddress);
    await mockBTCB.approve(await core.getAddress(), ethers.MaxUint256);
    await core.activatePackage(50);

    const principal = await income.principal(owner.address);

    // Fill ROI 3X — unlocks package, does not touch working room
    await income.recordIncome(owner.address, principal * 3n, 0);
    expect(await income.roiEarned(owner.address)).to.equal(principal * 3n);
    expect(await income.getRemainingWorkingCap(owner.address)).to.equal(
      principal * 4n
    );
    expect((await core.users(owner.address)).packageCompleted).to.equal(true);
    expect((await reward.roiAccounts(owner.address)).isActive).to.equal(false);

    // Fill Working 4X across types including SameRank
    const quarter = principal;
    await income.recordIncome(owner.address, quarter, 1); // Contribution
    await income.recordIncome(owner.address, quarter, 2); // Booster
    await income.recordIncome(owner.address, quarter, 3); // Rank
    await income.recordIncome(owner.address, quarter, 4); // SameRank

    expect(await income.workingEarned(owner.address)).to.equal(principal * 4n);
    expect(await income.sameRankEarned(owner.address)).to.equal(quarter);
    expect(await income.isWorkingCapReached(owner.address)).to.equal(true);

    // Next package unlocks (already completed on ROI); activate C2
    const [nextPkg, nextCycle] = await core.getNextEligiblePackage(
      owner.address
    );
    expect(nextPkg).to.equal(50n);
    expect(nextCycle).to.equal(2n);

    await core.activatePackage(50);
    expect(await income.totalEarned(owner.address)).to.equal(0n);
    expect(await income.principal(owner.address)).to.equal(
      await core.getPackageBTCBAmount(50)
    );
  });
});
