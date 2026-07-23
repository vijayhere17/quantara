import hre from "hardhat";
import fs from "fs";

async function main() {
  const { ethers } = await hre.network.connect();
  const addrs = JSON.parse(fs.readFileSync("deployed-addresses.json", "utf8"));
  const [root, user] = await ethers.getSigners();
  const token = await ethers.getContractAt("MockBTCB", addrs.MockBTCB);
  const core = await ethers.getContractAt("BTCPlanCore", addrs.BTCPlanCore);

  try {
    await (await token.mint(user.address, ethers.parseEther("1000"))).wait();
  } catch {
    const bal = await token.balanceOf(root.address);
    if (bal > ethers.parseEther("100")) {
      await (await token.connect(root).transfer(user.address, ethers.parseEther("100"))).wait();
    }
  }

  const u0 = await core.users(user.address);
  if (!u0.isActive) {
    await (await core.connect(user).register(root.address)).wait();
  }
  const u1 = await core.users(user.address);
  if (u1.packageAmount === 0n) {
    const amt = await core.getPackageBTCBAmount(50n);
    await (await token.connect(user).approve(addrs.BTCPlanCore, amt)).wait();
    await (await core.connect(user).activatePackage(50n)).wait();
  }
  console.log("QA_WALLET=", user.address);
  console.log("package=", (await core.users(user.address)).packageAmount.toString());
}

main();
