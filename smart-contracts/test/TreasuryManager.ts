import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("TreasuryManager", function () {
  it("Should distribute exact 25/3/2/65/5 basis points", async function () {
    const [owner] = await ethers.getSigners();

    const mockBTCB = await ethers.deployContract("MockBTCB");
    const treasury = await ethers.deployContract("TreasuryManager", [
      await mockBTCB.getAddress(),
    ]);
    await treasury.setCoreContract(owner.address);

    const amount = 100000n;
    await mockBTCB.transfer(await treasury.getAddress(), amount);
    await treasury.processContribution(amount);

    expect(await treasury.interdependentFundBalance()).to.equal(25000n); // 25%
    expect(await treasury.reserveFundBalance()).to.equal(3000n); // 3%
    expect(await treasury.communityBuilderFundBalance()).to.equal(2000n); // 2%
    expect(await treasury.workingFundBalance()).to.equal(65000n); // 65%
    expect(await treasury.charityFundBalance()).to.equal(5000n); // 5%

    const sum =
      (await treasury.interdependentFundBalance()) +
      (await treasury.reserveFundBalance()) +
      (await treasury.communityBuilderFundBalance()) +
      (await treasury.workingFundBalance()) +
      (await treasury.charityFundBalance());
    expect(sum).to.equal(amount);
  });

  it("Should assign flooring dust to working so buckets sum to amount", async function () {
    const [owner] = await ethers.getSigners();

    const mockBTCB = await ethers.deployContract("MockBTCB");
    const treasury = await ethers.deployContract("TreasuryManager", [
      await mockBTCB.getAddress(),
    ]);
    await treasury.setCoreContract(owner.address);

    const amount = 7n; // tiny amount to force flooring dust
    await mockBTCB.transfer(await treasury.getAddress(), amount);
    await treasury.processContribution(amount);

    const sum =
      (await treasury.interdependentFundBalance()) +
      (await treasury.reserveFundBalance()) +
      (await treasury.communityBuilderFundBalance()) +
      (await treasury.workingFundBalance()) +
      (await treasury.charityFundBalance());
    expect(sum).to.equal(amount);
  });
});
