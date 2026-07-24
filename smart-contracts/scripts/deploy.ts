import "dotenv/config";
import hre from "hardhat";
import fs from "fs";
import path from "path";
import {
  syncLaravelEnvFromAddresses,
  syncLaravelLocalConfigFallbacks,
} from "./lib/deploymentHealth";

/**
 * Quantara deployment (Hardhat local | BSC Testnet | BSC Mainnet)
 *
 * Token resolution:
 * - TOKEN_ADDRESS set → use that BEP-20 (no MockBTCB)
 * - else localhost / hardhat → deploy MockBTCB
 * - else BSC networks → require TOKEN_ADDRESS
 *
 * Price feed resolution:
 * - PRICE_FEED_ADDRESS → use existing IBTCPriceFeed
 * - CHAINLINK_BTC_USD → deploy ChainlinkBTCPriceFeed adapter
 * - else localhost → deploy MockBTCPriceFeed(60000)
 * - else → require one of the above
 *
 * Always writes deployed-addresses.json and prints ownership verification.
 */
async function main() {
  const connection = await hre.network.connect();
  const { ethers } = connection;
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const networkName =
    (hre as { network?: { name?: string } }).network?.name ||
    process.env.HARDHAT_NETWORK ||
    "unknown";

  const expectedChainId = process.env.CHAIN_ID
    ? Number(process.env.CHAIN_ID)
    : null;
  if (expectedChainId !== null && expectedChainId !== chainId) {
    throw new Error(
      `CHAIN_ID mismatch: env=${expectedChainId} network=${chainId}`,
    );
  }

  const isLocal =
    chainId === 31337 ||
    networkName === "localhost" ||
    networkName === "hardhat" ||
    networkName === "hardhatMainnet" ||
    networkName === "hardhatOp";

  const tokenAddressEnv = (process.env.TOKEN_ADDRESS || "").trim();
  const priceFeedEnv = (process.env.PRICE_FEED_ADDRESS || "").trim();
  const chainlinkEnv = (process.env.CHAINLINK_BTC_USD || "").trim();
  const treasuryWalletEnv = (process.env.TREASURY_WALLET || "").trim();

  console.log("=======================================");
  console.log("Quantara Deployment (BEP-20 / BSC)");
  console.log("=======================================");
  console.log("Network:", networkName);
  console.log("Chain ID:", chainId);
  console.log("Deployer:", deployer.address);

  // ------------------------------------------------------------------
  // Token
  // ------------------------------------------------------------------
  let tokenAddress: string;
  let deployedMockToken = false;

  if (tokenAddressEnv) {
    if (!ethers.isAddress(tokenAddressEnv)) {
      throw new Error(`Invalid TOKEN_ADDRESS: ${tokenAddressEnv}`);
    }
    const code = await ethers.provider.getCode(tokenAddressEnv);
    if (!code || code === "0x") {
      throw new Error(`TOKEN_ADDRESS has no contract code: ${tokenAddressEnv}`);
    }
    tokenAddress = ethers.getAddress(tokenAddressEnv);
    const erc20 = new ethers.Contract(
      tokenAddress,
      [
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
        "function name() view returns (string)",
      ],
      ethers.provider,
    );
    const decimals = Number(await erc20.decimals());
    const symbol = await erc20.symbol().catch(() => "BEP20");
    console.log(`Token (env): ${tokenAddress} (${symbol}, ${decimals} decimals)`);
  } else if (isLocal) {
    const MockBTCB = await ethers.getContractFactory("MockBTCB");
    const token = await MockBTCB.deploy();
    await token.waitForDeployment();
    tokenAddress = await token.getAddress();
    deployedMockToken = true;
    console.log("MockBTCB (local only):", tokenAddress);
  } else {
    throw new Error(
      "TOKEN_ADDRESS is required on BSC Testnet/Mainnet. Set TOKEN_ADDRESS to any BEP-20.",
    );
  }

  // ------------------------------------------------------------------
  // Price feed
  // ------------------------------------------------------------------
  let priceFeedAddress: string;
  let priceFeedLabel = "PriceFeed";

  if (priceFeedEnv) {
    if (!ethers.isAddress(priceFeedEnv)) {
      throw new Error(`Invalid PRICE_FEED_ADDRESS: ${priceFeedEnv}`);
    }
    priceFeedAddress = ethers.getAddress(priceFeedEnv);
    priceFeedLabel = "PriceFeed";
    console.log("PriceFeed (env):", priceFeedAddress);
  } else if (chainlinkEnv) {
    if (!ethers.isAddress(chainlinkEnv)) {
      throw new Error(`Invalid CHAINLINK_BTC_USD: ${chainlinkEnv}`);
    }
    const Adapter = await ethers.getContractFactory("ChainlinkBTCPriceFeed");
    const adapter = await Adapter.deploy(ethers.getAddress(chainlinkEnv));
    await adapter.waitForDeployment();
    priceFeedAddress = await adapter.getAddress();
    priceFeedLabel = "ChainlinkBTCPriceFeed";
    console.log("ChainlinkBTCPriceFeed:", priceFeedAddress);
    console.log("  aggregator:", ethers.getAddress(chainlinkEnv));
  } else if (isLocal) {
    const MockBTCPriceFeed = await ethers.getContractFactory("MockBTCPriceFeed");
    const priceFeed = await MockBTCPriceFeed.deploy(60000);
    await priceFeed.waitForDeployment();
    priceFeedAddress = await priceFeed.getAddress();
    priceFeedLabel = "MockBTCPriceFeed";
    console.log("MockBTCPriceFeed:", priceFeedAddress);
  } else {
    throw new Error(
      "Set PRICE_FEED_ADDRESS or CHAINLINK_BTC_USD for BSC deployments.",
    );
  }

  // ------------------------------------------------------------------
  // Core system contracts
  // ------------------------------------------------------------------
  const IncomeManager = await ethers.getContractFactory("IncomeManager");
  const income = await IncomeManager.deploy();
  await income.waitForDeployment();
  console.log("IncomeManager:", await income.getAddress());

  const TreasuryManager = await ethers.getContractFactory("TreasuryManager");
  const treasury = await TreasuryManager.deploy(tokenAddress);
  await treasury.waitForDeployment();
  console.log("TreasuryManager:", await treasury.getAddress());

  const BTCPlanCore = await ethers.getContractFactory("BTCPlanCore");
  const core = await BTCPlanCore.deploy(tokenAddress, priceFeedAddress);
  await core.waitForDeployment();
  console.log("BTCPlanCore:", await core.getAddress());

  const InterdependentReward = await ethers.getContractFactory(
    "InterdependentReward",
  );
  const interReward = await InterdependentReward.deploy();
  await interReward.waitForDeployment();
  console.log("InterdependentReward:", await interReward.getAddress());

  const ContributionReward = await ethers.getContractFactory(
    "ContributionReward",
  );
  const contributionReward = await ContributionReward.deploy();
  await contributionReward.waitForDeployment();
  console.log("ContributionReward:", await contributionReward.getAddress());

  const ContributionBooster = await ethers.getContractFactory(
    "ContributionBooster",
  );
  const booster = await ContributionBooster.deploy();
  await booster.waitForDeployment();
  console.log("ContributionBooster:", await booster.getAddress());

  const RankReward = await ethers.getContractFactory("RankReward");
  const rank = await RankReward.deploy();
  await rank.waitForDeployment();
  console.log("RankReward:", await rank.getAddress());

  const CommunityBuilder = await ethers.getContractFactory("CommunityBuilder");
  const community = await CommunityBuilder.deploy(await treasury.getAddress());
  await community.waitForDeployment();
  console.log("CommunityBuilder:", await community.getAddress());

  console.log("Linking contracts...");

  // Core wiring
  await (await core.setTreasury(await treasury.getAddress())).wait();
  await (
    await core.setContributionReward(await contributionReward.getAddress())
  ).wait();
  await (await core.setIncomeManager(await income.getAddress())).wait();
  await (await core.setContributionBooster(await booster.getAddress())).wait();
  await (await core.setRankReward(await rank.getAddress())).wait();
  await (
    await core.setInterdependentReward(await interReward.getAddress())
  ).wait();

  // Treasury wiring
  await (await treasury.setCoreContract(await core.getAddress())).wait();
  await (
    await treasury.setRewardContract(await interReward.getAddress())
  ).wait();
  await (
    await treasury.setCommunityBuilderContract(await community.getAddress())
  ).wait();
  await (
    await treasury.setWorkingPayer(await contributionReward.getAddress(), true)
  ).wait();
  await (
    await treasury.setWorkingPayer(await booster.getAddress(), true)
  ).wait();
  await (await treasury.setWorkingPayer(await rank.getAddress(), true)).wait();

  // IncomeManager wiring
  await (await income.setCoreContract(await core.getAddress())).wait();
  await (await income.setRankReward(await rank.getAddress())).wait();
  await (
    await income.setAuthorizedContract(await core.getAddress(), true)
  ).wait();
  await (
    await income.setAuthorizedContract(await interReward.getAddress(), true)
  ).wait();
  await (
    await income.setAuthorizedContract(
      await contributionReward.getAddress(),
      true,
    )
  ).wait();
  await (
    await income.setAuthorizedContract(await booster.getAddress(), true)
  ).wait();
  await (
    await income.setAuthorizedContract(await rank.getAddress(), true)
  ).wait();
  await (
    await income.setAuthorizedContract(await community.getAddress(), true)
  ).wait();

  // InterdependentReward wiring
  await (await interReward.setCoreContract(await core.getAddress())).wait();
  await (await interReward.setTreasury(await treasury.getAddress())).wait();
  await (await interReward.setRankReward(await rank.getAddress())).wait();
  await (await interReward.setIncomeManager(await income.getAddress())).wait();

  // ContributionReward wiring
  await (
    await contributionReward.setCoreContract(await core.getAddress())
  ).wait();
  await (
    await contributionReward.setIncomeManager(await income.getAddress())
  ).wait();
  await (
    await contributionReward.setTreasury(await treasury.getAddress())
  ).wait();
  await (
    await contributionReward.setRankReward(await rank.getAddress())
  ).wait();

  // Booster wiring
  await (await booster.setCoreContract(await core.getAddress())).wait();
  await (await booster.setIncomeManager(await income.getAddress())).wait();
  await (await booster.setTreasury(await treasury.getAddress())).wait();
  await (await booster.setRankReward(await rank.getAddress())).wait();

  // Rank wiring
  await (await rank.setCoreContract(await core.getAddress())).wait();
  await (await rank.setRewardContract(await interReward.getAddress())).wait();
  await (await rank.setIncomeManager(await income.getAddress())).wait();
  await (await rank.setTreasury(await treasury.getAddress())).wait();
  await (await rank.setCommunityBuilder(await community.getAddress())).wait();
  await (
    await rank.setSameRankReporter(await interReward.getAddress(), true)
  ).wait();
  await (
    await rank.setSameRankReporter(await contributionReward.getAddress(), true)
  ).wait();
  await (
    await rank.setSameRankReporter(await booster.getAddress(), true)
  ).wait();
  await (
    await rank.setSameRankReporter(await community.getAddress(), true)
  ).wait();

  // Community wiring
  await (await community.setRankRewardContract(await rank.getAddress())).wait();
  await (await community.setIncomeManager(await income.getAddress())).wait();

  console.log("Contracts linked successfully");

  // ------------------------------------------------------------------
  // Ownership verification
  // ------------------------------------------------------------------
  console.log("Verifying ownership...");
  const owned = [
    ["BTCPlanCore", core],
    ["TreasuryManager", treasury],
    ["IncomeManager", income],
    ["InterdependentReward", interReward],
    ["ContributionReward", contributionReward],
    ["ContributionBooster", booster],
    ["RankReward", rank],
    ["CommunityBuilder", community],
  ] as const;

  for (const [label, ctr] of owned) {
    const owner = await ctr.owner();
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
      throw new Error(`${label} owner mismatch: ${owner}`);
    }
    console.log(`  ${label} owner OK`);
  }

  const coreToken = await core.btcbToken();
  if (coreToken.toLowerCase() !== tokenAddress.toLowerCase()) {
    throw new Error("BTCPlanCore token mismatch after deploy");
  }
  const treasuryToken = await treasury.btcbToken();
  if (treasuryToken.toLowerCase() !== tokenAddress.toLowerCase()) {
    throw new Error("TreasuryManager token mismatch after deploy");
  }

  // ------------------------------------------------------------------
  // Genesis / root bootstrap
  // ------------------------------------------------------------------
  const rootUser = await core.users(deployer.address);
  if (!rootUser.isActive) {
    console.log("Bootstrapping root user (register address(0))...");
    const tx = await core.register(ethers.ZeroAddress);
    await tx.wait();
    console.log("Root registered:", deployer.address);
  } else {
    console.log("Root already registered:", deployer.address);
  }

  const rootAfter = await core.users(deployer.address);
  if (!rootAfter.isActive) {
    throw new Error(
      "Root bootstrap failed — users[deployer].isActive is still false",
    );
  }

  const explorerBase =
    chainId === 56
      ? "https://bscscan.com"
      : chainId === 97
        ? "https://testnet.bscscan.com"
        : "";

  const addresses: Record<string, string | number> = {
    network: networkName,
    chainId,
    explorer: explorerBase,
    Token: tokenAddress,
    [priceFeedLabel]: priceFeedAddress,
    PriceFeed: priceFeedAddress,
    BTCPlanCore: await core.getAddress(),
    TreasuryManager: await treasury.getAddress(),
    InterdependentReward: await interReward.getAddress(),
    ContributionReward: await contributionReward.getAddress(),
    ContributionBooster: await booster.getAddress(),
    RankReward: await rank.getAddress(),
    CommunityBuilder: await community.getAddress(),
    IncomeManager: await income.getAddress(),
    RootUser: deployer.address,
  };

  if (deployedMockToken) {
    addresses.MockBTCB = tokenAddress;
  }
  if (priceFeedLabel === "MockBTCPriceFeed") {
    addresses.MockBTCPriceFeed = priceFeedAddress;
  }
  if (treasuryWalletEnv && ethers.isAddress(treasuryWalletEnv)) {
    addresses.TreasuryWallet = ethers.getAddress(treasuryWalletEnv);
  }

  fs.writeFileSync("deployed-addresses.json", JSON.stringify(addresses, null, 2));

  // Keep Laravel local stack synchronized (best-effort)
  try {
    const laravelEnv = path.resolve(process.cwd(), "../application/.env");
    const phpConfig = path.resolve(
      process.cwd(),
      "../application/config/blockchain.php",
    );
    if (fs.existsSync(laravelEnv)) {
      syncLaravelEnvFromAddresses(addresses, laravelEnv);
      console.log("Synced Laravel .env from deployment");
    }
    if (fs.existsSync(phpConfig)) {
      syncLaravelLocalConfigFallbacks(addresses, phpConfig);
    }
  } catch (err) {
    console.warn(
      "Laravel env sync skipped:",
      err instanceof Error ? err.message : err,
    );
  }

  console.log("=======================================");
  console.log("Deployment Completed");
  console.log("=======================================");
  console.log(JSON.stringify(addresses, null, 2));
  console.log("");
  console.log("Laravel .env hints:");
  console.log(`  BLOCKCHAIN_RPC=<rpc for chain ${chainId}>`);
  console.log(`  BLOCKCHAIN_CHAIN_ID=${chainId}`);
  console.log(`  TOKEN_CONTRACT=${tokenAddress}`);
  console.log(`  CORE_CONTRACT=${await core.getAddress()}`);
  console.log(`  TREASURY_CONTRACT=${await treasury.getAddress()}`);
  console.log(`  REWARD_CONTRACT=${await interReward.getAddress()}`);
  console.log(`  INCOME_CONTRACT=${await income.getAddress()}`);
  console.log(`  CONTRIBUTION_CONTRACT=${await contributionReward.getAddress()}`);
  console.log(`  BOOSTER_CONTRACT=${await booster.getAddress()}`);
  console.log(`  RANK_CONTRACT=${await rank.getAddress()}`);
  console.log(`  COMMUNITY_CONTRACT=${await community.getAddress()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
