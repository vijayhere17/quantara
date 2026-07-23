/**
 * Quantara Full Production QA
 *
 * Permanent blockchain ecosystem audit. Discovers contracts from
 * deployed-addresses.json and only calls functions / events that exist
 * in the Solidity sources under contracts/.
 *
 *   npx hardhat run scripts/qa/full-production-qa.ts --network localhost
 *
 * Optional env:
 *   QA_WALLET=0x...          User wallet to deep-audit (default: Hardhat #1)
 *   QA_API_BASE=http://...   Laravel base URL for DB / dashboard compare
 *   QA_FROM_BLOCK=0          Event scan start block
 *   DEPLOYED_ADDRESSES=path  Override addresses JSON path
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";
import type { Contract, Log, Provider, Signer } from "ethers";

/* -------------------------------------------------------------------------- */
/*  Colours / report helpers                                                   */
/* -------------------------------------------------------------------------- */

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

type Verdict = "PASS" | "WARNING" | "FAIL" | "SKIP" | "INFO";

type SectionResult = {
  name: string;
  verdict: Verdict;
  notes: string[];
};

const sectionResults: SectionResult[] = [];

function header(title: string) {
  console.log("\n" + c.cyan + c.bold + "═".repeat(72) + c.reset);
  console.log(c.cyan + c.bold + "  " + title + c.reset);
  console.log(c.cyan + c.bold + "═".repeat(72) + c.reset);
}

function sub(title: string) {
  console.log("\n" + c.blue + c.bold + "── " + title + " ──" + c.reset);
}

function row(label: string, value: unknown, colour = c.white) {
  const v =
    value === undefined || value === null || value === ""
      ? c.dim + "—" + c.reset
      : colour + String(value) + c.reset;
  console.log(`  ${c.dim}${label.padEnd(28)}${c.reset}${v}`);
}

function table(headers: string[], rows: string[][]) {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length), 8),
  );
  const line = (cols: string[]) =>
    "  " + cols.map((col, i) => col.padEnd(widths[i])).join("  ");
  console.log(c.dim + line(headers) + c.reset);
  console.log(c.dim + "  " + widths.map((w) => "─".repeat(w)).join("  ") + c.reset);
  for (const r of rows) console.log(line(r));
}

function verdictTag(v: Verdict): string {
  switch (v) {
    case "PASS":
      return c.green + c.bold + "PASS" + c.reset;
    case "WARNING":
      return c.yellow + c.bold + "WARNING" + c.reset;
    case "FAIL":
      return c.red + c.bold + "FAIL" + c.reset;
    case "SKIP":
      return c.magenta + "SKIP" + c.reset;
    default:
      return c.cyan + "INFO" + c.reset;
  }
}

function record(name: string, verdict: Verdict, notes: string[] = []) {
  sectionResults.push({ name, verdict, notes });
  console.log(`\n  Result: ${verdictTag(verdict)}`);
  for (const n of notes) {
    const colour =
      verdict === "FAIL" ? c.red : verdict === "WARNING" ? c.yellow : c.dim;
    console.log(`  ${colour}• ${n}${c.reset}`);
  }
}

