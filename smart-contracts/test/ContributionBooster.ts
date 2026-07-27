import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("ContributionBooster (Growth Accelerator)", function () {
  async function setup() {
    const [owner, sponsor, leg1, leg2, leg3, leg4] = await ethers.getSigners();

    const booster = await ethers.deployContract("ContributionBooster");
    await booster.setCoreContract(owner.address);

    await booster.registerUser(sponsor.address, ethers.ZeroAddress);
    await booster.registerUser(leg1.address, sponsor.address);
    await booster.registerUser(leg2.address, sponsor.address);
    await booster.registerUser(leg3.address, sponsor.address);
    await booster.registerUser(leg4.address, sponsor.address);

    return { owner, sponsor, leg1, leg2, leg3, leg4, booster };
  }

  it("computes 50:50 group volume from strongest + remaining legs", async function () {
    const { sponsor, leg1, leg2, leg3, leg4, booster } = await setup();

    // Example from business rules: 1500 / 700 / 500 / 300 → eligible 3000
    await booster.processPackage(leg1.address, 1500);
    await booster.processPackage(leg2.address, 700);
    await booster.processPackage(leg3.address, 500);
    await booster.processPackage(leg4.address, 300);

    expect(await booster.groupVolume(sponsor.address)).to.equal(3000n);
    expect(await booster.maxLegVolume(sponsor.address)).to.equal(1500n);
    expect(await booster.getFiftyFiftyVolume(sponsor.address)).to.equal(3000n);
    expect(await booster.isBoosterActive(sponsor.address)).to.equal(true);
    expect(await booster.isGrowthAcceleratorActive(sponsor.address)).to.equal(
      true,
    );
  });

  it("does not qualify when 50:50 volume is under 3000", async function () {
    const { sponsor, leg1, leg2, booster } = await setup();

    await booster.processPackage(leg1.address, 2000);
    await booster.processPackage(leg2.address, 500);

    // strongest 2000, remaining 500 → eligible = 1000
    expect(await booster.getFiftyFiftyVolume(sponsor.address)).to.equal(1000n);
    expect(await booster.isBoosterActive(sponsor.address)).to.equal(false);
  });

  it("does not qualify after 30-day qualification window", async function () {
    const { sponsor, leg1, leg2, booster } = await setup();

    await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    await booster.processPackage(leg1.address, 1500);
    await booster.processPackage(leg2.address, 1500);

    expect(await booster.getFiftyFiftyVolume(sponsor.address)).to.equal(3000n);
    expect(await booster.isBoosterActive(sponsor.address)).to.equal(false);
  });

  it("expires Growth Accelerator 30 days after qualification", async function () {
    const { sponsor, leg1, leg2, booster } = await setup();

    await booster.processPackage(leg1.address, 1500);
    await booster.processPackage(leg2.address, 1500);
    expect(await booster.isBoosterActive(sponsor.address)).to.equal(true);

    await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    expect(await booster.isBoosterActive(sponsor.address)).to.equal(false);
  });

  it("processDirectContribution is a no-op (no additive payout)", async function () {
    const { sponsor, leg1, leg2, booster } = await setup();
    await booster.processPackage(leg1.address, 1500);
    await booster.processPackage(leg2.address, 1500);
    expect(await booster.isBoosterActive(sponsor.address)).to.equal(true);

    await booster.processDirectContribution(leg1.address, 10_000n);
    const account = await booster.boosterAccounts(sponsor.address);
    expect(account.boosterIncome).to.equal(0n);
  });
});
