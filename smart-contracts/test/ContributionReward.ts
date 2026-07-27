import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("ContributionReward", function () {
  async function setup() {
    const [owner, level3, level2, level1, user] = await ethers.getSigners();

    const mockBTCB = await ethers.deployContract("MockBTCB");
    const treasury = await ethers.deployContract("TreasuryManager", [
      await mockBTCB.getAddress(),
    ]);
    const income = await ethers.deployContract("IncomeManager");
    const contributionReward = await ethers.deployContract(
      "ContributionReward",
    );
    const booster = await ethers.deployContract("ContributionBooster");
    const rank = await ethers.deployContract("RankReward");

    await contributionReward.setCoreContract(owner.address);
    await contributionReward.setIncomeManager(await income.getAddress());
    await contributionReward.setTreasury(await treasury.getAddress());
    await contributionReward.setRankReward(await rank.getAddress());
    await contributionReward.setContributionBooster(await booster.getAddress());

    await booster.setCoreContract(owner.address);

    await treasury.setCoreContract(owner.address);
    await treasury.setWorkingPayer(await contributionReward.getAddress(), true);
    await treasury.setWorkingPayer(await rank.getAddress(), true);

    await income.setAuthorizedContract(owner.address, true);
    await income.setAuthorizedContract(
      await contributionReward.getAddress(),
      true,
    );
    await income.setAuthorizedContract(await rank.getAddress(), true);

    await rank.setSameRankReporter(await contributionReward.getAddress(), true);

    await income.startPackage(level1.address, 1_000_000n);
    await income.startPackage(level2.address, 1_000_000n);
    await income.startPackage(level3.address, 1_000_000n);

    await contributionReward.setSponsor(level2.address, level3.address);
    await contributionReward.setSponsor(level1.address, level2.address);
    await contributionReward.setSponsor(user.address, level1.address);

    await booster.registerUser(level3.address, ethers.ZeroAddress);
    await booster.registerUser(level2.address, level3.address);
    await booster.registerUser(level1.address, level2.address);
    await booster.registerUser(user.address, level1.address);

    return {
      owner,
      level3,
      level2,
      level1,
      user,
      mockBTCB,
      treasury,
      income,
      contributionReward,
      booster,
    };
  }

  it("Should distribute 5%, 3%, and 2% and pay from working fund", async function () {
    const {
      level3,
      level2,
      level1,
      user,
      mockBTCB,
      treasury,
      income,
      contributionReward,
    } = await setup();

    const contributionAmount = 10000n;
    await mockBTCB.transfer(await treasury.getAddress(), contributionAmount);
    await treasury.processContribution(contributionAmount);

    await contributionReward.processContribution(
      user.address,
      contributionAmount,
    );

    expect(await contributionReward.levelIncome(level1.address, 1)).to.equal(
      500n,
    );
    expect(await contributionReward.levelIncome(level2.address, 2)).to.equal(
      300n,
    );
    expect(await contributionReward.levelIncome(level3.address, 3)).to.equal(
      200n,
    );

    expect(await income.contributionEarned(level1.address)).to.equal(500n);
    expect(await income.contributionEarned(level2.address)).to.equal(300n);
    expect(await income.contributionEarned(level3.address)).to.equal(200n);

    // Phase 2: wallet receives 70% after income recycling
    expect(await mockBTCB.balanceOf(level1.address)).to.equal(350n);
    expect(await mockBTCB.balanceOf(level2.address)).to.equal(210n);
    expect(await mockBTCB.balanceOf(level3.address)).to.equal(140n);

    expect(await treasury.reserveFundBalance()).to.equal(30n); // 3% of 1000
    expect(await treasury.communityBuilderFundBalance()).to.equal(20n); // 2% of 1000
  });

  it("replaces L1 Direct Income with 10% while Growth Accelerator is active", async function () {
    const {
      level1,
      user,
      mockBTCB,
      treasury,
      income,
      contributionReward,
      booster,
      owner,
    } = await setup();

    // Qualify level1 via 50:50 volume from two directs
    const [, , , , , directA, directB] = await ethers.getSigners();
    await booster.registerUser(directA.address, level1.address);
    await booster.registerUser(directB.address, level1.address);
    await booster.processPackage(directA.address, 1500);
    await booster.processPackage(directB.address, 1500);
    expect(await booster.isBoosterActive(level1.address)).to.equal(true);
    expect(await contributionReward.getLevel1Bps(level1.address)).to.equal(
      1000n,
    );

    const contributionAmount = 10000n;
    await mockBTCB.transfer(await treasury.getAddress(), contributionAmount);
    await treasury.processContribution(contributionAmount);

    await contributionReward.processContribution(
      user.address,
      contributionAmount,
    );

    // L1 = 10% (replaces 5%), still Contribution income — not additive Booster
    expect(await contributionReward.levelIncome(level1.address, 1)).to.equal(
      1000n,
    );
    expect(await income.contributionEarned(level1.address)).to.equal(1000n);
    expect(await income.boosterEarned(level1.address)).to.equal(0n);
    expect(await mockBTCB.balanceOf(level1.address)).to.equal(700n); // 70% of 1000
    expect(owner.address).to.not.equal(ethers.ZeroAddress);
  });

  it("returns L1 Direct Income to 5% after Growth Accelerator expires", async function () {
    const { level1, user, mockBTCB, treasury, contributionReward, booster } =
      await setup();

    const [, , , , , directA, directB] = await ethers.getSigners();
    await booster.registerUser(directA.address, level1.address);
    await booster.registerUser(directB.address, level1.address);
    await booster.processPackage(directA.address, 1500);
    await booster.processPackage(directB.address, 1500);
    expect(await booster.isBoosterActive(level1.address)).to.equal(true);

    await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);
    expect(await booster.isBoosterActive(level1.address)).to.equal(false);
    expect(await contributionReward.getLevel1Bps(level1.address)).to.equal(
      500n,
    );

    const contributionAmount = 10000n;
    await mockBTCB.transfer(await treasury.getAddress(), contributionAmount);
    await treasury.processContribution(contributionAmount);
    await contributionReward.processContribution(
      user.address,
      contributionAmount,
    );

    expect(await contributionReward.levelIncome(level1.address, 1)).to.equal(
      500n,
    );
  });
});
