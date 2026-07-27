import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("TreasuryManager", function () {
  it("Should put entire 30% in ROI pool; working 70% with 5% of working to charity", async function () {
    const [owner] = await ethers.getSigners();

    const mockBTCB = await ethers.deployContract("MockBTCB");
    const treasury = await ethers.deployContract("TreasuryManager", [
      await mockBTCB.getAddress(),
    ]);
    await treasury.setCoreContract(owner.address);

    const amount = 100000n;
    await mockBTCB.transfer(await treasury.getAddress(), amount);
    await treasury.processContribution(amount);

    // ROI Pool: entire 30% unsplit
    expect(await treasury.interdependentFundBalance()).to.equal(30000n);
    // Reserve / Community not funded on activation (Phase 2 recycling)
    expect(await treasury.reserveFundBalance()).to.equal(0n);
    expect(await treasury.communityBuilderFundBalance()).to.equal(0n);

    // Working side 70% (=70000): 5% of working → charity (3500), rest working (66500)
    expect(await treasury.charityFundBalance()).to.equal(3500n);
    expect(await treasury.workingFundBalance()).to.equal(66500n);

    // Regeneration no longer funded
    expect(await treasury.regenerationFundBalance()).to.equal(0n);

    const sum =
      (await treasury.interdependentFundBalance()) +
      (await treasury.reserveFundBalance()) +
      (await treasury.communityBuilderFundBalance()) +
      (await treasury.workingFundBalance()) +
      (await treasury.charityFundBalance()) +
      (await treasury.regenerationFundBalance());
    expect(sum).to.equal(amount);
  });

  it("Should assign flooring dust to working side so buckets sum to amount", async function () {
    const [owner] = await ethers.getSigners();

    const mockBTCB = await ethers.deployContract("MockBTCB");
    const treasury = await ethers.deployContract("TreasuryManager", [
      await mockBTCB.getAddress(),
    ]);
    await treasury.setCoreContract(owner.address);

    const amount = 7n;
    await mockBTCB.transfer(await treasury.getAddress(), amount);
    await treasury.processContribution(amount);

    const sum =
      (await treasury.interdependentFundBalance()) +
      (await treasury.reserveFundBalance()) +
      (await treasury.communityBuilderFundBalance()) +
      (await treasury.workingFundBalance()) +
      (await treasury.charityFundBalance()) +
      (await treasury.regenerationFundBalance());
    expect(sum).to.equal(amount);
    expect(await treasury.regenerationFundBalance()).to.equal(0n);
    expect(await treasury.reserveFundBalance()).to.equal(0n);
    expect(await treasury.communityBuilderFundBalance()).to.equal(0n);
  });

  it("Should revert withdrawReserve when reserve is empty (not funded on activation)", async function () {
    const [owner, other] = await ethers.getSigners();

    const mockBTCB = await ethers.deployContract("MockBTCB");
    const treasury = await ethers.deployContract("TreasuryManager", [
      await mockBTCB.getAddress(),
    ]);
    await treasury.setCoreContract(owner.address);

    const amount = 100000n;
    await mockBTCB.transfer(await treasury.getAddress(), amount);
    await treasury.processContribution(amount);

    expect(await treasury.reserveFundBalance()).to.equal(0n);
    await expect(treasury.withdrawReserve(other.address, 1n)).to.be.revertedWith(
      "Insufficient reserve fund",
    );
  });

  it("Should recycle working income 70/25/3/2 and leave recycle tokens in treasury", async function () {
    const [owner, user] = await ethers.getSigners();

    const mockBTCB = await ethers.deployContract("MockBTCB");
    const treasury = await ethers.deployContract("TreasuryManager", [
      await mockBTCB.getAddress(),
    ]);
    await treasury.setCoreContract(owner.address);
    await treasury.setWorkingPayer(owner.address, true);

    const packageAmount = 100000n;
    await mockBTCB.transfer(await treasury.getAddress(), packageAmount);
    await treasury.processContribution(packageAmount);

    const gross = 10000n;
    const roiBefore = await treasury.interdependentFundBalance();
    const workingBefore = await treasury.workingFundBalance();
    const userBefore = await mockBTCB.balanceOf(user.address);
    const treasBefore = await mockBTCB.balanceOf(await treasury.getAddress());

    const [userPayout, toRoi, toReserve, toCommunity] =
      await treasury.previewRecycling(gross);
    expect(userPayout).to.equal(7000n);
    expect(toRoi).to.equal(2500n);
    expect(toReserve).to.equal(300n);
    expect(toCommunity).to.equal(200n);

    await treasury.payWorkingIncome(user.address, gross);

    expect(await mockBTCB.balanceOf(user.address)).to.equal(userBefore + userPayout);
    expect(await mockBTCB.balanceOf(await treasury.getAddress())).to.equal(
      treasBefore - userPayout,
    );
    expect(await treasury.workingFundBalance()).to.equal(workingBefore - gross);
    expect(await treasury.interdependentFundBalance()).to.equal(roiBefore + toRoi);
    expect(await treasury.reserveFundBalance()).to.equal(toReserve);
    expect(await treasury.communityBuilderFundBalance()).to.equal(toCommunity);
    expect(await treasury.totalWorkingIncomePaid()).to.equal(userPayout);
    expect(await treasury.totalIncomeRecycled()).to.equal(
      toRoi + toReserve + toCommunity,
    );
  });

  it("Should recycle Self ROI and credit 25% back into ROI pool", async function () {
    const [owner, user] = await ethers.getSigners();

    const mockBTCB = await ethers.deployContract("MockBTCB");
    const treasury = await ethers.deployContract("TreasuryManager", [
      await mockBTCB.getAddress(),
    ]);
    await treasury.setCoreContract(owner.address);
    await treasury.setRewardContract(owner.address);

    const packageAmount = 100000n;
    await mockBTCB.transfer(await treasury.getAddress(), packageAmount);
    await treasury.processContribution(packageAmount);

    const gross = 10000n;
    const roiBefore = await treasury.interdependentFundBalance();
    const [userPayout, toRoi, toReserve, toCommunity] =
      await treasury.previewRecycling(gross);

    await treasury.paySelfRoi(user.address, gross);

    // Net ROI pool: -gross + 25% recycle
    expect(await treasury.interdependentFundBalance()).to.equal(
      roiBefore - gross + toRoi,
    );
    expect(await treasury.reserveFundBalance()).to.equal(toReserve);
    expect(await treasury.communityBuilderFundBalance()).to.equal(toCommunity);
    expect(await mockBTCB.balanceOf(user.address)).to.equal(userPayout);
    expect(await treasury.totalSelfRoiPaid()).to.equal(userPayout);
  });

  it("Should recycle Community Builder payouts", async function () {
    const [owner, user] = await ethers.getSigners();

    const mockBTCB = await ethers.deployContract("MockBTCB");
    const treasury = await ethers.deployContract("TreasuryManager", [
      await mockBTCB.getAddress(),
    ]);
    await treasury.setCommunityBuilderContract(owner.address);

    const gross = 1000n;
    await mockBTCB.transfer(await treasury.getAddress(), gross);
    await treasury.creditCommunityBuilderFund(gross);

    const [userPayout, , , toCommunity] = await treasury.previewRecycling(gross);
    await treasury.payCommunityBuilder(user.address, gross);

    expect(await mockBTCB.balanceOf(user.address)).to.equal(userPayout);
    // Debited gross then credited 2% recycle
    expect(await treasury.communityBuilderFundBalance()).to.equal(toCommunity);
  });
});
