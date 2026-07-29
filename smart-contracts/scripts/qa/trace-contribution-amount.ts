/**
 * TRACE ONLY — one $50 activation → ContributionRewardPaid pipeline values.
 * Does not fix anything. Prints raw amounts at each on-chain step.
 *
 *   npx hardhat run scripts/qa/trace-contribution-amount.ts --network localhost
 */
import hre from "hardhat";
import fs from "fs";
import path from "path";
import { loadDeployedAddresses } from "../lib/deploymentHealth";

const PACKAGE_USD = 50n;
const OUT = path.resolve("scripts/qa/reports/trace-contribution-amount.json");

async function main() {
  const { ethers } = await hre.network.connect();
  const [root, , , , , , , , , deployer] = await ethers.getSigners();
  // Use a fresh wallet
  const user = ethers.Wallet.createRandom().connect(ethers.provider);
  const sponsor = root; // L1 beneficiary = root

  // Fund user with ETH + BTCB
  await (
    await root.sendTransaction({ to: user.address, value: ethers.parseEther("1") })
  ).wait();

  const addresses = loadDeployedAddresses();
  const core = await ethers.getContractAt("BTCPlanCore", String(addresses.BTCPlanCore));
  const token = await ethers.getContractAt(
    "MockBTCB",
    String(addresses.MockBTCB || addresses.Token),
  );
  const contrib = await ethers.getContractAt(
    "ContributionReward",
    String(addresses.ContributionReward),
  );
  const income = await ethers.getContractAt(
    "IncomeManager",
    String(addresses.IncomeManager),
  );

  const tokenAmount: bigint = await core.getPackageBTCBAmount(PACKAGE_USD);
  console.log("\n========== STEP 0: PACKAGE ==========");
  console.log("packageUsd=", PACKAGE_USD.toString());
  console.log("tokenAmount_wei=", tokenAmount.toString());
  console.log("tokenAmount_BTCB=", ethers.formatEther(tokenAmount));
  console.log("sponsor(root)=", sponsor.address);
  console.log("newUser=", user.address);

  // Mint / transfer BTCB to user
  const mintRole = await token.MINTER_ROLE?.().catch(() => null);
  try {
    await (await token.connect(root).mint(user.address, tokenAmount * 2n)).wait();
  } catch {
    await (await token.connect(root).transfer(user.address, tokenAmount * 2n)).wait();
  }

  // Ensure root registered+active so contribution pays
  const rootUser = await core.users(sponsor.address);
  console.log("root.isRegistered=", rootUser.isRegistered ?? rootUser[0]);
  console.log("root.packageActive=", await income.incomes(sponsor.address).then((i: any) => i.packageActive));

  // Register + approve + activate
  if (!(await core.users(user.address)).isRegistered) {
    await (await core.connect(user).register(sponsor.address)).wait();
  }
  await (await token.connect(user).approve(await core.getAddress(), tokenAmount)).wait();

  const beforeIncome = await income.incomes(sponsor.address);
  console.log("\n========== STEP 2 (BEFORE): IncomeManager sponsor state ==========");
  console.log("contributionEarned_before=", beforeIncome.contributionEarned.toString());
  console.log("totalEarned_before=", beforeIncome.totalEarned.toString());

  const tx = await core.connect(user).activatePackage(PACKAGE_USD);
  const receipt = await tx.wait();
  console.log("\nactivatePackage tx=", tx.hash);
  console.log("block=", receipt?.blockNumber);

  // Decode events from receipt
  const contribPaid: Array<Record<string, string>> = [];
  const incomeRecorded: Array<Record<string, string>> = [];

  for (const log of receipt?.logs ?? []) {
    try {
      const parsed = contrib.interface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });
      if (parsed?.name === "ContributionRewardPaid") {
        const row = {
          beneficiary: String(parsed.args.beneficiary ?? parsed.args[0]),
          fromUser: String(parsed.args.fromUser ?? parsed.args[1]),
          level: (parsed.args.level ?? parsed.args[2]).toString(),
          amount_wei: (parsed.args.amount ?? parsed.args[3]).toString(),
          amount_BTCB: ethers.formatEther(parsed.args.amount ?? parsed.args[3]),
          amount_USD_at_60k: (
            Number(ethers.formatEther(parsed.args.amount ?? parsed.args[3])) * 60000
          ).toFixed(8),
          raw_topics: JSON.stringify(log.topics),
          raw_data: log.data,
          logIndex: String(log.index),
        };
        contribPaid.push(row);
      }
    } catch {
      /* not contrib */
    }
    try {
      const parsed = income.interface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });
      if (parsed?.name === "IncomeRecorded") {
        incomeRecorded.push({
          user: String(parsed.args.user ?? parsed.args[0]),
          incomeType: (parsed.args.incomeType ?? parsed.args[1]).toString(),
          requested_wei: (parsed.args.requested ?? parsed.args[2]).toString(),
          accepted_wei: (parsed.args.accepted ?? parsed.args[3]).toString(),
          totalEarned_wei: (parsed.args.totalEarned ?? parsed.args[4]).toString(),
          accepted_USD_at_60k: (
            Number(ethers.formatEther(parsed.args.accepted ?? parsed.args[3])) * 60000
          ).toFixed(8),
          logIndex: String(log.index),
        });
      }
    } catch {
      /* not income */
    }
  }

  console.log("\n========== STEP 1+3: ContributionRewardPaid (RAW DECODED) ==========");
  for (const r of contribPaid) {
    console.log(JSON.stringify(r, null, 2));
  }

  console.log("\n========== STEP 2: IncomeRecorded (from same tx) ==========");
  for (const r of incomeRecorded) {
    console.log(JSON.stringify(r, null, 2));
  }

  const afterIncome = await income.incomes(sponsor.address);
  console.log("\n========== STEP 2 (AFTER): IncomeManager sponsor state ==========");
  console.log("contributionEarned_after=", afterIncome.contributionEarned.toString());
  console.log("totalEarned_after=", afterIncome.totalEarned.toString());
  console.log(
    "contributionEarned_delta_wei=",
    (afterIncome.contributionEarned - beforeIncome.contributionEarned).toString(),
  );

  const payload = {
    txHash: tx.hash,
    blockNumber: receipt?.blockNumber ?? null,
    user: user.address.toLowerCase(),
    sponsor: sponsor.address.toLowerCase(),
    tokenAmount: tokenAmount.toString(),
    contributionRewardPaid: contribPaid,
    incomeRecorded,
    sponsorIncomeAfter: {
      contributionEarned: afterIncome.contributionEarned.toString(),
      totalEarned: afterIncome.totalEarned.toString(),
    },
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log("\nWrote", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
