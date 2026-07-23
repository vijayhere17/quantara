import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

async function deploySystem() {
  const [owner, user, user2, user3] = await ethers.getSigners();

  const mockBTCB = await ethers.deployContract("MockBTCB");
  const mockPriceFeed = await ethers.deployContract("MockBTCPriceFeed", [
    60000,
  ]);

  const incomeManager = await ethers.deployContract("IncomeManager");
  const treasury = await ethers.deployContract("TreasuryManager", [
    await mockBTCB.getAddress(),
  ]);
  const core = await ethers.deployContract("BTCPlanCore", [
    await mockBTCB.getAddress(),
    await mockPriceFeed.getAddress(),
  ]);
  const interdependentReward = await ethers.deployContract(
    "InterdependentReward"
  );
  const contributionReward = await ethers.deployContract("ContributionReward");
  const contributionBooster = await ethers.deployContract(
    "ContributionBooster"
  );
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
  await treasury.setCommunityBuilderContract(
    await communityBuilder.getAddress()
  );
  await treasury.setWorkingPayer(await contributionReward.getAddress(), true);
  await treasury.setWorkingPayer(await contributionBooster.getAddress(), true);
  await treasury.setWorkingPayer(await rankReward.getAddress(), true);

  await incomeManager.setCoreContract(await core.getAddress());
  await incomeManager.setRankReward(await rankReward.getAddress());
  await incomeManager.setAuthorizedContract(await core.getAddress(), true);
  await incomeManager.setAuthorizedContract(
    await interdependentReward.getAddress(),
    true
  );
  await incomeManager.setAuthorizedContract(
    await contributionReward.getAddress(),
    true
  );
  await incomeManager.setAuthorizedContract(
    await contributionBooster.getAddress(),
    true
  );
  await incomeManager.setAuthorizedContract(await rankReward.getAddress(), true);
  await incomeManager.setAuthorizedContract(
    await communityBuilder.getAddress(),
    true
  );

  await interdependentReward.setCoreContract(await core.getAddress());
  await interdependentReward.setTreasury(await treasury.getAddress());
  await interdependentReward.setRankReward(await rankReward.getAddress());
  await interdependentReward.setIncomeManager(await incomeManager.getAddress());

  await contributionReward.setCoreContract(await core.getAddress());
  await contributionReward.setIncomeManager(await incomeManager.getAddress());
  await contributionReward.setTreasury(await treasury.getAddress());
  await contributionReward.setRankReward(await rankReward.getAddress());

  await contributionBooster.setCoreContract(await core.getAddress());
  await contributionBooster.setIncomeManager(await incomeManager.getAddress());
  await contributionBooster.setTreasury(await treasury.getAddress());
  await contributionBooster.setRankReward(await rankReward.getAddress());

  await rankReward.setCoreContract(await core.getAddress());
  await rankReward.setRewardContract(await interdependentReward.getAddress());
  await rankReward.setIncomeManager(await incomeManager.getAddress());
  await rankReward.setTreasury(await treasury.getAddress());
  await rankReward.setCommunityBuilder(await communityBuilder.getAddress());
  await rankReward.setSameRankReporter(
    await interdependentReward.getAddress(),
    true
  );
  await rankReward.setSameRankReporter(
    await contributionReward.getAddress(),
    true
  );
  await rankReward.setSameRankReporter(
    await contributionBooster.getAddress(),
    true
  );
  await rankReward.setSameRankReporter(
    await communityBuilder.getAddress(),
    true
  );

  await communityBuilder.setRankRewardContract(await rankReward.getAddress());
  await communityBuilder.setIncomeManager(await incomeManager.getAddress());

  return {
    owner,
    user,
    user2,
    user3,
    mockBTCB,
    mockPriceFeed,
    incomeManager,
    treasury,
    core,
    interdependentReward,
    contributionReward,
    contributionBooster,
    rankReward,
    communityBuilder,
  };
}