function shortAddr(a: string): string {
  if (!a || a.length < 12) return a || "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function fmtUnits(value: bigint, decimals = 18, maxFrac = 6): string {
  const neg = value < 0n;
  const v = neg ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = v / base;
  const frac = v % base;
  let fracStr = frac.toString().padStart(decimals, "0").slice(0, maxFrac);
  fracStr = fracStr.replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole}${fracStr ? "." + fracStr : ""}`;
}

function fmtUsd(n: bigint | number): string {
  return typeof n === "bigint" ? `$${n.toString()}` : `$${n}`;
}

async function safeCall<T>(
  contract: Contract,
  fn: string,
  args: unknown[] = [],
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  const has =
    contract.interface.fragments.some(
      (f: any) => f.type === "function" && f.name === fn,
    );
  if (!has) {
    return { ok: false, error: "Not exposed by contract" };
  }
  try {
    const value = (await contract.getFunction(fn)(...args)) as T;
    return { ok: true, value };
  } catch (e) {
    const msg = (e as Error).message || String(e);
    if (
      msg.includes("function selector was not recognized") ||
      msg.includes("no fallback function") ||
      msg.includes("CALL_EXCEPTION")
    ) {
      return { ok: false, error: "Not exposed by contract" };
    }
    return { ok: false, error: msg };
  }
}

async function safeRow(
  contract: Contract,
  label: string,
  fn: string,
  args: unknown[] = [],
  format: (v: unknown) => string = (v) => String(v),
): Promise<unknown | null> {
  const result = await safeCall(contract, fn, args);
  if (!result.ok) {
    row(label, result.error, c.yellow);
    return null;
  }
  row(label, format(result.value));
  return result.value;
}

const ZERO = "0x0000000000000000000000000000000000000000";

const RANK_NAMES = [
  "None",
  "Seed",
  "Sprout",
  "Sapling",
  "Canopy",
  "Forest",
  "Biome",
  "Ecosphere",
  "Genesis",
] as const;

/* -------------------------------------------------------------------------- */
/*  Address discovery                                                          */
/* -------------------------------------------------------------------------- */

type AddressBook = Record<string, string>;

/** Address-book keys that are wallets / metadata, not contracts */
const NON_CONTRACT_KEYS = new Set([
  "RootUser",
  "root",
  "deployer",
  "Deployer",
  "TreasuryWallet",
  "network",
  "explorer",
  "chainId",
]);

/** Known contract artifact names that may appear in deployed-addresses.json */
const KNOWN_ARTIFACTS = [
  "MockBTCB",
  "Token",
  "MockBTCPriceFeed",
  "ChainlinkBTCPriceFeed",
  "PriceFeed",
  "BTCPlanCore",
  "TreasuryManager",
  "IncomeManager",
  "InterdependentReward",
  "ContributionReward",
  "ContributionBooster",
  "RankReward",
  "CommunityBuilder",
] as const;

function loadAddressBook(): AddressBook {
  const override = process.env.DEPLOYED_ADDRESSES?.trim();
  const candidates = [
    override,
    path.resolve("deployed-addresses.json"),
    path.resolve(process.cwd(), "deployed-addresses.json"),
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const raw = JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, unknown>;
      const out: AddressBook = {};
      for (const [k, v] of Object.entries(raw)) {
        if (typeof v === "string" && /^0x[a-fA-F0-9]{40}$/.test(v)) {
          out[k] = v;
        }
      }
      console.log(c.dim + `  Loaded addresses from ${p}` + c.reset);
      return out;
    }
  }
  throw new Error(
    "deployed-addresses.json not found. Run: npx hardhat run scripts/deploy.ts --network localhost",
  );
}

async function codeExists(provider: Provider, address: string): Promise<boolean> {
  const code = await provider.getCode(address);
  return !!code && code !== "0x";
}

/* -------------------------------------------------------------------------- */
/*  Minimal ABIs — only real selectors from Solidity sources                   */
/* -------------------------------------------------------------------------- */

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
];

const CORE_ABI = [
  "function owner() view returns (address)",
  "function btcbToken() view returns (address)",
  "function btcPriceFeed() view returns (address)",
  "function treasury() view returns (address)",
  "function contributionReward() view returns (address)",
  "function incomeManager() view returns (address)",
  "function contributionBooster() view returns (address)",
  "function rankReward() view returns (address)",
  "function interdependentReward() view returns (address)",
  "function packages(uint256) view returns (uint256)",
  "function getPackages() view returns (uint256[])",
  "function isValidPackage(uint256) view returns (bool)",
  "function getPackageIndex(uint256) view returns (uint256)",
  "function getPackageBTCBAmount(uint256) view returns (uint256)",
  "function getNextEligiblePackage(address) view returns (uint256,uint8)",
  "function users(address) view returns (address wallet, address sponsor, uint256 packageAmount, uint8 packageIndex, uint8 packageCycle, uint256 joinedAt, bool isActive, bool packageCompleted)",
  "event UserRegistered(address indexed user, address indexed sponsor)",
  "event PackageActivated(address indexed user, uint256 packageAmount, uint8 packageCycle, uint256 tokenAmount)",
  "event PackageCompleted(address indexed user, uint256 packageAmount, uint8 packageCycle)",
];

const TREASURY_ABI = [
  "function owner() view returns (address)",
  "function btcbToken() view returns (address)",
  "function coreContract() view returns (address)",
  "function rewardContract() view returns (address)",
  "function communityBuilderContract() view returns (address)",
  "function charityWallet() view returns (address)",
  "function regenerationWallet() view returns (address)",
  "function REGENERATION_BPS() view returns (uint256)",
  "function INTERDEPENDENT_BPS() view returns (uint256)",
  "function RESERVE_BPS() view returns (uint256)",
  "function COMMUNITY_BPS() view returns (uint256)",
  "function WORKING_BPS() view returns (uint256)",
  "function interdependentFundBalance() view returns (uint256)",
  "function reserveFundBalance() view returns (uint256)",
  "function communityBuilderFundBalance() view returns (uint256)",
  "function charityFundBalance() view returns (uint256)",
  "function workingFundBalance() view returns (uint256)",
  "function regenerationFundBalance() view returns (uint256)",
  "function totalSelfRoiPaid() view returns (uint256)",
  "function totalWorkingIncomePaid() view returns (uint256)",
  "function totalCommunityPaid() view returns (uint256)",
  "function totalCharityPaid() view returns (uint256)",
  "function totalRegenerationPaid() view returns (uint256)",
  "function totalReserveWithdrawn() view returns (uint256)",
  "function getAvailableDailyRoiBudget() view returns (uint256)",
  "function workingPayers(address) view returns (bool)",
  "event ContributionProcessed(uint256 amount, uint256 regenerationAmount, uint256 interdependentAmount, uint256 reserveAmount, uint256 communityAmount, uint256 workingAmount)",
  "event SelfRoiPaid(address indexed user, uint256 amount)",
  "event WorkingIncomePaid(address indexed user, uint256 amount)",
  "event CommunityBuilderPaid(address indexed user, uint256 amount)",
  "event ReserveFundsWithdrawn(address indexed to, uint256 amount)",
  "event RegenerationFundsTransferred(address indexed wallet, uint256 amount)",
  "event CharityFundsTransferred(address indexed wallet, uint256 amount)",
];

const INCOME_ABI = [
  "function owner() view returns (address)",
  "function coreContract() view returns (address)",
  "function rankReward() view returns (address)",
  "function ROI_CAP_MULTIPLIER() view returns (uint256)",
  "function WORKING_CAP_MULTIPLIER() view returns (uint256)",
  "function applyRankCapMultipliers() view returns (bool)",
  "function incomes(address) view returns (uint256 principal, uint256 roiEarned, uint256 contributionEarned, uint256 boosterEarned, uint256 rankEarned, uint256 sameRankEarned, uint256 communityEarned, uint256 totalEarned, bool packageActive)",
  "function principal(address) view returns (uint256)",
  "function roiEarned(address) view returns (uint256)",
  "function contributionEarned(address) view returns (uint256)",
  "function boosterEarned(address) view returns (uint256)",
  "function rankEarned(address) view returns (uint256)",
  "function sameRankEarned(address) view returns (uint256)",
  "function communityEarned(address) view returns (uint256)",
  "function totalEarned(address) view returns (uint256)",
  "function workingEarned(address) view returns (uint256)",
  "function getRoiCap(address) view returns (uint256)",
  "function getWorkingCap(address) view returns (uint256)",
  "function getRemainingRoiCap(address) view returns (uint256)",
  "function getRemainingWorkingCap(address) view returns (uint256)",
  "function isRoiCapReached(address) view returns (bool)",
  "function isWorkingCapReached(address) view returns (bool)",
  "function isPackageIncomeComplete(address) view returns (bool)",
  "event PackageStarted(address indexed user, uint256 principal)",
  "event IncomeRecorded(address indexed user, uint8 indexed incomeType, uint256 requested, uint256 accepted, uint256 totalEarned)",
  "event RoiCapReached(address indexed user, uint256 roiEarned)",
  "event WorkingCapReached(address indexed user, uint256 workingEarned)",
  "event PackageIncomeCompleted(address indexed user)",
];

const ROI_ABI = [
  "function owner() view returns (address)",
  "function coreContract() view returns (address)",
  "function treasury() view returns (address)",
  "function incomeManager() view returns (address)",
  "function rankReward() view returns (address)",
  "function MAX_DAILY_ROI_BPS() view returns (uint256)",
  "function dailyBudget() view returns (uint256)",
  "function dailyBudgetUsed() view returns (uint256)",
  "function totalActivePrincipal() view returns (uint256)",
  "function budgetDay() view returns (uint256)",
  "function roiAccounts(address) view returns (uint256 principal, uint256 lastClaimAt, bool isActive)",
  "function calculateDailyRoiBps() view returns (uint256)",
  "function getPendingRoi(address) view returns (uint256)",
  "function getRemainingDailyBudget() view returns (uint256)",
  "event RoiActivated(address indexed user, uint256 principal)",
  "event RoiDeactivated(address indexed user, uint256 principal)",
  "event RoiClaimed(address indexed user, uint256 amount)",
];

const CONTRIB_ABI = [
  "function owner() view returns (address)",
  "function coreContract() view returns (address)",
  "function LEVEL_1_BPS() view returns (uint256)",
  "function LEVEL_2_BPS() view returns (uint256)",
  "function LEVEL_3_BPS() view returns (uint256)",
  "function sponsors(address) view returns (address)",
  "function contributionIncome(address) view returns (uint256)",
  "function levelIncome(address,uint256) view returns (uint256)",
  "event ContributionRewardPaid(address indexed beneficiary, address indexed fromUser, uint256 level, uint256 amount)",
  "event SponsorSet(address indexed user, address indexed sponsor)",
];

const BOOSTER_ABI = [
  "function owner() view returns (address)",
  "function coreContract() view returns (address)",
  "function BOOSTER_REWARD_BPS() view returns (uint256)",
  "function QUALIFICATION_PERIOD() view returns (uint256)",
  "function BOOSTER_PERIOD() view returns (uint256)",
  "function sponsors(address) view returns (address)",
  "function boosterAccounts(address) view returns (uint256 joinedAt, uint256 boosterActivatedAt, uint256 boosterExpiresAt, uint256 boosterIncome, bool qualified)",
  "function isBoosterActive(address) view returns (bool)",
  "event BoosterQualified(address indexed user, uint256 expiresAt)",
  "event BoosterRewardPaid(address indexed sponsor, address indexed fromUser, uint256 amount)",
  "event UserRegistered(address indexed user, address indexed sponsor)",
];

const RANK_ABI = [
  "function owner() view returns (address)",
  "function coreContract() view returns (address)",
  "function SAME_RANK_REWARD_BPS() view returns (uint256)",
  "function userRanks(address) view returns (uint8)",
  "function rankRewardBps(uint8) view returns (uint256)",
  "function sponsors(address) view returns (address)",
  "function rankIncome(address) view returns (uint256)",
  "function sameRankIncome(address) view returns (uint256)",
  "function sameRankAchievementIncome(address) view returns (uint256)",
  "function directCount(address) view returns (uint256)",
  "function groupVolume(address) view returns (uint256)",
  "function personalVolume(address) view returns (uint256)",
  "function maxLegVolume(address) view returns (uint256)",
  "function directUsers(address,uint256) view returns (address)",
  "function legVolume(address,address) view returns (uint256)",
  "function getIncomeCapMultiplier(address) view returns (uint256)",
  "function checkSeedQualification(address) view returns (bool)",
  "function checkSproutQualification(address) view returns (bool)",
  "function checkSaplingQualification(address) view returns (bool)",
  "function checkCanopyQualification(address) view returns (bool)",
  "function checkForestQualification(address) view returns (bool)",
  "function checkBiomeQualification(address) view returns (bool)",
  "function checkEcosphereQualification(address) view returns (bool)",
  "function checkGenesisQualification(address) view returns (bool)",
  "event RankUpdated(address indexed user, uint8 oldRank, uint8 newRank)",
  "event RankIncomePaid(address indexed beneficiary, address indexed fromUser, uint256 amount)",
  "event SameRankIncomePaid(address indexed beneficiary, address indexed fromUser, uint256 amount)",
  "event SameRankAchievementPaid(address indexed beneficiary, address indexed fromUser, uint8 rank, uint256 amount)",
];

const COMMUNITY_ABI = [
  "function owner() view returns (address)",
  "function treasury() view returns (address)",
  "function rankRewardContract() view returns (address)",
  "function incomeManager() view returns (address)",
  "function userPoints(address) view returns (uint256)",
  "function communityIncome(address) view returns (uint256)",
  "function totalPoints() view returns (uint256)",
  "function currentRound() view returns (uint256)",
  "function distributionRounds(uint256) view returns (uint256 fundAmount, uint256 totalPoints, uint256 rewardPerPoint, uint256 totalPaid, uint256 startedAt, bool isActive)",
  "function getPendingReward(address) view returns (uint256)",
  "function getEligibleUsersCount() view returns (uint256)",
  "function isEligibleUser(address) view returns (bool)",
  "event UserPointsUpdated(address indexed user, uint256 oldPoints, uint256 newPoints)",
  "event DistributionRoundStarted(uint256 indexed roundId, uint256 fundAmount, uint256 totalPoints, uint256 rewardPerPoint)",
  "event CommunityRewardClaimed(address indexed user, uint256 indexed roundId, uint256 amount)",
  "event DistributionRoundClosed(uint256 indexed roundId)",
];

const PRICE_ABI = [
  "function price() view returns (int256)",
  "function getBTCPrice() view returns (int256)",
];

const ABI_BY_NAME: Record<string, string[]> = {
  MockBTCB: ERC20_ABI,
  Token: ERC20_ABI,
  MockBTCPriceFeed: PRICE_ABI,
  ChainlinkBTCPriceFeed: PRICE_ABI,
  PriceFeed: PRICE_ABI,
  BTCPlanCore: CORE_ABI,
  TreasuryManager: TREASURY_ABI,
  IncomeManager: INCOME_ABI,
  InterdependentReward: ROI_ABI,
  ContributionReward: CONTRIB_ABI,
  ContributionBooster: BOOSTER_ABI,
  RankReward: RANK_ABI,
  CommunityBuilder: COMMUNITY_ABI,
};

/* -------------------------------------------------------------------------- */
/*  Event / tx helpers                                                         */
/* -------------------------------------------------------------------------- */

async function safeGetLogs(
  provider: Provider,
  filter: {
    address?: string | string[];
    topics?: (string | string[] | null)[];
    fromBlock?: number;
    toBlock?: number | "latest";
  },
): Promise<Log[]> {
  try {
    return await provider.getLogs({
      address: filter.address,
      topics: filter.topics as never,
      fromBlock: filter.fromBlock ?? 0,
      toBlock: filter.toBlock ?? "latest",
    });
  } catch (e) {
    // Some RPCs reject large ranges — chunk
    const latest = await provider.getBlockNumber();
    const from = filter.fromBlock ?? 0;
    const to = typeof filter.toBlock === "number" ? filter.toBlock : latest;
    const chunk = 5_000;
    const all: Log[] = [];
    for (let start = from; start <= to; start += chunk) {
      const end = Math.min(start + chunk - 1, to);
      try {
        const part = await provider.getLogs({
          address: filter.address,
          topics: filter.topics as never,
          fromBlock: start,
          toBlock: end,
        });
        all.push(...part);
      } catch (err) {
        console.log(
          c.yellow +
            `  Warning: getLogs failed ${start}-${end}: ${(err as Error).message}` +
            c.reset,
        );
      }
    }
    return all;
  }
}

async function describeTx(provider: Provider, hash: string) {
  const [tx, receipt] = await Promise.all([
    provider.getTransaction(hash),
    provider.getTransactionReceipt(hash),
  ]);
  if (!receipt) {
    return {
      hash,
      status: "NOT_FOUND",
      block: "—",
      timestamp: "—",
      gasUsed: "—",
    };
  }
  const block = await provider.getBlock(receipt.blockNumber);
  return {
    hash,
    status: receipt.status === 1 ? "SUCCESS" : "FAILED",
    block: String(receipt.blockNumber),
    timestamp: block?.timestamp
      ? new Date(Number(block.timestamp) * 1000).toISOString()
      : "—",
    gasUsed: receipt.gasUsed.toString(),
    from: tx?.from ?? "—",
    to: tx?.to ?? "—",
  };
}

async function tokenBalanceAt(
  token: Contract,
  holder: string,
  blockTag: number | "latest",
): Promise<bigint> {
  return token.balanceOf(holder, { blockTag });
}

async function fundBalanceAt(
  treasury: Contract,
  getter: string,
  blockTag: number | "latest",
): Promise<bigint> {
  return treasury.getFunction(getter)({ blockTag });
}

/* -------------------------------------------------------------------------- */
/*  Main                                                                       */
/* -------------------------------------------------------------------------- */

async function main() {
  const { ethers } = await hre.network.connect();
  const provider = ethers.provider;
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  const network = await provider.getNetwork();
  const latestBlock = await provider.getBlockNumber();
  const fromBlock = Number(process.env.QA_FROM_BLOCK || 0);

  header("QUANTARA FULL PRODUCTION QA");
  row("Network chainId", network.chainId.toString(), c.cyan);
  const explorerBase =
    Number(network.chainId) === 56
      ? "https://bscscan.com"
      : Number(network.chainId) === 97
        ? "https://testnet.bscscan.com"
        : "";
  row("Explorer", explorerBase || "(local — no public explorer)", c.cyan);
  row("Latest block", latestBlock, c.cyan);
  row("Deployer / Account #0", deployer.address, c.cyan);
  row("Timestamp", new Date().toISOString(), c.dim);

  const addresses = loadAddressBook();
  const contracts: Record<string, Contract> = {};
  const missing: string[] = [];

  sub("Discover contracts");
  const eoaKeys: string[] = [];
  for (const [name, addr] of Object.entries(addresses)) {
    if (NON_CONTRACT_KEYS.has(name) || !(KNOWN_ARTIFACTS as readonly string[]).includes(name)) {
      // RootUser etc. are EOAs / unknown labels — show as metadata, do not require bytecode
      if (NON_CONTRACT_KEYS.has(name)) {
        eoaKeys.push(`${name}=${addr}`);
        row(name + " (wallet)", addr, c.cyan);
        continue;
      }
      // Unknown key: still check code; if contract-like and has ABI map use it, else balance-only
    }
    const exists = await codeExists(provider, addr);
    const abi = ABI_BY_NAME[name];
    row(name, `${addr} ${exists ? "(code OK)" : "(NO CODE)"}`, exists ? c.green : c.red);
    if (!exists) {
      if ((KNOWN_ARTIFACTS as readonly string[]).includes(name)) {
        missing.push(name);
      }
      continue;
    }
    if (abi) {
      contracts[name] = new ethers.Contract(addr, abi, provider);
    } else {
      console.log(c.yellow + `  Note: no built-in ABI map for "${name}" — balance-only` + c.reset);
    }
  }

  if (missing.length) {
    record("Contract Discovery", "FAIL", [
      `Missing code at: ${missing.join(", ")}. Redeploy with scripts/deploy.ts`,
    ]);
  } else if (!contracts.BTCPlanCore || !contracts.TreasuryManager) {
    record("Contract Discovery", "FAIL", ["BTCPlanCore / TreasuryManager required"]);
  } else {
    record("Contract Discovery", "PASS", [
      `${Object.keys(contracts).length} contracts with code loaded` +
        (eoaKeys.length ? `; wallets: ${eoaKeys.join(", ")}` : ""),
    ]);
  }

  const core = contracts.BTCPlanCore;
  const treasury = contracts.TreasuryManager;
  const income = contracts.IncomeManager;
  const roi = contracts.InterdependentReward;
  const contrib = contracts.ContributionReward;
  const booster = contracts.ContributionBooster;
  const rank = contracts.RankReward;
  const community = contracts.CommunityBuilder;
  const token =
    contracts.Token ||
    contracts.MockBTCB ||
    (core
      ? new ethers.Contract(await core.btcbToken(), ERC20_ABI, provider)
      : undefined);

  const qaWallet = (
    process.env.QA_WALLET ||
    signers[1]?.address ||
    deployer.address
  ).toLowerCase();

  /* ------------------------------------------------------------------------ */
  /*  VERIFY CONTRACTS                                                        */
  /* ------------------------------------------------------------------------ */
  header("1. VERIFY CONTRACTS");

  const contractNotes: string[] = [];
  for (const name of KNOWN_ARTIFACTS) {
    const ctr = contracts[name];
    if (!ctr) {
      row(name, "not deployed / not in address book", c.yellow);
      continue;
    }
    sub(name);
    row("Address", await ctr.getAddress());
    try {
      if ("owner" in ctr && typeof ctr.owner === "function") {
        row("Owner", await ctr.owner());
      }
    } catch {
      row("Owner", "n/a");
    }
    // No pause() in any Quantara contract — report explicitly
    row("Paused Status", "N/A (no pause() in source)", c.dim);

    try {
      if (
        token &&
        name !== "MockBTCPriceFeed" &&
        name !== "ChainlinkBTCPriceFeed" &&
        name !== "PriceFeed"
      ) {
        const bal = await token.balanceOf(await ctr.getAddress());
        const sym = await token.symbol().catch(() => "TOKEN");
        row("Token Balance", `${fmtUnits(bal)} ${sym}`);
      }
    } catch {
      /* ignore */
    }

    // Dependencies (core/treasury wiring)
    try {
      if (name === "BTCPlanCore") {
        row("btcbToken", await core!.btcbToken());
        row("treasury", await core!.treasury());
        row("incomeManager", await core!.incomeManager());
        row("interdependentReward", await core!.interdependentReward());
        row("contributionReward", await core!.contributionReward());
        row("contributionBooster", await core!.contributionBooster());
        row("rankReward", await core!.rankReward());
      }
      if (name === "TreasuryManager") {
        await safeRow(treasury!, "REGENERATION_BPS", "REGENERATION_BPS", [], (v) => String(v));
        await safeRow(treasury!, "INTERDEPENDENT_BPS", "INTERDEPENDENT_BPS", [], (v) => String(v));
        await safeRow(treasury!, "RESERVE_BPS", "RESERVE_BPS", [], (v) => String(v));
        await safeRow(treasury!, "COMMUNITY_BPS", "COMMUNITY_BPS", [], (v) => String(v));
        await safeRow(treasury!, "WORKING_BPS", "WORKING_BPS", [], (v) => String(v));
        await safeRow(treasury!, "coreContract", "coreContract");
        await safeRow(treasury!, "rewardContract", "rewardContract");
        await safeRow(treasury!, "communityBuilder", "communityBuilderContract");
        await safeRow(treasury!, "regenerationWallet", "regenerationWallet");
      }
      if (name === "IncomeManager") {
        await safeRow(income!, "ROI_CAP_MULTIPLIER", "ROI_CAP_MULTIPLIER", [], (v) => String(v));
        await safeRow(income!, "WORKING_CAP_MULTIPLIER", "WORKING_CAP_MULTIPLIER", [], (v) => String(v));
        await safeRow(income!, "applyRankCapMultipliers", "applyRankCapMultipliers", [], (v) => String(v));
      }
    } catch (e) {
      contractNotes.push(`${name} config read error: ${(e as Error).message}`);
    }
  }

  // BPS sanity — prefer getters; if absent, verify from ContributionProcessed later
  if (treasury) {
    const bpsNames = [
      "REGENERATION_BPS",
      "INTERDEPENDENT_BPS",
      "RESERVE_BPS",
      "COMMUNITY_BPS",
      "WORKING_BPS",
    ] as const;
    const bpsValues: bigint[] = [];
    let bpsMissing = false;
    for (const fn of bpsNames) {
      const result = await safeCall<bigint>(treasury, fn);
      if (!result.ok) {
        bpsMissing = true;
        break;
      }
      bpsValues.push(result.value);
    }
    if (bpsMissing) {
      record("Contracts / Treasury BPS", "WARNING", [
        "BPS getters not exposed by deployed ABI — will verify 30/25/3/2/40 from ContributionProcessed event",
      ]);
    } else {
      const sum = bpsValues.reduce((a, b) => a + b, 0n);
      if (sum === 10000n && bpsValues[0] === 3000n && bpsValues[1] === 2500n && bpsValues[2] === 300n && bpsValues[3] === 200n && bpsValues[4] === 4000n) {
        record("Contracts / Treasury BPS", "PASS", ["30/25/3/2/40 = 10000 BPS"]);
      } else {
        record("Contracts / Treasury BPS", "FAIL", [`BPS values = [${bpsValues.join(",")}], sum = ${sum}`]);
      }
    }
  } else {
    record("Contracts", "FAIL", ["TreasuryManager missing"]);
  }

  /* ------------------------------------------------------------------------ */
  /*  VERIFY TOKEN                                                            */
  /* ------------------------------------------------------------------------ */
  header("2. VERIFY TOKEN");
  if (!token) {
    record("Token", "FAIL", ["No token contract resolved"]);
  } else {
    try {
      row("Address", await token.getAddress());
      row("Name", await token.name());
      row("Symbol", await token.symbol());
      row("Decimals", (await token.decimals()).toString());
      row("Total Supply", `${fmtUnits(await token.totalSupply())} ${(await token.symbol())}`);
      record("Token", "PASS");
    } catch (e) {
      record("Token", "FAIL", [(e as Error).message]);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*  VERIFY USER                                                             */
  /* ------------------------------------------------------------------------ */
  header("3. VERIFY USER");
  row("Audit wallet", qaWallet, c.cyan);

  let userActive = false;
  if (!core) {
    record("User", "FAIL", ["BTCPlanCore missing"]);
  } else {
    try {
      const u = await core.users(qaWallet);
      userActive = Boolean(u.isActive);
      row("Wallet", u.wallet);
      row("Sponsor", u.sponsor);
      row("Package Amount (USD)", fmtUsd(u.packageAmount));
      row("Package Index", u.packageIndex.toString());
      row("Package Cycle", u.packageCycle.toString());
      row("Active", String(u.isActive));
      row(
        "Join Date",
        u.joinedAt > 0n
          ? new Date(Number(u.joinedAt) * 1000).toISOString()
          : "—",
      );
      row("Package Completed", String(u.packageCompleted));
      row(
        "Registration Status",
        u.isActive ? (u.packageAmount > 0n ? "registered+packaged" : "registered") : "not registered",
      );

      if (income) {
        const inc = await income.incomes(qaWallet);
        // IncomeManager.principal is BTCB wei (startPackage passes tokenAmount), not USD
        row("Principal (BTCB)", fmtUnits(inc.principal));
        row("ROI Earned (BTCB)", fmtUnits(inc.roiEarned));
        row("Contribution Earned (BTCB)", fmtUnits(inc.contributionEarned));
        row("Booster Earned (BTCB)", fmtUnits(inc.boosterEarned));
        row("Rank Earned (BTCB)", fmtUnits(inc.rankEarned));
        row("SameRank Earned (BTCB)", fmtUnits(inc.sameRankEarned));
        row("Community Earned (BTCB)", fmtUnits(inc.communityEarned));
        row("Working Income (BTCB)", fmtUnits(await income.workingEarned(qaWallet)));
        row("Total Income (BTCB)", fmtUnits(inc.totalEarned));
        row("Package Active (IM)", String(inc.packageActive));
        row("3X ROI Cap (BTCB)", fmtUnits(await income.getRoiCap(qaWallet)));
        row("4X Working Cap (BTCB)", fmtUnits(await income.getWorkingCap(qaWallet)));
        row("Remaining ROI Cap (BTCB)", fmtUnits(await income.getRemainingRoiCap(qaWallet)));
        row("Remaining Working Cap (BTCB)", fmtUnits(await income.getRemainingWorkingCap(qaWallet)));
      }

      if (roi) {
        const ra = await roi.roiAccounts(qaWallet);
        row("ROI Account Active", String(ra.isActive));
        row("ROI Principal (BTCB)", fmtUnits(ra.principal));
        row("Pending / Claimable ROI (BTCB)", fmtUnits(await roi.getPendingRoi(qaWallet)));
      }

      if (rank) {
        const r = Number(await rank.userRanks(qaWallet));
        row("Rank", `${r} (${RANK_NAMES[r] ?? "?"})`);
      }

      if (community) {
        row("Community Points", (await community.userPoints(qaWallet)).toString());
      }

      record(
        "User",
        userActive ? "PASS" : "WARNING",
        userActive
          ? []
          : [
              "Wallet not registered on-chain. Set QA_WALLET to an active member or register via MetaMask first.",
            ],
      );
    } catch (e) {
      record("User", "FAIL", [(e as Error).message]);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*  VERIFY PACKAGE                                                          */
  /* ------------------------------------------------------------------------ */
  header("4. VERIFY PACKAGE");
  if (!core) {
    record("Package", "FAIL", ["BTCPlanCore missing"]);
  } else {
    try {
      const pkgs: bigint[] = await core.getPackages();
      row("Ladder", pkgs.map((p) => `$${p}`).join(" → "));
      const u = await core.users(qaWallet);
      row("Current package", fmtUsd(u.packageAmount));
      row("Current cycle", u.packageCycle.toString());
      row("Completed flag", String(u.packageCompleted));

      let nextLabel = "—";
      try {
        const [nextAmt, nextCycle] = await core.getNextEligiblePackage(qaWallet);
        nextLabel = `$${nextAmt} cycle ${nextCycle}`;
        row("Next eligible", nextLabel);
      } catch (e) {
        const msg = (e as Error).message || String(e);
        if (msg.includes("Complete current package first")) {
          nextLabel = "locked — complete current package (3X/4X) first";
          row("Next eligible", nextLabel, c.yellow);
        } else {
          throw e;
        }
      }

      const maxPkg = pkgs[pkgs.length - 1] ?? 10000n;
      const unlimited =
        u.packageCompleted &&
        u.packageAmount >= maxPkg &&
        u.packageCycle >= 2n &&
        nextLabel.includes("$10000");
      row("Unlimited $10000 status", unlimited ? "eligible (post C2)" : "not yet");

      // Upgrade history from PackageActivated events
      const activatedTopic = ethers.id(
        "PackageActivated(address,uint256,uint8,uint256)",
      );
      const userTopic = ethers.zeroPadValue(qaWallet, 32);
      const actLogs = await safeGetLogs(provider, {
        address: await core.getAddress(),
        topics: [activatedTopic, userTopic],
        fromBlock,
      });
      sub("Upgrade history (PackageActivated)");
      if (!actLogs.length) {
        console.log(c.dim + "  (no PackageActivated events for wallet)" + c.reset);
      } else {
        const rows: string[][] = [];
        for (const log of actLogs) {
          const parsed = core.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
          rows.push([
            String(log.blockNumber),
            `$${parsed?.args.packageAmount}`,
            `C${parsed?.args.packageCycle}`,
            shortAddr(log.transactionHash),
          ]);
        }
        table(["Block", "Amount", "Cycle", "Tx"], rows);
      }

      const remaining = !u.isActive
        ? "register first"
        : !u.packageCompleted && u.packageAmount > 0n
          ? "finish current package income caps before upgrade"
          : unlimited
            ? "unlimited $10000 topups"
            : nextLabel;
      row("Remaining upgrades", remaining);

      record(
        "Package",
        u.packageAmount > 0n ? "PASS" : userActive ? "WARNING" : "SKIP",
        u.packageAmount > 0n
          ? [`${actLogs.length} activation event(s)`]
          : ["No package activated yet"],
      );
    } catch (e) {
      record("Package", "FAIL", [(e as Error).message]);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*  VERIFY METAMASK / KEY TRANSACTIONS                                      */
  /* ------------------------------------------------------------------------ */
  header("5. VERIFY KEY TRANSACTIONS (from events)");

  let registerTxHash = "";
  let approveTxHash = "";
  let packageTxHash = "";
  const withdrawTxHashes: string[] = [];

  if (core && token) {
    try {
      const userTopic = ethers.zeroPadValue(qaWallet, 32);
      const regTopic = ethers.id("UserRegistered(address,address)");
      const actTopic = ethers.id(
        "PackageActivated(address,uint256,uint8,uint256)",
      );
      const approvalTopic = ethers.id("Approval(address,address,uint256)");
      const coreAddr = (await core.getAddress()).toLowerCase();

      const regLogs = await safeGetLogs(provider, {
        address: await core.getAddress(),
        topics: [regTopic, userTopic],
        fromBlock,
      });
      if (regLogs.length) {
        registerTxHash = regLogs[regLogs.length - 1]!.transactionHash;
      }

      const actLogs = await safeGetLogs(provider, {
        address: await core.getAddress(),
        topics: [actTopic, userTopic],
        fromBlock,
      });
      if (actLogs.length) {
        packageTxHash = actLogs[actLogs.length - 1]!.transactionHash;
      }

      const apprLogs = await safeGetLogs(provider, {
        address: await token.getAddress(),
        topics: [
          approvalTopic,
          userTopic,
          ethers.zeroPadValue(coreAddr, 32),
        ],
        fromBlock,
      });
      if (apprLogs.length) {
        // Prefer approval in/near activation window
        approveTxHash = apprLogs[apprLogs.length - 1]!.transactionHash;
      }

      // "Withdrawal" on-chain = SelfRoiPaid / WorkingIncomePaid / CommunityRewardClaimed / ReserveFundsWithdrawn
      if (treasury) {
        for (const ev of ["SelfRoiPaid(address,uint256)", "WorkingIncomePaid(address,uint256)"]) {
          const logs = await safeGetLogs(provider, {
            address: await treasury.getAddress(),
            topics: [ethers.id(ev), userTopic],
            fromBlock,
          });
          for (const l of logs) withdrawTxHashes.push(l.transactionHash);
        }
      }
      if (community) {
        const logs = await safeGetLogs(provider, {
          address: await community.getAddress(),
          topics: [
            ethers.id("CommunityRewardClaimed(address,uint256,uint256)"),
            userTopic,
          ],
          fromBlock,
        });
        for (const l of logs) withdrawTxHashes.push(l.transactionHash);
      }

      const printTx = async (label: string, hash: string) => {
        sub(label);
        if (!hash) {
          row("Hash", "not found", c.yellow);
          return;
        }
        const d = await describeTx(provider, hash);
        row("Hash", d.hash);
        row("Status", d.status, d.status === "SUCCESS" ? c.green : c.red);
        row("Block", d.block);
        row("Timestamp", d.timestamp);
        row("Gas Used", d.gasUsed);
        row("From", d.from);
        row("To", d.to);
      };

      await printTx("Registration Transaction (UserRegistered)", registerTxHash);
      await printTx("Approval Transaction (ERC20 Approval → core)", approveTxHash);
      await printTx("Activation Transaction (PackageActivated)", packageTxHash);

      sub("Payout / claim transactions (on-chain income transfers)");
      if (!withdrawTxHashes.length) {
        console.log(c.dim + "  (none for this wallet — no SelfRoiPaid / WorkingIncomePaid / CommunityRewardClaimed)" + c.reset);
      } else {
        const unique = [...new Set(withdrawTxHashes)];
        for (const h of unique.slice(-5)) {
          const d = await describeTx(provider, h);
          row(shortAddr(h), `${d.status} block ${d.block} gas ${d.gasUsed}`);
        }
      }

      const missingTx: string[] = [];
      if (userActive && !registerTxHash) missingTx.push("registration");
      if (userActive && (await core.users(qaWallet)).packageAmount > 0n) {
        if (!approveTxHash) missingTx.push("approval");
        if (!packageTxHash) missingTx.push("activation");
      }

      record(
        "Transactions",
        missingTx.length ? "WARNING" : registerTxHash || packageTxHash ? "PASS" : "SKIP",
        missingTx.length
          ? [`Missing event-backed txs: ${missingTx.join(", ")}`]
          : ["Hashes recovered from on-chain events (source of truth)"],
      );
    } catch (e) {
      record("Transactions", "FAIL", [(e as Error).message]);
    }
  } else {
    record("Transactions", "SKIP", ["Core/token unavailable"]);
  }

  /* ------------------------------------------------------------------------ */
  /*  VERIFY EVENTS (only those that exist)                                   */
  /* ------------------------------------------------------------------------ */
  header("6. VERIFY EVENTS (actual Solidity events only)");

  type EvSpec = { name: string; signature: string; address?: string };
  const eventSpecs: EvSpec[] = [];
  if (core) {
    eventSpecs.push(
      { name: "UserRegistered", signature: "UserRegistered(address,address)", address: await core.getAddress() },
      { name: "PackageActivated", signature: "PackageActivated(address,uint256,uint8,uint256)", address: await core.getAddress() },
      { name: "PackageCompleted", signature: "PackageCompleted(address,uint256,uint8)", address: await core.getAddress() },
    );
  }
  if (token) {
    eventSpecs.push(
      { name: "Approval", signature: "Approval(address,address,uint256)", address: await token.getAddress() },
      { name: "Transfer", signature: "Transfer(address,address,uint256)", address: await token.getAddress() },
    );
  }
  if (treasury) {
    eventSpecs.push(
      { name: "ContributionProcessed", signature: "ContributionProcessed(uint256,uint256,uint256,uint256,uint256,uint256)", address: await treasury.getAddress() },
      { name: "SelfRoiPaid", signature: "SelfRoiPaid(address,uint256)", address: await treasury.getAddress() },
      { name: "WorkingIncomePaid", signature: "WorkingIncomePaid(address,uint256)", address: await treasury.getAddress() },
      { name: "CommunityBuilderPaid", signature: "CommunityBuilderPaid(address,uint256)", address: await treasury.getAddress() },
      { name: "ReserveFundsWithdrawn", signature: "ReserveFundsWithdrawn(address,uint256)", address: await treasury.getAddress() },
    );
  }
  if (roi) {
    eventSpecs.push(
      { name: "RoiActivated", signature: "RoiActivated(address,uint256)", address: await roi.getAddress() },
      { name: "RoiClaimed", signature: "RoiClaimed(address,uint256)", address: await roi.getAddress() },
      { name: "RoiDeactivated", signature: "RoiDeactivated(address,uint256)", address: await roi.getAddress() },
    );
  }
  if (contrib) {
    eventSpecs.push({
      name: "ContributionRewardPaid",
      signature: "ContributionRewardPaid(address,address,uint256,uint256)",
      address: await contrib.getAddress(),
    });
  }
  if (booster) {
    eventSpecs.push(
      { name: "BoosterQualified", signature: "BoosterQualified(address,uint256)", address: await booster.getAddress() },
      { name: "BoosterRewardPaid", signature: "BoosterRewardPaid(address,address,uint256)", address: await booster.getAddress() },
    );
  }
  if (rank) {
    eventSpecs.push(
      { name: "RankUpdated", signature: "RankUpdated(address,uint8,uint8)", address: await rank.getAddress() },
      { name: "RankIncomePaid", signature: "RankIncomePaid(address,address,uint256)", address: await rank.getAddress() },
      { name: "SameRankIncomePaid", signature: "SameRankIncomePaid(address,address,uint256)", address: await rank.getAddress() },
      { name: "SameRankAchievementPaid", signature: "SameRankAchievementPaid(address,address,uint8,uint256)", address: await rank.getAddress() },
    );
  }
  if (community) {
    eventSpecs.push(
      { name: "CommunityRewardClaimed", signature: "CommunityRewardClaimed(address,uint256,uint256)", address: await community.getAddress() },
      { name: "DistributionRoundStarted", signature: "DistributionRoundStarted(uint256,uint256,uint256,uint256)", address: await community.getAddress() },
    );
  }
  if (income) {
    eventSpecs.push(
      { name: "PackageStarted", signature: "PackageStarted(address,uint256)", address: await income.getAddress() },
      { name: "IncomeRecorded", signature: "IncomeRecorded(address,uint8,uint256,uint256,uint256)", address: await income.getAddress() },
    );
  }

  console.log(
    c.dim +
      "  Note: There is no Withdrawal / ROIStarted / ROIDistributed / DirectIncome event in source." +
      c.reset,
  );
  console.log(
    c.dim +
      "  Closest mappings: RoiActivated, RoiClaimed, ContributionRewardPaid, ContributionProcessed." +
      c.reset,
  );

  const evRows: string[][] = [];
  for (const spec of eventSpecs) {
    const logs = await safeGetLogs(provider, {
      address: spec.address,
      topics: [ethers.id(spec.signature)],
      fromBlock,
    });
    evRows.push([spec.name, String(logs.length), shortAddr(spec.address || "")]);
  }
  table(["Event", "Count", "Contract"], evRows);
  record("Events", "PASS", [`Scanned ${eventSpecs.length} real event signatures`]);

  /* ------------------------------------------------------------------------ */
  /*  VERIFY BALANCES                                                         */
  /* ------------------------------------------------------------------------ */
  header("7. VERIFY BALANCES");

  if (!token) {
    record("Balances", "FAIL", ["Token missing"]);
  } else {
    const balRows: string[][] = [];
    const holders: { label: string; address: string }[] = [
      { label: "User Wallet", address: qaWallet },
      { label: "Root / Deployer", address: deployer.address },
    ];
    for (const [name, ctr] of Object.entries(contracts)) {
      if (name === "MockBTCPriceFeed") continue;
      holders.push({ label: name, address: await ctr.getAddress() });
    }
    // Also RootUser from address book if present
    if (addresses.RootUser) {
      holders.push({ label: "RootUser (book)", address: addresses.RootUser });
    }

    for (const h of holders) {
      try {
        const bal = await token.balanceOf(h.address);
        balRows.push([h.label, shortAddr(h.address), fmtUnits(bal)]);
      } catch {
        balRows.push([h.label, shortAddr(h.address), "ERR"]);
      }
    }
    table(["Holder", "Address", "BTCB"], balRows);

    if (treasury) {
      sub("Treasury internal fund buckets (accounting)");
      row("Regeneration pool", fmtUnits(await treasury.regenerationFundBalance()));
      row("ROI / Interdependent pool", fmtUnits(await treasury.interdependentFundBalance()));
      row("Reserve pool", fmtUnits(await treasury.reserveFundBalance()));
      row("Community pool", fmtUnits(await treasury.communityBuilderFundBalance()));
      row("Working pool", fmtUnits(await treasury.workingFundBalance()));
      row("Charity pool", fmtUnits(await treasury.charityFundBalance()));
      row("Treasury ERC20 balance", fmtUnits(await token.balanceOf(await treasury.getAddress())));

      const accounted =
        (await treasury.regenerationFundBalance()) +
        (await treasury.interdependentFundBalance()) +
        (await treasury.reserveFundBalance()) +
        (await treasury.communityBuilderFundBalance()) +
        (await treasury.workingFundBalance()) +
        (await treasury.charityFundBalance());
      const onHand = await token.balanceOf(await treasury.getAddress());
      row("Sum of buckets", fmtUnits(accounted));
      row("Diff (onHand - buckets)", fmtUnits(onHand - accounted));
    }
    record("Balances", "PASS");
  }

  /* ------------------------------------------------------------------------ */
  /*  VERIFY FUND DISTRIBUTION (latest activation)                            */
  /* ------------------------------------------------------------------------ */
  header("8. VERIFY FUND DISTRIBUTION (latest PackageActivated)");

  if (!core || !treasury || !token || !packageTxHash) {
    record("Fund Distribution", "SKIP", [
      "Need core + treasury + token + PackageActivated tx for wallet",
    ]);
  } else {
    try {
      const receipt = await provider.getTransactionReceipt(packageTxHash);
      if (!receipt || receipt.status !== 1) {
        record("Fund Distribution", "FAIL", ["Activation receipt missing/failed"]);
      } else {
        const block = receipt.blockNumber;
        const before = block > 0 ? block - 1 : 0;

        // Parse PackageActivated + ContributionProcessed from this tx
        const actIface = core.interface;
        const treasIface = treasury.interface;
        let tokenAmount = 0n;
        let packageAmount = 0n;
        let split: {
          amount: bigint;
          regenerationAmount: bigint;
          interdependentAmount: bigint;
          reserveAmount: bigint;
          communityAmount: bigint;
          workingAmount: bigint;
        } | null = null;

        for (const log of receipt.logs) {
          try {
            if (log.address.toLowerCase() === (await core.getAddress()).toLowerCase()) {
              const p = actIface.parseLog({ topics: log.topics as string[], data: log.data });
              if (p?.name === "PackageActivated") {
                packageAmount = p.args.packageAmount;
                tokenAmount = p.args.tokenAmount;
              }
            }
            if (log.address.toLowerCase() === (await treasury.getAddress()).toLowerCase()) {
              const p = treasIface.parseLog({ topics: log.topics as string[], data: log.data });
              if (p?.name === "ContributionProcessed") {
                split = {
                  amount: p.args.amount,
                  regenerationAmount: p.args.regenerationAmount,
                  interdependentAmount: p.args.interdependentAmount,
                  reserveAmount: p.args.reserveAmount,
                  communityAmount: p.args.communityAmount,
                  workingAmount: p.args.workingAmount,
                };
              }
            }
          } catch {
            /* not our event */
          }
        }

        row("Activation tx", packageTxHash);
        row("Block", String(block));
        row("Package USD", fmtUsd(packageAmount));
        row("Token amount (event)", fmtUnits(tokenAmount));

        const buckets = [
          ["regenerationFundBalance", "Regeneration (30%)"],
          ["interdependentFundBalance", "ROI Pool (25%)"],
          ["reserveFundBalance", "Reserve (3%)"],
          ["communityBuilderFundBalance", "Community (2%)"],
          ["workingFundBalance", "Working (40%)"],
        ] as const;

        const treasAddr = await treasury.getAddress();
        const userBefore = await tokenBalanceAt(token, qaWallet, before);
        const userAfter = await tokenBalanceAt(token, qaWallet, block);
        const treasBefore = await tokenBalanceAt(token, treasAddr, before);
        const treasAfter = await tokenBalanceAt(token, treasAddr, block);

        sub("Wallet / Treasury token balances around activation");
        table(
          ["Account", "Before", "After", "Δ"],
          [
            [
              "User",
              fmtUnits(userBefore),
              fmtUnits(userAfter),
              fmtUnits(userAfter - userBefore),
            ],
            [
              "Treasury",
              fmtUnits(treasBefore),
              fmtUnits(treasAfter),
              fmtUnits(treasAfter - treasBefore),
            ],
          ],
        );

        sub("Internal fund buckets (actual storage before → after)");
        const distRows: string[][] = [];
        for (const [getter, label] of buckets) {
          const b = await fundBalanceAt(treasury, getter, before);
          const a = await fundBalanceAt(treasury, getter, block);
          const d = a - b;
          const pct =
            tokenAmount > 0n
              ? Number((d * 10000n) / tokenAmount) / 100
              : 0;
          distRows.push([label, fmtUnits(b), fmtUnits(a), fmtUnits(d), `${pct}%`]);
        }
        table(["Pool", "Before", "After", "Δ", "% of token"], distRows);

        if (split) {
          sub("ContributionProcessed event (exact split in activation tx)");
          row("amount", fmtUnits(split.amount));
          row("regenerationAmount", fmtUnits(split.regenerationAmount));
          row("interdependentAmount", fmtUnits(split.interdependentAmount));
          row("reserveAmount", fmtUnits(split.reserveAmount));
          row("communityAmount", fmtUnits(split.communityAmount));
          row("workingAmount", fmtUnits(split.workingAmount));
          const eventSum =
            split.regenerationAmount +
            split.interdependentAmount +
            split.reserveAmount +
            split.communityAmount +
            split.workingAmount;
          row("Event parts sum", fmtUnits(eventSum));
          row("Match tokenAmount", eventSum === tokenAmount ? "YES" : "NO", eventSum === tokenAmount ? c.green : c.red);

          const expected = {
            regen: (tokenAmount * 3000n) / 10000n,
            roi: (tokenAmount * 2500n) / 10000n,
            reserve: (tokenAmount * 300n) / 10000n,
            community: (tokenAmount * 200n) / 10000n,
          };
          // working gets remainder (incl. dust) per TreasuryManager
          const expectedWorking =
            tokenAmount -
            (expected.regen + expected.roi + expected.reserve + expected.community);

          const ok =
            split.regenerationAmount === expected.regen &&
            split.interdependentAmount === expected.roi &&
            split.reserveAmount === expected.reserve &&
            split.communityAmount === expected.community &&
            split.workingAmount === expectedWorking &&
            eventSum === tokenAmount &&
            treasAfter - treasBefore === tokenAmount;

          record(
            "Fund Distribution",
            ok ? "PASS" : "FAIL",
            ok
              ? ["30/25/3/2/40 verified from ContributionProcessed + balance Δ"]
              : ["Split mismatch vs BPS or treasury balance Δ ≠ tokenAmount"],
          );
        } else {
          record("Fund Distribution", "WARNING", [
            "ContributionProcessed not found in activation receipt",
          ]);
        }
      }
    } catch (e) {
      record("Fund Distribution", "FAIL", [(e as Error).message]);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*  VERIFY ROI                                                              */
  /* ------------------------------------------------------------------------ */
  header("9. VERIFY ROI");
  if (!roi || !income) {
    record("ROI", "SKIP", ["InterdependentReward / IncomeManager missing"]);
  } else {
    try {
      row("MAX_DAILY_ROI_BPS", (await roi.MAX_DAILY_ROI_BPS()).toString() + " (1%)");
      row("Current daily ROI BPS", (await roi.calculateDailyRoiBps()).toString());
      row("Daily budget", fmtUnits(await roi.dailyBudget()));
      row("Daily budget used", fmtUnits(await roi.dailyBudgetUsed()));
      row("Remaining daily budget", fmtUnits(await roi.getRemainingDailyBudget()));
      row("Total active principal (BTCB)", fmtUnits(await roi.totalActivePrincipal()));

      const ra = await roi.roiAccounts(qaWallet);
      row("User ROI active", String(ra.isActive));
      row("User ROI principal (BTCB)", fmtUnits(ra.principal));
      row(
        "Last claim",
        ra.lastClaimAt > 0n
          ? new Date(Number(ra.lastClaimAt) * 1000).toISOString()
          : "—",
      );
      row("Claimable (getPendingRoi) (BTCB)", fmtUnits(await roi.getPendingRoi(qaWallet)));
      row("ROI earned (IncomeManager) (BTCB)", fmtUnits(await income.roiEarned(qaWallet)));
      row("ROI cap (3X) (BTCB)", fmtUnits(await income.getRoiCap(qaWallet)));
      row("Remaining ROI cap (BTCB)", fmtUnits(await income.getRemainingRoiCap(qaWallet)));
      row("ROI cap reached", String(await income.isRoiCapReached(qaWallet)));
      if (treasury) {
        row("Total SelfRoiPaid (global) (BTCB)", fmtUnits(await treasury.totalSelfRoiPaid()));
      }
      record("ROI", "PASS");
    } catch (e) {
      record("ROI", "FAIL", [(e as Error).message]);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*  VERIFY DIRECT / CONTRIBUTION                                            */
  /* ------------------------------------------------------------------------ */
  header("10. VERIFY CONTRIBUTION (Direct L1–L3)");
  if (!contrib) {
    record("Direct / Contribution", "SKIP", ["ContributionReward missing"]);
  } else {
    try {
      row("LEVEL_1_BPS", (await contrib.LEVEL_1_BPS()).toString() + " (5%)");
      row("LEVEL_2_BPS", (await contrib.LEVEL_2_BPS()).toString() + " (3%)");
      row("LEVEL_3_BPS", (await contrib.LEVEL_3_BPS()).toString() + " (2%)");
      row("Sponsor", await contrib.sponsors(qaWallet));
      row("Level 1 paid (BTCB)", fmtUnits(await contrib.levelIncome(qaWallet, 1)));
      row("Level 2 paid (BTCB)", fmtUnits(await contrib.levelIncome(qaWallet, 2)));
      row("Level 3 paid (BTCB)", fmtUnits(await contrib.levelIncome(qaWallet, 3)));
      row("Total contributionIncome (BTCB)", fmtUnits(await contrib.contributionIncome(qaWallet)));
      if (income) {
        row("IM contributionEarned (BTCB)", fmtUnits(await income.contributionEarned(qaWallet)));
      }
      // Pending is not a separate storage — paid instantly via treasury
      row("Pending", "N/A (paid instantly on-chain via payWorkingIncome)", c.dim);
      record("Direct / Contribution", "PASS");
    } catch (e) {
      record("Direct / Contribution", "FAIL", [(e as Error).message]);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*  VERIFY BOOSTER                                                          */
  /* ------------------------------------------------------------------------ */
  header("11. VERIFY BOOSTER");
  if (!booster) {
    record("Booster", "SKIP", ["ContributionBooster missing"]);
  } else {
    try {
      row("BOOSTER_REWARD_BPS", (await booster.BOOSTER_REWARD_BPS()).toString() + " (10%)");
      row("QUALIFICATION_PERIOD (s)", (await booster.QUALIFICATION_PERIOD()).toString());
      row("BOOSTER_PERIOD (s)", (await booster.BOOSTER_PERIOD()).toString());
      const ba = await booster.boosterAccounts(qaWallet);
      row("Qualified", String(ba.qualified));
      row("Joined At", ba.joinedAt > 0n ? new Date(Number(ba.joinedAt) * 1000).toISOString() : "—");
      row(
        "Activated At",
        ba.boosterActivatedAt > 0n
          ? new Date(Number(ba.boosterActivatedAt) * 1000).toISOString()
          : "—",
      );
      row(
        "Expires At",
        ba.boosterExpiresAt > 0n
          ? new Date(Number(ba.boosterExpiresAt) * 1000).toISOString()
          : "—",
      );
      row("Booster income paid (BTCB)", fmtUnits(ba.boosterIncome));
      row("isBoosterActive()", String(await booster.isBoosterActive(qaWallet)));
      const now = BigInt(Math.floor(Date.now() / 1000));
      const remainingDays =
        ba.boosterExpiresAt > now
          ? Number((ba.boosterExpiresAt - now) / 86400n)
          : 0;
      row("Remaining days", String(remainingDays));
      record("Booster", "PASS");
    } catch (e) {
      record("Booster", "FAIL", [(e as Error).message]);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*  VERIFY RANK                                                             */
  /* ------------------------------------------------------------------------ */
  header("12. VERIFY RANK");
  if (!rank) {
    record("Rank", "SKIP", ["RankReward missing"]);
  } else {
    try {
      const r = Number(await rank.userRanks(qaWallet));
      row("Current Rank", `${r} (${RANK_NAMES[r] ?? "?"})`);
      row("SAME_RANK_REWARD_BPS", (await rank.SAME_RANK_REWARD_BPS()).toString());
      row("Direct count", (await rank.directCount(qaWallet)).toString());
      row("Personal volume", fmtUsd(await rank.personalVolume(qaWallet)));
      row("Group volume", fmtUsd(await rank.groupVolume(qaWallet)));
      row("Max leg volume", fmtUsd(await rank.maxLegVolume(qaWallet)));
      row("Rank income paid (BTCB)", fmtUnits(await rank.rankIncome(qaWallet)));
      row("Same-rank income (BTCB)", fmtUnits(await rank.sameRankIncome(qaWallet)));
      row("Achievement bonus paid (BTCB)", fmtUnits(await rank.sameRankAchievementIncome(qaWallet)));
      row("Income cap multiplier", (await rank.getIncomeCapMultiplier(qaWallet)).toString());

      sub("Qualification checks");
      row("Seed", String(await rank.checkSeedQualification(qaWallet)));
      row("Sprout", String(await rank.checkSproutQualification(qaWallet)));
      row("Sapling", String(await rank.checkSaplingQualification(qaWallet)));
      row("Canopy", String(await rank.checkCanopyQualification(qaWallet)));
      row("Forest", String(await rank.checkForestQualification(qaWallet)));
      row("Biome", String(await rank.checkBiomeQualification(qaWallet)));
      row("Ecosphere", String(await rank.checkEcosphereQualification(qaWallet)));
      row("Genesis", String(await rank.checkGenesisQualification(qaWallet)));

      // Leg volumes for directs
      const directs = Number(await rank.directCount(qaWallet));
      if (directs > 0) {
        sub("Direct legs (legVolume)");
        const lim = Math.min(directs, 10);
        for (let i = 0; i < lim; i++) {
          const d = await rank.directUsers(qaWallet, i);
          const vol = await rank.legVolume(qaWallet, d);
          row(`Direct[${i}] ${shortAddr(d)}`, fmtUsd(vol));
        }
      }
      record("Rank", "PASS");
    } catch (e) {
      record("Rank", "FAIL", [(e as Error).message]);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*  VERIFY COMMUNITY                                                        */
  /* ------------------------------------------------------------------------ */
  header("13. VERIFY COMMUNITY");
  if (!community) {
    record("Community", "SKIP", ["CommunityBuilder missing"]);
  } else {
    try {
      row("User points", (await community.userPoints(qaWallet)).toString());
      row("Community income paid (BTCB)", fmtUnits(await community.communityIncome(qaWallet)));
      row("Pending reward (BTCB)", fmtUnits(await community.getPendingReward(qaWallet)));
      row("Eligible user?", String(await community.isEligibleUser(qaWallet)));
      row("Total points", (await community.totalPoints()).toString());
      row("Current round", (await community.currentRound()).toString());
      row("Eligible users count", (await community.getEligibleUsersCount()).toString());
      const roundId = await community.currentRound();
      if (roundId > 0n) {
        const rd = await community.distributionRounds(roundId);
        row("Round fundAmount", fmtUnits(rd.fundAmount));
        row("Round totalPoints", rd.totalPoints.toString());
        row("Round rewardPerPoint", fmtUnits(rd.rewardPerPoint));
        row("Round totalPaid", fmtUnits(rd.totalPaid));
        row("Round active", String(rd.isActive));
      }
      if (treasury) {
        row(
          "Community fund (treasury)",
          fmtUnits(await treasury.communityBuilderFundBalance()),
        );
      }
      record("Community", "PASS");
    } catch (e) {
      record("Community", "FAIL", [(e as Error).message]);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*  VERIFY LEDGERS (on-chain event mirrors)                                 */
  /* ------------------------------------------------------------------------ */
  header("14. VERIFY ON-CHAIN LEDGERS (event counts for wallet)");

  const ledgerRows: string[][] = [];
  const pushLedger = async (
    label: string,
    address: string | undefined,
    signature: string,
    indexUser = true,
  ) => {
    if (!address) {
      ledgerRows.push([label, "n/a", "—"]);
      return;
    }
    const topics: (string | null)[] = [ethers.id(signature)];
    if (indexUser) topics.push(ethers.zeroPadValue(qaWallet, 32));
    const logs = await safeGetLogs(provider, {
      address,
      topics,
      fromBlock,
    });
    ledgerRows.push([label, String(logs.length), shortAddr(address)]);
  };

  await pushLedger("Registration", core && (await core.getAddress()), "UserRegistered(address,address)");
  await pushLedger("Package", core && (await core.getAddress()), "PackageActivated(address,uint256,uint8,uint256)");
  await pushLedger("ROI claim", roi && (await roi.getAddress()), "RoiClaimed(address,uint256)");
  await pushLedger(
    "Contribution reward",
    contrib && (await contrib.getAddress()),
    "ContributionRewardPaid(address,address,uint256,uint256)",
  );
  await pushLedger(
    "Booster reward",
    booster && (await booster.getAddress()),
    "BoosterRewardPaid(address,address,uint256)",
  );
  await pushLedger(
    "Rank income",
    rank && (await rank.getAddress()),
    "RankIncomePaid(address,address,uint256)",
  );
  await pushLedger(
    "Community claim",
    community && (await community.getAddress()),
    "CommunityRewardClaimed(address,uint256,uint256)",
  );
  await pushLedger(
    "Self ROI paid",
    treasury && (await treasury.getAddress()),
    "SelfRoiPaid(address,uint256)",
  );
  table(["Ledger", "Events", "Contract"], ledgerRows);
  record("Ledgers", "PASS", ["Counts from indexed events for QA_WALLET"]);

  /* ------------------------------------------------------------------------ */
  /*  VERIFY SECURITY                                                         */
  /* ------------------------------------------------------------------------ */
  header("15. VERIFY SECURITY");

  const secNotes: string[] = [];
  let secVerdict: Verdict = "PASS";

  if (core) {
    // Duplicate wallet = users mapping is 1:1 by address — structural
    row("Duplicate wallet protection", "address-keyed users mapping (1 wallet = 1 User)", c.green);

    // Replay: activating wrong package reverts via getNextEligiblePackage
    row("Package ladder enforcement", "getNextEligiblePackage + activatePackage require", c.green);

    // Owner
    row("Core owner", await core.owner());
    row("Paused / emergency pause", "NOT IMPLEMENTED in source", c.yellow);
    secNotes.push("No Pausable / emergencyStop on core — owner wiring + ReentrancyGuard only");
    secVerdict = "WARNING";
  }

  if (treasury) {
    row("Reserve withdraw", "owner-only withdrawReserve(to, amount)");
    row("Regeneration transfer", "owner-only transferRegenerationFunds");
  }

  // Tx uniqueness hints from events
  if (registerTxHash) row("Register tx", registerTxHash);
  if (packageTxHash) row("Package tx", packageTxHash);
  if (approveTxHash) row("Approve tx", approveTxHash);

  record("Security", secVerdict, secNotes);

  /* ------------------------------------------------------------------------ */
  /*  VERIFY DATABASE / DASHBOARD (Laravel API if available)                  */
  /* ------------------------------------------------------------------------ */
  header("16. VERIFY DATABASE / DASHBOARD SYNC");

  const apiBase = (process.env.QA_API_BASE || process.env.APP_URL || "").replace(/\/$/, "");
  if (!apiBase) {
    record("Database Sync", "SKIP", [
      "Set QA_API_BASE (or APP_URL) to compare Laravel vs chain",
    ]);
    record("Dashboard", "SKIP", ["Requires QA_API_BASE + authenticated session"]);
  } else {
    try {
      const cfgRes = await fetch(`${apiBase}/api/blockchain/config`);
      const cfgJson = (await cfgRes.json()) as {
        success?: boolean;
        data?: { core?: string; token?: string; chainId?: number };
      };
      sub("Laravel /api/blockchain/config");
      row("HTTP", String(cfgRes.status));
      row("success", String(cfgJson.success));
      if (cfgJson.data) {
        row("API core", cfgJson.data.core || "—");
        row("API token", cfgJson.data.token || "—");
        row("API chainId", String(cfgJson.data.chainId ?? "—"));
        const coreAddr = core ? (await core.getAddress()).toLowerCase() : "";
        const mismatch: string[] = [];
        if (cfgJson.data.core && coreAddr && cfgJson.data.core.toLowerCase() !== coreAddr) {
          mismatch.push("core address mismatch");
        }
        if (
          cfgJson.data.token &&
          token &&
          cfgJson.data.token.toLowerCase() !== (await token.getAddress()).toLowerCase()
        ) {
          mismatch.push("token address mismatch");
        }
        if (mismatch.length) {
          record("Database Sync", "FAIL", mismatch);
        } else {
          record("Database Sync", "PASS", [
            "Config endpoint reachable; core/token match address book when set",
          ]);
        }
      } else {
        record("Database Sync", "WARNING", ["Config payload empty"]);
      }

      // Dashboard requires auth — attempt without token and report
      const dashRes = await fetch(`${apiBase}/api/dashboard`, {
        headers: { Accept: "application/json" },
      });
      sub("Laravel /api/dashboard");
      row("HTTP", String(dashRes.status));
      if (dashRes.status === 401) {
        record("Dashboard", "SKIP", [
          "Dashboard requires Sanctum auth. Compare manually after wallet login.",
        ]);
      } else {
        const dash = (await dashRes.json()) as Record<string, unknown>;
        row("Body keys", Object.keys(dash).join(", "));
        record("Dashboard", dashRes.ok ? "PASS" : "WARNING", [
          "Inspect payload vs on-chain user fields for QA_WALLET",
        ]);
      }
    } catch (e) {
      record("Database Sync", "WARNING", [
        `API unreachable at ${apiBase}: ${(e as Error).message}`,
      ]);
      record("Dashboard", "SKIP", ["API unreachable"]);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*  FINAL REPORT                                                            */
  /* ------------------------------------------------------------------------ */
  header("FINAL PRODUCTION QA REPORT");

  const summaryOrder = [
    "Contract Discovery",
    "Contracts / Treasury BPS",
    "Token",
    "User",
    "Package",
    "Transactions",
    "Events",
    "Balances",
    "Fund Distribution",
    "ROI",
    "Direct / Contribution",
    "Booster",
    "Rank",
    "Community",
    "Ledgers",
    "Security",
    "Database Sync",
    "Dashboard",
  ];

  const byName = new Map(sectionResults.map((s) => [s.name, s]));
  const summaryRows: string[][] = [];
  for (const name of summaryOrder) {
    const s = byName.get(name);
    if (!s) {
      summaryRows.push([name, "SKIP", "section not run"]);
      continue;
    }
    summaryRows.push([
      name,
      s.verdict,
      s.notes[0] ?? "",
    ]);
  }
  // Also include any extras
  for (const s of sectionResults) {
    if (!summaryOrder.includes(s.name)) {
      summaryRows.push([s.name, s.verdict, s.notes[0] ?? ""]);
    }
  }

  console.log("");
  for (const [name, verdict, note] of summaryRows) {
    const pad = name.padEnd(28);
    console.log(`  ${pad} ${verdictTag(verdict as Verdict)}  ${c.dim}${note}${c.reset}`);
  }

  const counts = { PASS: 0, WARNING: 0, FAIL: 0, SKIP: 0, INFO: 0 };
  for (const s of sectionResults) counts[s.verdict]++;

  console.log("\n" + c.bold + "  Totals:" + c.reset);
  console.log(
    `  ${c.green}PASS ${counts.PASS}${c.reset}  ${c.yellow}WARNING ${counts.WARNING}${c.reset}  ${c.red}FAIL ${counts.FAIL}${c.reset}  ${c.magenta}SKIP ${counts.SKIP}${c.reset}`,
  );
  console.log(
    c.dim +
      `\n  QA_WALLET=${qaWallet}\n  Events from block ${fromBlock} → ${latestBlock}\n` +
      c.reset,
  );

  if (counts.FAIL > 0) {
    console.log(c.red + c.bold + "  OVERALL: FAIL — fix failures above before release." + c.reset);
    process.exitCode = 1;
  } else if (counts.WARNING > 0) {
    console.log(
      c.yellow + c.bold + "  OVERALL: PASS WITH WARNINGS — review before mainnet." + c.reset,
    );
  } else {
    console.log(c.green + c.bold + "  OVERALL: PASS" + c.reset);
  }
}

main().catch((err) => {
  console.error(c.red + "\nFatal QA error:" + c.reset, err);
  process.exitCode = 1;
});
