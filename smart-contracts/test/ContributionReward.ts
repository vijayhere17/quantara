import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("ContributionReward", function () {
  it("Should distribute 5%, 3%, and 2% and pay from working fund", async function () {
    const [owner, level3, level2, level1, user] = await ethers.getSigners();

    const mockBTCB = await ethers.deployContract("MockBTCB");
    const treasury = await ethers.deployContract("TreasuryManager", [
      await mockBTCB.getAddress(),
    ]);
    const income = await ethers.deployContract("IncomeManager");
    const contributionReward = await ethers.deployContract(
      "ContributionReward"
    );
    const rank = await ethers.deployContract("RankReward");

    await contributionReward.setCoreContract(owner.address);
    await contributionReward.setIncomeManager(await income.getAddress());
    await contributionReward.setTreasury(await treasury.getAddress());
    await contributionReward.setRankReward(await rank.getAddress());

    await treasury.setCoreContract(owner.address);
    await treasury.setWorkingPayer(await contributionReward.getAddress(), true);
    await treasury.setWorkingPayer(await rank.getAddress(), true);

    await income.setAuthorizedContract(owner.address, true);
    await income.setAuthorizedContract(
      await contributionReward.getAddress(),
      true
    );
    await income.setAuthorizedContract(await rank.getAddress(), true);

    await rank.setSameRankReporter(await contributionReward.getAddress(), true);

    await income.startPackage(level1.address, 1_000_000n);
    await income.startPackage(level2.address, 1_000_000n);
    await income.startPackage(level3.address, 1_000_000n);

    const contributionAmount = 10000n;
    await mockBTCB.transfer(await treasury.getAddress(), contributionAmount);
    await treasury.processContribution(contributionAmount);

    await contributionReward.setSponsor(level2.address, level3.address);
    await contributionReward.setSponsor(level1.address, level2.address);
    await contributionReward.setSponsor(user.address, level1.address);

    await contributionReward.processContribution(
      user.address,
      contributionAmount
    );

    expect(await contributionReward.levelIncome(level1.address, 1)).to.equal(
      500n
    );
    expect(await contributionReward.levelIncome(level2.address, 2)).to.equal(
      300n
    );
    expect(await contributionReward.levelIncome(level3.address, 3)).to.equal(
      200n
    );

    expect(await income.contributionEarned(level1.address)).to.equal(500n);
    expect(await income.contributionEarned(level2.address)).to.equal(300n);
    expect(await income.contributionEarned(level3.address)).to.equal(200n);

    expect(await mockBTCB.balanceOf(level1.address)).to.equal(500n);
    expect(await mockBTCB.balanceOf(level2.address)).to.equal(300n);
    expect(await mockBTCB.balanceOf(level3.address)).to.equal(200n);
  });
});
