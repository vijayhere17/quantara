import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("RankReward", function () {
  it("Should store all ecology rank reward percentages", async function () {
    const rankReward = await ethers.deployContract("RankReward");

    expect(await rankReward.rankRewardBps(1)).to.equal(1000n);
    expect(await rankReward.rankRewardBps(2)).to.equal(1500n);
    expect(await rankReward.rankRewardBps(3)).to.equal(2000n);
    expect(await rankReward.rankRewardBps(4)).to.equal(2500n);
    expect(await rankReward.rankRewardBps(5)).to.equal(3000n);
    expect(await rankReward.rankRewardBps(6)).to.equal(3500n);
    expect(await rankReward.rankRewardBps(7)).to.equal(4000n);
    expect(await rankReward.rankRewardBps(8)).to.equal(4500n);
  });

  it("Should return rank income-cap multipliers Q3=5 Q5=6 Q7=7", async function () {
    const [owner, user] = await ethers.getSigners();
    const rankReward = await ethers.deployContract("RankReward");

    expect(await rankReward.getIncomeCapMultiplier(user.address)).to.equal(3n);

    await rankReward.setRank(user.address, 3); // Sapling Q3
    expect(await rankReward.getIncomeCapMultiplier(user.address)).to.equal(5n);

    await rankReward.setRank(user.address, 5); // Forest Q5
    expect(await rankReward.getIncomeCapMultiplier(user.address)).to.equal(6n);

    await rankReward.setRank(user.address, 7); // Ecosphere Q7
    expect(await rankReward.getIncomeCapMultiplier(user.address)).to.equal(7n);
  });

  it("Should automatically qualify user as Seed", async function () {
    const [owner, user1, user2] = await ethers.getSigners();
    const rankReward = await ethers.deployContract("RankReward");
    await rankReward.setCoreContract(owner.address);

    await rankReward.setSponsor(user1.address, owner.address);
    await rankReward.setSponsor(user2.address, owner.address);

    await rankReward.recordPackageVolume(user1.address, 250);
    await rankReward.recordPackageVolume(user2.address, 250);

    expect(await rankReward.userRanks(owner.address)).to.equal(1n);
  });

  it("Should automatically qualify user as Sprout", async function () {
    const [owner, user1, user2, user3] = await ethers.getSigners();
    const rankReward = await ethers.deployContract("RankReward");
    await rankReward.setCoreContract(owner.address);

    await rankReward.setSponsor(user1.address, owner.address);
    await rankReward.setSponsor(user2.address, owner.address);
    await rankReward.setSponsor(user3.address, owner.address);

    await rankReward.recordPackageVolume(user1.address, 2000);
    await rankReward.recordPackageVolume(user2.address, 2000);
    await rankReward.recordPackageVolume(user3.address, 1000);

    expect(await rankReward.userRanks(owner.address)).to.equal(2n);
  });

  it("Should automatically qualify user as Sapling", async function () {
    const [owner, user1, user2, user3, user4] = await ethers.getSigners();
    const rankReward = await ethers.deployContract("RankReward");
    await rankReward.setCoreContract(owner.address);

    await rankReward.setSponsor(user1.address, owner.address);
    await rankReward.setSponsor(user2.address, owner.address);
    await rankReward.setSponsor(user3.address, owner.address);
    await rankReward.setSponsor(user4.address, owner.address);

    await rankReward.recordPackageVolume(user1.address, 10000);
    await rankReward.recordPackageVolume(user2.address, 5000);
    await rankReward.recordPackageVolume(user3.address, 3000);
    await rankReward.recordPackageVolume(user4.address, 2000);

    expect(await rankReward.userRanks(owner.address)).to.equal(3n);
  });

  it("Should automatically qualify Canopy / Forest / Biome / Ecosphere / Genesis", async function () {
    async function qualifyDirects(rankValue: number, expectedOwnerRank: number) {
      const signers = await ethers.getSigners();
      const owner = signers[0];
      const directs = signers.slice(1, 1 + (rankValue >= 6 ? 4 : 3));

      const rankReward = await ethers.deployContract("RankReward");
      await rankReward.setCoreContract(owner.address);

      for (const d of directs) {
        await rankReward.setSponsor(d.address, owner.address);
        await rankReward.setRank(d.address, rankValue);
      }

      await rankReward.updateRank(owner.address);
      expect(await rankReward.userRanks(owner.address)).to.equal(
        BigInt(expectedOwnerRank)
      );
    }

    await qualifyDirects(3, 4);
    await qualifyDirects(4, 5);
    await qualifyDirects(5, 6);
    await qualifyDirects(6, 7);
    await qualifyDirects(7, 8);
  });

  it("Should distribute rank income from downline ROI via IncomeManager", async function () {
    const [owner, sponsor, user] = await ethers.getSigners();

    const mockBTCB = await ethers.deployContract("MockBTCB");
    const treasury = await ethers.deployContract("TreasuryManager", [
      await mockBTCB.getAddress(),
    ]);
    const income = await ethers.deployContract("IncomeManager");
    const rankReward = await ethers.deployContract("RankReward");

    await rankReward.setCoreContract(owner.address);
    await rankReward.setRewardContract(owner.address);
    await rankReward.setIncomeManager(await income.getAddress());
    await rankReward.setTreasury(await treasury.getAddress());

    await treasury.setCoreContract(owner.address);
    await treasury.setWorkingPayer(await rankReward.getAddress(), true);
    await income.setAuthorizedContract(await rankReward.getAddress(), true);
    await income.setAuthorizedContract(owner.address, true);

    await income.startPackage(sponsor.address, 1_000_000n);

    const fund = 50000n;
    await mockBTCB.transfer(await treasury.getAddress(), fund);
    await treasury.processContribution(fund);

    await rankReward.setSponsor(user.address, sponsor.address);
    await rankReward.setRank(sponsor.address, 1);

    await rankReward.processRoiIncome(user.address, 1000n);

    expect(await rankReward.rankIncome(sponsor.address)).to.equal(100n);
    expect(await income.rankEarned(sponsor.address)).to.equal(100n);
    expect(await mockBTCB.balanceOf(sponsor.address)).to.equal(100n);
  });

  it("Should pay 10% Same Rank on eligible income and track sameRankEarned", async function () {
    const [owner, sponsor, user] = await ethers.getSigners();

    const mockBTCB = await ethers.deployContract("MockBTCB");
    const treasury = await ethers.deployContract("TreasuryManager", [
      await mockBTCB.getAddress(),
    ]);
    const income = await ethers.deployContract("IncomeManager");
    const rankReward = await ethers.deployContract("RankReward");

    await rankReward.setCoreContract(owner.address);
    await rankReward.setRewardContract(owner.address);
    await rankReward.setIncomeManager(await income.getAddress());
    await rankReward.setTreasury(await treasury.getAddress());
    await rankReward.setSameRankReporter(owner.address, true);

    await treasury.setCoreContract(owner.address);
    await treasury.setWorkingPayer(await rankReward.getAddress(), true);
    await income.setAuthorizedContract(await rankReward.getAddress(), true);
    await income.setAuthorizedContract(owner.address, true);

    // Both need active packages; sponsor receives SameRank working income
    await income.startPackage(sponsor.address, 1_000_000n);
    await income.startPackage(user.address, 1_000_000n);

    const fund = 100000n;
    await mockBTCB.transfer(await treasury.getAddress(), fund);
    await treasury.processContribution(fund);

    await rankReward.setSponsor(user.address, sponsor.address);
    await rankReward.setRank(sponsor.address, 1);
    await rankReward.setRank(user.address, 1);

    // Eligible income slice = 1000 (e.g. ROI or contribution just accepted)
    await rankReward.processSameRankIncome(user.address, 1000n);

    expect(await rankReward.sameRankIncome(sponsor.address)).to.equal(100n);
    expect(await income.sameRankEarned(sponsor.address)).to.equal(100n);
    expect(await income.rankEarned(sponsor.address)).to.equal(0n);
    expect(await mockBTCB.balanceOf(sponsor.address)).to.equal(100n);
  });

  it("Should not distribute same rank income when ranks differ", async function () {
    const [owner, sponsor, user] = await ethers.getSigners();

    const mockBTCB = await ethers.deployContract("MockBTCB");
    const treasury = await ethers.deployContract("TreasuryManager", [
      await mockBTCB.getAddress(),
    ]);
    const income = await ethers.deployContract("IncomeManager");
    const rankReward = await ethers.deployContract("RankReward");

    await rankReward.setCoreContract(owner.address);
    await rankReward.setRewardContract(owner.address);
    await rankReward.setIncomeManager(await income.getAddress());
    await rankReward.setTreasury(await treasury.getAddress());
    await rankReward.setSameRankReporter(owner.address, true);

    await treasury.setCoreContract(owner.address);
    await treasury.setWorkingPayer(await rankReward.getAddress(), true);
    await income.setAuthorizedContract(await rankReward.getAddress(), true);

    await rankReward.setSponsor(user.address, sponsor.address);
    await rankReward.setRank(sponsor.address, 2);
    await rankReward.setRank(user.address, 1);

    await rankReward.processSameRankIncome(user.address, 1000n);
    expect(await rankReward.sameRankIncome(sponsor.address)).to.equal(0n);
  });
});
