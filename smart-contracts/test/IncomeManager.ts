import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("IncomeManager", function () {
  async function deploy() {
    const [owner, user] = await ethers.getSigners();

    const mockBTCB = await ethers.deployContract("MockBTCB");
    const priceFeed = await ethers.deployContract("MockBTCPriceFeed", [60000]);
    const planCore = await ethers.deployContract("BTCPlanCore", [
      await mockBTCB.getAddress(),
      await priceFeed.getAddress(),
    ]);
    const income = await ethers.deployContract("IncomeManager");
    const treasury = await ethers.deployContract("TreasuryManager", [
      await mockBTCB.getAddress(),
    ]);
    const reward = await ethers.deployContract("InterdependentReward");
    const rank = await ethers.deployContract("RankReward");

    await planCore.setTreasury(await treasury.getAddress());
    await planCore.setIncomeManager(await income.getAddress());
    await planCore.setInterdependentReward(await reward.getAddress());
    await treasury.setCoreContract(await planCore.getAddress());
    await treasury.setRewardContract(await reward.getAddress());
    await reward.setCoreContract(await planCore.getAddress());
    await reward.setTreasury(await treasury.getAddress());
    await reward.setIncomeManager(await income.getAddress());
    await income.setCoreContract(await planCore.getAddress());
    await income.setRankReward(await rank.getAddress());
    await income.setAuthorizedContract(owner.address, true);
    await income.setAuthorizedContract(await planCore.getAddress(), true);
    await income.setAuthorizedContract(await reward.getAddress(), true);

    await planCore.register(ethers.ZeroAddress);
    await mockBTCB.approve(await planCore.getAddress(), ethers.MaxUint256);
    await planCore.activatePackage(50);

    return { owner, user, income, planCore, mockBTCB, rank };
  }

  it("Should enforce independent 3X ROI cap without reducing Working 4X", async function () {
    const { owner, income, planCore } = await deploy();

    const principal = await income.principal(owner.address);
    expect(await income.getRoiCap(owner.address)).to.equal(principal * 3n);
    expect(await income.getWorkingCap(owner.address)).to.equal(principal * 4n);

    await income.recordIncome(owner.address, principal * 3n, 0); // ROI

    expect(await income.roiEarned(owner.address)).to.equal(principal * 3n);
    expect(await income.isRoiCapReached(owner.address)).to.equal(true);
    expect((await planCore.users(owner.address)).packageCompleted).to.equal(
      true
    );

    // ROI stops
    expect(
      await income.recordIncome.staticCall(owner.address, 100n, 0)
    ).to.equal(0n);

    // Working capacity still fully available (ROI must not reduce it)
    expect(await income.getRemainingWorkingCap(owner.address)).to.equal(
      principal * 4n
    );

    await income.recordIncome(owner.address, principal * 2n, 1); // Contribution
    expect(await income.contributionEarned(owner.address)).to.equal(
      principal * 2n
    );
    expect(await income.workingEarned(owner.address)).to.equal(principal * 2n);
  });

  it("Should stop ROI when Working already pushed total past 3X", async function () {
    const { owner, income, planCore } = await deploy();

    const principal = await income.principal(owner.address);

    await income.recordIncome(owner.address, principal * 4n, 1); // Contribution fills working

    expect(await income.workingEarned(owner.address)).to.equal(principal * 4n);
    expect(await income.isWorkingCapReached(owner.address)).to.equal(true);
    expect((await planCore.users(owner.address)).packageCompleted).to.equal(
      true
    );

    // Further working rejected
    expect(
      await income.recordIncome.staticCall(owner.address, 10n, 2)
    ).to.equal(0n);

    // Business plan: total already at 4X (>= 3X) → ROI stopped
    expect(await income.getRemainingRoiCap(owner.address)).to.equal(0n);
    expect(await income.isRoiCapReached(owner.address)).to.equal(true);
  });

  it("Should allow ROI only up to total 3X when working already earned", async function () {
    const { owner, income } = await deploy();

    const principal = await income.principal(owner.address);
    await income.recordIncome(owner.address, principal * 2n, 1); // 2X working

    // ROI room = min(3X stream, 1X to hit total 3X) = 1X
    expect(await income.getRemainingRoiCap(owner.address)).to.equal(principal);
    const accepted = await income.recordIncome.staticCall(
      owner.address,
      principal * 3n,
      0,
    );
    expect(accepted).to.equal(principal);
  });

  it("Should track SameRank income separately", async function () {
    const { owner, income } = await deploy();

    await income.recordIncome(owner.address, 10n, 0); // ROI
    await income.recordIncome(owner.address, 20n, 1); // Contribution
    await income.recordIncome(owner.address, 30n, 2); // Booster
    await income.recordIncome(owner.address, 40n, 3); // Rank
    await income.recordIncome(owner.address, 50n, 4); // SameRank
    await income.recordIncome(owner.address, 60n, 5); // Community

    expect(await income.roiEarned(owner.address)).to.equal(10n);
    expect(await income.contributionEarned(owner.address)).to.equal(20n);
    expect(await income.boosterEarned(owner.address)).to.equal(30n);
    expect(await income.rankEarned(owner.address)).to.equal(40n);
    expect(await income.sameRankEarned(owner.address)).to.equal(50n);
    expect(await income.communityEarned(owner.address)).to.equal(60n);
    expect(await income.totalEarned(owner.address)).to.equal(210n);
    expect(await income.workingEarned(owner.address)).to.equal(200n);
  });

  it("Should expose rank multipliers but not apply them by default", async function () {
    const { owner, income, rank } = await deploy();

    await rank.setRank(owner.address, 3); // Sapling → 5X
    expect(await rank.getIncomeCapMultiplier(owner.address)).to.equal(5n);

    const principal = await income.principal(owner.address);
    // Flag off → still 3X
    expect(await income.getRoiCap(owner.address)).to.equal(principal * 3n);

    await income.setApplyRankCapMultipliers(true);
    expect(await income.getRoiCap(owner.address)).to.equal(principal * 5n);
  });

  it("Should reject unauthorized callers", async function () {
    const { user, income } = await deploy();

    await expect(
      income.connect(user).startPackage(user.address, 100n)
    ).to.be.revertedWith("Not authorized");

    await expect(
      income.connect(user).recordIncome(user.address, 10n, 0)
    ).to.be.revertedWith("Not authorized");
  });
});
