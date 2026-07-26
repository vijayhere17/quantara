import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("TreasuryManager", function () {
  it("Should distribute 70% working-side (5% of it to charity) + 25/3/2 ROI side", async function () {
    const [owner] = await ethers.getSigners();

    const mockBTCB = await ethers.deployContract("MockBTCB");
    const treasury = await ethers.deployContract("TreasuryManager", [
      await mockBTCB.getAddress(),
    ]);
    await treasury.setCoreContract(owner.address);

    const amount = 100000n;
    await mockBTCB.transfer(await treasury.getAddress(), amount);
    await treasury.processContribution(amount);

    // ROI side 30%: 25% + 3% + 2%
    expect(await treasury.interdependentFundBalance()).to.equal(25000n);
    expect(await treasury.reserveFundBalance()).to.equal(3000n);
    expect(await treasury.communityBuilderFundBalance()).to.equal(2000n);

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
  });

  it("Should allow owner to withdraw reserve", async function () {
    const [owner, other] = await ethers.getSigners();

    const mockBTCB = await ethers.deployContract("MockBTCB");
    const treasury = await ethers.deployContract("TreasuryManager", [
      await mockBTCB.getAddress(),
    ]);
    await treasury.setCoreContract(owner.address);

    const amount = 100000n;
    await mockBTCB.transfer(await treasury.getAddress(), amount);
    await treasury.processContribution(amount);

    const reserve = await treasury.reserveFundBalance();
    await treasury.withdrawReserve(other.address, reserve);
    expect(await treasury.reserveFundBalance()).to.equal(0n);
    expect(await mockBTCB.balanceOf(other.address)).to.equal(reserve);
  });
});
