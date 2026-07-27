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
});
