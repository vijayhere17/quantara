import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("ContributionBooster", function () {
  async function setup() {
    const [owner, sponsor, user] = await ethers.getSigners();

    const mockBTCB = await ethers.deployContract("MockBTCB");
    const treasury = await ethers.deployContract("TreasuryManager", [
      await mockBTCB.getAddress(),
    ]);
    const income = await ethers.deployContract("IncomeManager");
    const booster = await ethers.deployContract("ContributionBooster");
    const rank = await ethers.deployContract("RankReward");

    await booster.setCoreContract(owner.address);
    await booster.setIncomeManager(await income.getAddress());
    await booster.setTreasury(await treasury.getAddress());
    await booster.setRankReward(await rank.getAddress());

    await treasury.setCoreContract(owner.address);
    await treasury.setWorkingPayer(await booster.getAddress(), true);

    await income.setAuthorizedContract(owner.address, true);
    await income.setAuthorizedContract(await booster.getAddress(), true);

    await income.startPackage(sponsor.address, 1_000_000n);

    await booster.registerUser(sponsor.address, ethers.ZeroAddress);
    await booster.registerUser(user.address, sponsor.address);

    await rank.setSameRankReporter(await booster.getAddress(), true);

    return { owner, sponsor, user, mockBTCB, treasury, income, booster };
  }

  it("Should activate booster and give 10% direct contribution reward", async function () {
    const { sponsor, user, mockBTCB, treasury, booster, income } =
      await setup();

    await booster.processPackage(sponsor.address, 1000);
    expect(await booster.isBoosterActive(sponsor.address)).to.equal(true);

    const contributionAmount = 10000n;
    await mockBTCB.transfer(await treasury.getAddress(), contributionAmount);
    await treasury.processContribution(contributionAmount);

    await booster.processDirectContribution(user.address, contributionAmount);

    const sponsorAccount = await booster.boosterAccounts(sponsor.address);
    expect(sponsorAccount.boosterIncome).to.equal(1000n); // 10%
    expect(await income.boosterEarned(sponsor.address)).to.equal(1000n);
    expect(await mockBTCB.balanceOf(sponsor.address)).to.equal(1000n);
  });

  it("Should not qualify booster after 30 days from joining", async function () {
    const { user, booster } = await setup();

    await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    await booster.processPackage(user.address, 1000);
    expect(await booster.isBoosterActive(user.address)).to.equal(false);
  });

  it("Should stop booster income after booster expires", async function () {
    const { sponsor, user, mockBTCB, treasury, booster } = await setup();

    await booster.processPackage(sponsor.address, 1000);

    await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    const contributionAmount = 10000n;
    await mockBTCB.transfer(await treasury.getAddress(), contributionAmount);
    await treasury.processContribution(contributionAmount);

    await booster.processDirectContribution(user.address, contributionAmount);

    const sponsorAccount = await booster.boosterAccounts(sponsor.address);
    expect(sponsorAccount.boosterIncome).to.equal(0n);
    expect(await booster.isBoosterActive(sponsor.address)).to.equal(false);
  });
});
