import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("TreasuryManager", function () {
  it("Should distribute exact 30/25/3/2/40 basis points", async function () {
    const [owner] = await ethers.getSigners();

    const mockBTCB = await ethers.deployContract("MockBTCB");
    const treasury = await ethers.deployContract("TreasuryManager", [
      await mockBTCB.getAddress(),
    ]);
    await treasury.setCoreContract(owner.address);

    const amount = 100000n;
    await mockBTCB.transfer(await treasury.getAddress(), amount);
    await treasury.processContribution(amount);

    expect(await treasury.regenerationFundBalance()).to.equal(30000n); // 30%
    expect(await treasury.interdependentFundBalance()).to.equal(25000n); // 25%
    expect(await treasury.reserveFundBalance()).to.equal(3000n); // 3%
    expect(await treasury.communityBuilderFundBalance()).to.equal(2000n); // 2%
    expect(await treasury.workingFundBalance()).to.equal(40000n); // 40%

    const sum =
      (await treasury.regenerationFundBalance()) +
      (await treasury.interdependentFundBalance()) +
      (await treasury.reserveFundBalance()) +
      (await treasury.communityBuilderFundBalance()) +
      (await treasury.workingFundBalance());
    expect(sum).to.equal(amount);
  });

  it("Should assign flooring dust to working so buckets sum to amount", async function () {
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
      (await treasury.regenerationFundBalance()) +
      (await treasury.interdependentFundBalance()) +
      (await treasury.reserveFundBalance()) +
      (await treasury.communityBuilderFundBalance()) +
      (await treasury.workingFundBalance());
    expect(sum).to.equal(amount);
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
