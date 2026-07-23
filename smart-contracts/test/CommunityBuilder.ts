import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("CommunityBuilder", function () {
  it("Should assign correct points for Q5 to Q8 ranks", async function () {
    const [owner, q5, q6, q7, q8] = await ethers.getSigners();

    const mockBTCB = await ethers.deployContract("MockBTCB");
    const treasury = await ethers.deployContract("TreasuryManager", [
      await mockBTCB.getAddress(),
    ]);
    const communityBuilder = await ethers.deployContract("CommunityBuilder", [
      await treasury.getAddress(),
    ]);
    const rankReward = await ethers.deployContract("RankReward");

    await communityBuilder.setRankRewardContract(await rankReward.getAddress());
    await rankReward.setCommunityBuilder(await communityBuilder.getAddress());

    await rankReward.setRank(q5.address, 5);
    await rankReward.setRank(q6.address, 6);
    await rankReward.setRank(q7.address, 7);
    await rankReward.setRank(q8.address, 8);

    expect(await communityBuilder.userPoints(q5.address)).to.equal(1n);
    expect(await communityBuilder.userPoints(q6.address)).to.equal(2n);
    expect(await communityBuilder.userPoints(q7.address)).to.equal(3n);
    expect(await communityBuilder.userPoints(q8.address)).to.equal(4n);
    expect(await communityBuilder.totalPoints()).to.equal(10n);
  });

  it("Should distribute community fund based on snapshot points with income caps", async function () {
    const [owner, q5, q6, q7, q8] = await ethers.getSigners();

    const mockBTCB = await ethers.deployContract("MockBTCB");
    const treasury = await ethers.deployContract("TreasuryManager", [
      await mockBTCB.getAddress(),
    ]);
    await treasury.setCoreContract(owner.address);

    const communityBuilder = await ethers.deployContract("CommunityBuilder", [
      await treasury.getAddress(),
    ]);
    const rankReward = await ethers.deployContract("RankReward");
    const income = await ethers.deployContract("IncomeManager");

  await communityBuilder.setRankRewardContract(await rankReward.getAddress());
  await communityBuilder.setIncomeManager(await income.getAddress());
  await rankReward.setCommunityBuilder(await communityBuilder.getAddress());
  await treasury.setCommunityBuilderContract(
    await communityBuilder.getAddress()
  );
  await rankReward.setSameRankReporter(
    await communityBuilder.getAddress(),
    true
  );

  await income.setAuthorizedContract(owner.address, true);
  await income.setAuthorizedContract(
    await communityBuilder.getAddress(),
    true
  );

    // Large principals so community claims are not capped
    for (const u of [q5, q6, q7, q8]) {
      await income.startPackage(u.address, 1_000_000n);
    }

    const contributionAmount = 50000n;
    await mockBTCB.transfer(await treasury.getAddress(), contributionAmount);
    await treasury.processContribution(contributionAmount);

    await rankReward.setRank(q5.address, 5);
    await rankReward.setRank(q6.address, 6);
    await rankReward.setRank(q7.address, 7);
    await rankReward.setRank(q8.address, 8);

    expect(await communityBuilder.totalPoints()).to.equal(10n);

    await communityBuilder.startDistributionRound();

    expect(await communityBuilder.getPendingReward(q5.address)).to.equal(100n);
    expect(await communityBuilder.getPendingReward(q6.address)).to.equal(200n);
    expect(await communityBuilder.getPendingReward(q7.address)).to.equal(300n);
    expect(await communityBuilder.getPendingReward(q8.address)).to.equal(400n);

    await communityBuilder.connect(q8).claimCommunityReward();
    await communityBuilder.connect(q5).claimCommunityReward();
    await communityBuilder.connect(q7).claimCommunityReward();
    await communityBuilder.connect(q6).claimCommunityReward();

    expect(await communityBuilder.communityIncome(q5.address)).to.equal(100n);
    expect(await communityBuilder.communityIncome(q6.address)).to.equal(200n);
    expect(await communityBuilder.communityIncome(q7.address)).to.equal(300n);
    expect(await communityBuilder.communityIncome(q8.address)).to.equal(400n);

    expect(await income.communityEarned(q5.address)).to.equal(100n);
    expect(await treasury.communityBuilderFundBalance()).to.equal(0n);
  });
});