describe("BTCPlanCore", function () {
  it("Should register user and activate first package only at $50 with exact treasury split", async function () {
    const { owner, user, mockBTCB, core, incomeManager, treasury, interdependentReward } =
      await deploySystem();

    await core.register(ethers.ZeroAddress);

    const [nextPackage, nextCycle] = await core.getNextEligiblePackage(
      owner.address
    );
    expect(nextPackage).to.equal(50n);
    expect(nextCycle).to.equal(1n);

    await expect(core.activatePackage(100)).to.be.revertedWith(
      "Invalid package sequence"
    );

    const tokenAmount = await core.getPackageBTCBAmount(50);
    await mockBTCB.approve(await core.getAddress(), tokenAmount);
    await core.activatePackage(50);

    const userData = await core.users(owner.address);
    expect(userData.packageAmount).to.equal(50n);
    expect(userData.packageCycle).to.equal(1n);
    expect(userData.packageCompleted).to.equal(false);

    expect(await incomeManager.principal(owner.address)).to.equal(tokenAmount);

    const roi = await interdependentReward.roiAccounts(owner.address);
    expect(roi.isActive).to.equal(true);
    expect(roi.principal).to.equal(tokenAmount);

    // Exact BPS: 25 / 3 / 2 / 65 / 5 (+ dust to working)
    const interdependent = (tokenAmount * 2500n) / 10000n;
    const reserve = (tokenAmount * 300n) / 10000n;
    const community = (tokenAmount * 200n) / 10000n;
    let working = (tokenAmount * 6500n) / 10000n;
    const charity = (tokenAmount * 500n) / 10000n;
    const distributed =
      interdependent + reserve + community + working + charity;
    if (distributed < tokenAmount) {
      working += tokenAmount - distributed;
    }

    expect(await treasury.interdependentFundBalance()).to.equal(interdependent);
    expect(await treasury.reserveFundBalance()).to.equal(reserve);
    expect(await treasury.communityBuilderFundBalance()).to.equal(community);
    expect(await treasury.charityFundBalance()).to.equal(charity);
    expect(await treasury.workingFundBalance()).to.equal(working);

    await core.connect(user).register(owner.address);
    expect((await core.users(user.address)).sponsor).to.equal(owner.address);
  });

  it("Should enforce package progression after ROI cap unlocks package", async function () {
    const { owner, mockBTCB, core, incomeManager, interdependentReward } =
      await deploySystem();

    await core.register(ethers.ZeroAddress);

    await mockBTCB.approve(await core.getAddress(), ethers.MaxUint256);
    await core.activatePackage(50);

    await expect(core.activatePackage(50)).to.be.revertedWith(
      "Complete current package first"
    );

    await incomeManager.setAuthorizedContract(owner.address, true);
    const principal = await incomeManager.principal(owner.address);
    await incomeManager.recordIncome(owner.address, principal * 3n, 0); // ROI

    const userAfter = await core.users(owner.address);
    expect(userAfter.packageCompleted).to.equal(true);

    const roiAfter = await interdependentReward.roiAccounts(owner.address);
    expect(roiAfter.isActive).to.equal(false);

    // Working capacity still open after ROI unlock
    expect(await incomeManager.getRemainingWorkingCap(owner.address)).to.equal(
      principal * 4n
    );

    const [nextPackage, nextCycle] = await core.getNextEligiblePackage(
      owner.address
    );
    expect(nextPackage).to.equal(50n);
    expect(nextCycle).to.equal(2n);

    await core.activatePackage(50);
    expect((await core.users(owner.address)).packageCycle).to.equal(2n);

    const principal2 = await incomeManager.principal(owner.address);
    await incomeManager.recordIncome(owner.address, principal2 * 3n, 0);

    const [pkg100, cycle1] = await core.getNextEligiblePackage(owner.address);
    expect(pkg100).to.equal(100n);
    expect(cycle1).to.equal(1n);

    await core.activatePackage(100);
    expect((await core.users(owner.address)).packageAmount).to.equal(100n);
  });

  it("Should allow unlimited 10000 topups after final package C2", async function () {
    const { owner, mockBTCB, core, incomeManager } = await deploySystem();

    await core.register(ethers.ZeroAddress);
    await mockBTCB.approve(await core.getAddress(), ethers.MaxUint256);
    await incomeManager.setAuthorizedContract(owner.address, true);

    const sequence: Array<[number, number]> = [
      [50, 1],
      [50, 2],
      [100, 1],
      [100, 2],
      [300, 1],
      [300, 2],
      [500, 1],
      [500, 2],
      [1000, 1],
      [1000, 2],
      [3000, 1],
      [3000, 2],
      [5000, 1],
      [5000, 2],
      [10000, 1],
      [10000, 2],
    ];

    for (const [pkg, cycle] of sequence) {
      const [nextPkg, nextCycle] = await core.getNextEligiblePackage(
        owner.address
      );
      expect(nextPkg).to.equal(BigInt(pkg));
      expect(nextCycle).to.equal(BigInt(cycle));

      await core.activatePackage(pkg);
      const principal = await incomeManager.principal(owner.address);
      await incomeManager.recordIncome(owner.address, principal * 3n, 0);
      expect((await core.users(owner.address)).packageCompleted).to.equal(true);
    }

    for (let i = 0; i < 3; i++) {
      const [nextPkg, nextCycle] = await core.getNextEligiblePackage(
        owner.address
      );
      expect(nextPkg).to.equal(10000n);
      expect(nextCycle).to.equal(2n);
      await core.activatePackage(10000);
      const principal = await incomeManager.principal(owner.address);
      await incomeManager.recordIncome(owner.address, principal * 3n, 0);
    }
  });

  it("Should reject unregistered sponsor and self-sponsor", async function () {
    const { user, user2, core } = await deploySystem();

    await expect(
      core.connect(user).register(user.address)
    ).to.be.revertedWith("Cannot sponsor yourself");

    await expect(
      core.connect(user).register(user2.address)
    ).to.be.revertedWith("Sponsor not registered");
  });

  it("Should claim ROI through IncomeManager and pay from treasury", async function () {
    const {
      owner,
      user,
      mockBTCB,
      core,
      incomeManager,
      treasury,
      interdependentReward,
    } = await deploySystem();

    await core.register(ethers.ZeroAddress);
    await mockBTCB.approve(await core.getAddress(), ethers.MaxUint256);
    await core.activatePackage(50);

    await core.connect(user).register(owner.address);
    const userAmount = await core.getPackageBTCBAmount(50);
    await mockBTCB.transfer(user.address, userAmount);
    await mockBTCB
      .connect(user)
      .approve(await core.getAddress(), userAmount);
    await core.connect(user).activatePackage(50);

    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);

    const pendingRoi = await interdependentReward.getPendingRoi(user.address);
    expect(pendingRoi).to.be.greaterThan(0n);

    const treasuryBefore = await mockBTCB.balanceOf(await treasury.getAddress());
    const userBefore = await mockBTCB.balanceOf(user.address);

    await interdependentReward.connect(user).claimRoi();

    expect(await incomeManager.roiEarned(user.address)).to.equal(pendingRoi);
    expect(await mockBTCB.balanceOf(user.address)).to.equal(
      userBefore + pendingRoi
    );
    expect(await mockBTCB.balanceOf(await treasury.getAddress())).to.equal(
      treasuryBefore - pendingRoi
    );
  });
});
