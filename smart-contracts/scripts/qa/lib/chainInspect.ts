/**
 * Read-only chain inspection helpers for Phase 1/2 terminal verification.
 * Never sends transactions — view calls + eth_getLogs / receipts only.
 */
import fs from "fs";
import path from "path";
import type { Contract, Provider } from "ethers";
import { loadDeployedAddresses, hasContractCode } from "../../lib/deploymentHealth";

export type Check = { name: string; ok: boolean; note?: string };

export type Contracts = {
  addresses: ReturnType<typeof loadDeployedAddresses>;
  core: Contract;
  token: Contract;
  treasury: Contract;
  contrib: Contract;
  income: Contract;
  reward: Contract;
  coreAddr: string;
  tokenAddr: string;
  treasuryAddr: string;
  contribAddr: string;
  incomeAddr: string;
  rewardAddr: string;
};

export type WalletSet = {
  root: string;
  user1: string;
  user2: string;
  user3: string;
  expectUsd?: { root: number; user1: number; user2: number; user3: number };
  activateTxs?: string[];
};

const BTC_USD_FALLBACK = 60_000;

export function short(addr: string, n = 6): string {
  if (!addr || addr.length < 12) return addr || "—";
  return `${addr.slice(0, n + 2)}…${addr.slice(-4)}`;
}

export function fmtWei(ethers: { formatEther: (v: bigint) => string }, wei: bigint): string {
  return ethers.formatEther(wei);
}

export function weiToUsd(
  ethers: { formatEther: (v: bigint) => string },
  wei: bigint,
  btcUsd = BTC_USD_FALLBACK,
): number {
  return Number(ethers.formatEther(wei)) * btcUsd;
}

export function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function tsToIso(sec: bigint | number): string {
  const n = Number(sec);
  if (!n) return "—";
  return new Date(n * 1000).toISOString();
}

export function loadWalletSet(ethers: {
  ZeroAddress: string;
}, signers?: { address: string }[]): WalletSet {
  const handoffPath = path.resolve("scripts/qa/reports/phase2-handoff.json");
  if (fs.existsSync(handoffPath)) {
    const h = JSON.parse(fs.readFileSync(handoffPath, "utf8"));
    const activateTxs = ["user1", "user2", "user3"]
      .map((k) => String(h?.users?.[k]?.activate || "").toLowerCase())
      .filter(Boolean);
    return {
      root: String(h.root || h.users?.root?.wallet || ""),
      user1: String(h.user1 || h.users?.user1?.wallet || ""),
      user2: String(h.user2 || h.users?.user2?.wallet || ""),
      user3: String(h.user3 || h.users?.user3?.wallet || ""),
      expectUsd: h.expectUsd,
      activateTxs,
    };
  }

  // Env overrides
  const env = (k: string) => (process.env[k] || "").trim();
  if (env("VERIFY_ROOT") && env("VERIFY_USER1")) {
    return {
      root: env("VERIFY_ROOT"),
      user1: env("VERIFY_USER1"),
      user2: env("VERIFY_USER2") || ethers.ZeroAddress,
      user3: env("VERIFY_USER3") || ethers.ZeroAddress,
      expectUsd: {
        root: Number(env("VERIFY_EXPECT_ROOT") || 5),
        user1: Number(env("VERIFY_EXPECT_USER1") || 4),
        user2: Number(env("VERIFY_EXPECT_USER2") || 2.5),
        user3: Number(env("VERIFY_EXPECT_USER3") || 0),
      },
    };
  }

  // Default: Hardhat accounts #0–#3 (Root / User1 / User2 / User3)
  const s = signers || [];
  return {
    root: s[0]?.address || "",
    user1: s[1]?.address || "",
    user2: s[2]?.address || "",
    user3: s[3]?.address || "",
    expectUsd: { root: 5, user1: 4, user2: 2.5, user3: 0 },
  };
}

export async function loadContracts(ethers: {
  getContractAt: (name: string, addr: string) => Promise<Contract>;
  provider: Provider;
}): Promise<Contracts> {
  const addresses = loadDeployedAddresses();
  const coreAddr = String(addresses.BTCPlanCore || "");
  const tokenAddr = String(addresses.MockBTCB || addresses.Token || "");
  const treasuryAddr = String(addresses.TreasuryManager || "");
  const contribAddr = String(addresses.ContributionReward || "");
  const incomeAddr = String(addresses.IncomeManager || "");
  const rewardAddr = String(addresses.InterdependentReward || "");

  for (const [label, addr] of [
    ["BTCPlanCore", coreAddr],
    ["Token", tokenAddr],
    ["TreasuryManager", treasuryAddr],
    ["ContributionReward", contribAddr],
    ["IncomeManager", incomeAddr],
  ] as const) {
    if (!(await hasContractCode(ethers.provider, addr))) {
      throw new Error(`Missing bytecode for ${label} at ${addr || "(empty)"} — deploy/bootstrap first`);
    }
  }

  return {
    addresses,
    core: await ethers.getContractAt("BTCPlanCore", coreAddr),
    token: await ethers.getContractAt("MockBTCB", tokenAddr),
    treasury: await ethers.getContractAt("TreasuryManager", treasuryAddr),
    contrib: await ethers.getContractAt("ContributionReward", contribAddr),
    income: await ethers.getContractAt("IncomeManager", incomeAddr),
    reward: await ethers.getContractAt("InterdependentReward", rewardAddr),
    coreAddr,
    tokenAddr,
    treasuryAddr,
    contribAddr,
    incomeAddr,
    rewardAddr,
  };
}

export async function getBtcUsd(c: Contracts): Promise<number> {
  try {
    const feedAddr = String(c.addresses.MockBTCPriceFeed || c.addresses.PriceFeed || "");
    if (!feedAddr || !c.core.runner) return BTC_USD_FALLBACK;
    const { Contract } = await import("ethers");
    const priceFeed = new Contract(
      feedAddr,
      ["function getBTCPrice() view returns (int256)"],
      c.core.runner,
    );
    const raw = Number(await priceFeed.getBTCPrice());
    if (!Number.isFinite(raw) || raw <= 0) return BTC_USD_FALLBACK;
    // Local MockBTCPriceFeed stores plain USD (e.g. 60000).
    // Chainlink-style feeds use 8 decimals (e.g. 60000e8).
    if (raw >= 1_000_000) {
      return raw / 1e8;
    }
    return raw;
  } catch {
    return BTC_USD_FALLBACK;
  }
}

export type UserView = {
  wallet: string;
  sponsor: string;
  packageAmount: bigint;
  packageIndex: number;
  packageCycle: number;
  joinedAt: bigint;
  isActive: boolean;
  packageCompleted: boolean;
  isBlocked: string; // N/A — not on-chain
};

export async function readUser(core: Contract, addr: string): Promise<UserView> {
  const u = await core.users(addr);
  return {
    wallet: String(u.wallet),
    sponsor: String(u.sponsor),
    packageAmount: BigInt(u.packageAmount),
    packageIndex: Number(u.packageIndex),
    packageCycle: Number(u.packageCycle),
    joinedAt: BigInt(u.joinedAt),
    isActive: Boolean(u.isActive),
    packageCompleted: Boolean(u.packageCompleted),
    isBlocked: "N/A (not stored on-chain)",
  };
}

export function printUser(label: string, addr: string, u: UserView): void {
  console.log(`\n── Registration / ${label} ──`);
  console.log(`  Address           : ${addr}`);
  console.log(`  wallet            : ${u.wallet}`);
  console.log(`  sponsor           : ${u.sponsor}`);
  console.log(`  packageAmount     : ${u.packageAmount} USD`);
  console.log(`  packageIndex      : ${u.packageIndex}`);
  console.log(`  packageCycle      : ${u.packageCycle}`);
  console.log(`  joinedAt          : ${u.joinedAt} (${tsToIso(u.joinedAt)})`);
  console.log(`  isActive          : ${u.isActive}`);
  console.log(`  packageCompleted  : ${u.packageCompleted}`);
  console.log(`  isBlocked         : ${u.isBlocked}`);
}

export async function printToken(
  ethers: { formatEther: (v: bigint) => string },
  c: Contracts,
  user: string,
): Promise<{
  userBal: bigint;
  treasuryBal: bigint;
  coreBal: bigint;
  allowance: bigint;
}> {
  const userBal = BigInt(await c.token.balanceOf(user));
  const treasuryBal = BigInt(await c.token.balanceOf(c.treasuryAddr));
  const coreBal = BigInt(await c.token.balanceOf(c.coreAddr));
  const allowance = BigInt(await c.token.allowance(user, c.coreAddr));
  console.log(`\n── Token / ${short(user)} ──`);
  console.log(`  User balance      : ${fmtWei(ethers, userBal)} BTCB`);
  console.log(`  Treasury balance  : ${fmtWei(ethers, treasuryBal)} BTCB`);
  console.log(`  Core balance      : ${fmtWei(ethers, coreBal)} BTCB`);
  console.log(`  Allowance→Core    : ${fmtWei(ethers, allowance)} BTCB`);
  return { userBal, treasuryBal, coreBal, allowance };
}

export async function printPackage(
  ethers: { formatEther: (v: bigint) => string },
  c: Contracts,
  user: string,
  btcUsd: number,
): Promise<{
  packageAmount: bigint;
  principal: bigint;
  packageCycle: number;
  packageActive: boolean;
  packageCompleted: boolean;
}> {
  const u = await readUser(c.core, user);
  const income = await c.income.incomes(user);
  const principal = BigInt(income.principal);
  console.log(`\n── Package / ${short(user)} ──`);
  console.log(`  Current package   : $${u.packageAmount} (index ${u.packageIndex})`);
  console.log(`  Principal (token) : ${fmtWei(ethers, principal)} BTCB (${fmtUsd(weiToUsd(ethers, principal, btcUsd))})`);
  console.log(`  Package cycle     : ${u.packageCycle}`);
  console.log(`  Total invested    : $${u.packageAmount} (active package USD)`);
  console.log(`  packageActive     : ${Boolean(income.packageActive)}`);
  console.log(`  packageCompleted  : ${u.packageCompleted}`);
  console.log(`  Status            : ${!u.isActive ? "inactive" : u.packageCompleted ? "completed" : income.packageActive ? "active" : "registered (no package)"}`);
  return {
    packageAmount: u.packageAmount,
    principal,
    packageCycle: u.packageCycle,
    packageActive: Boolean(income.packageActive),
    packageCompleted: u.packageCompleted,
  };
}

export type ContribView = {
  total: bigint;
  l1: bigint;
  l2: bigint;
  l3: bigint;
  incomeMgr: bigint;
  pending: bigint;
  lastTx: string | null;
  lastBlock: number | null;
};

export async function readContribution(
  ethers: { provider: Provider },
  c: Contracts,
  user: string,
): Promise<ContribView> {
  const total = BigInt(await c.contrib.contributionIncome(user));
  const l1 = BigInt(await c.contrib.levelIncome(user, 1));
  const l2 = BigInt(await c.contrib.levelIncome(user, 2));
  const l3 = BigInt(await c.contrib.levelIncome(user, 3));
  const incomeMgr = BigInt(await c.income.contributionEarned(user));

  // Last ContributionRewardPaid where beneficiary = user
  const filter = c.contrib.filters.ContributionRewardPaid(user);
  const logs = await c.contrib.queryFilter(filter, 0n, "latest");
  let lastTx: string | null = null;
  let lastBlock: number | null = null;
  if (logs.length) {
    const last = logs[logs.length - 1];
    lastTx = last.transactionHash;
    lastBlock = last.blockNumber;
  }

  return {
    total,
    l1,
    l2,
    l3,
    incomeMgr,
    pending: 0n, // paid instantly via treasury.payWorkingIncome
    lastTx,
    lastBlock,
  };
}

export async function printContribution(
  ethers: { formatEther: (v: bigint) => string; provider: Provider },
  c: Contracts,
  user: string,
  btcUsd: number,
): Promise<ContribView> {
  const v = await readContribution(ethers, c, user);
  console.log(`\n── Contribution / ${short(user)} ──`);
  console.log(`  Total income      : ${fmtWei(ethers, v.total)} BTCB (${fmtUsd(weiToUsd(ethers, v.total, btcUsd))})`);
  console.log(`  Level 1 (5%)      : ${fmtWei(ethers, v.l1)} BTCB (${fmtUsd(weiToUsd(ethers, v.l1, btcUsd))})`);
  console.log(`  Level 2 (3%)      : ${fmtWei(ethers, v.l2)} BTCB (${fmtUsd(weiToUsd(ethers, v.l2, btcUsd))})`);
  console.log(`  Level 3 (2%)      : ${fmtWei(ethers, v.l3)} BTCB (${fmtUsd(weiToUsd(ethers, v.l3, btcUsd))})`);
  console.log(`  IncomeManager     : ${fmtWei(ethers, v.incomeMgr)} BTCB`);
  console.log(`  Pending           : ${fmtWei(ethers, v.pending)} BTCB (instant payout — always 0)`);
  console.log(`  Lifetime          : ${fmtWei(ethers, v.total)} BTCB (same as total; paid immediately)`);
  console.log(`  Last tx           : ${v.lastTx || "—"}`);
  console.log(`  Last block        : ${v.lastBlock ?? "—"}`);
  return v;
}

export type TreasuryView = {
  working: bigint;
  roi: bigint;
  reserve: bigint;
  community: bigint;
  regeneration: bigint;
  charity: bigint;
  sumFunds: bigint;
  tokenBal: bigint;
  totalWorkingPaid: bigint;
  totalRoiPaid: bigint;
  totalActivated: bigint;
};

export async function readTreasury(
  ethers: { formatEther: (v: bigint) => string },
  c: Contracts,
): Promise<TreasuryView> {
  const working = BigInt(await c.treasury.workingFundBalance());
  const roi = BigInt(await c.treasury.interdependentFundBalance());
  const reserve = BigInt(await c.treasury.reserveFundBalance());
  const community = BigInt(await c.treasury.communityBuilderFundBalance());
  const regeneration = BigInt(await c.treasury.regenerationFundBalance());
  const charity = BigInt(await c.treasury.charityFundBalance());
  const sumFunds = working + roi + reserve + community + regeneration + charity;
  const tokenBal = BigInt(await c.token.balanceOf(c.treasuryAddr));
  const totalWorkingPaid = BigInt(await c.treasury.totalWorkingIncomePaid());
  const totalRoiPaid = BigInt(await c.treasury.totalSelfRoiPaid());

  // Sum activation inflows from ContributionProcessed.
  // Public BSC RPCs often reject eth_getLogs from block 0 ("limit exceeded") — skip then.
  let totalActivated = 0n;
  try {
    const latest = BigInt(await c.treasury.runner?.provider?.getBlockNumber?.() ?? 0);
    // Look back a bounded window (or full chain on local Hardhat).
    const fromBlock =
      latest > 50_000n ? latest - 50_000n : 0n;
    const filter = c.treasury.filters.ContributionProcessed();
    const logs = await c.treasury.queryFilter(filter, fromBlock, "latest");
    for (const log of logs) {
      const args = (log as { args?: { amount?: bigint } }).args;
      if (args?.amount != null) totalActivated += BigInt(args.amount);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `  (skipped ContributionProcessed log scan — RPC limit: ${msg.slice(0, 80)})`,
    );
    // Approximate: token still sitting in treasury + already paid out
    totalActivated = tokenBal + totalWorkingPaid + totalRoiPaid;
  }

  return {
    working,
    roi,
    reserve,
    community,
    regeneration,
    charity,
    sumFunds,
    tokenBal,
    totalWorkingPaid,
    totalRoiPaid,
    totalActivated,
  };
}

export async function printTreasury(
  ethers: { formatEther: (v: bigint) => string },
  c: Contracts,
  btcUsd: number,
): Promise<TreasuryView> {
  const t = await readTreasury(ethers, c);
  console.log(`\n── Treasury ──`);
  console.log(`  Working wallet       : ${fmtWei(ethers, t.working)} BTCB (${fmtUsd(weiToUsd(ethers, t.working, btcUsd))})`);
  console.log(`  ROI wallet           : ${fmtWei(ethers, t.roi)} BTCB (${fmtUsd(weiToUsd(ethers, t.roi, btcUsd))})`);
  console.log(`  Reserve wallet       : ${fmtWei(ethers, t.reserve)} BTCB (${fmtUsd(weiToUsd(ethers, t.reserve, btcUsd))})`);
  console.log(`  Community wallet     : ${fmtWei(ethers, t.community)} BTCB (${fmtUsd(weiToUsd(ethers, t.community, btcUsd))})`);
  console.log(`  Regeneration wallet  : ${fmtWei(ethers, t.regeneration)} BTCB (${fmtUsd(weiToUsd(ethers, t.regeneration, btcUsd))})`);
  console.log(`  Charity (extra)      : ${fmtWei(ethers, t.charity)} BTCB`);
  console.log(`  Sum of fund buckets  : ${fmtWei(ethers, t.sumFunds)} BTCB`);
  console.log(`  Token balance        : ${fmtWei(ethers, t.tokenBal)} BTCB`);
  console.log(`  Total activated in   : ${fmtWei(ethers, t.totalActivated)} BTCB`);
  console.log(`  Total working paid   : ${fmtWei(ethers, t.totalWorkingPaid)} BTCB`);
  console.log(`  Total ROI paid       : ${fmtWei(ethers, t.totalRoiPaid)} BTCB`);
  const accounted =
    t.sumFunds +
    t.totalWorkingPaid +
    t.totalRoiPaid +
    BigInt(await c.treasury.totalCommunityPaid()) +
    BigInt(await c.treasury.totalRegenerationPaid()) +
    BigInt(await c.treasury.totalReserveWithdrawn()) +
    BigInt(await c.treasury.totalCharityPaid());
  console.log(`  Accounted (funds+paid): ${fmtWei(ethers, accounted)} BTCB`);
  console.log(`  Match activated?     : ${accounted === t.totalActivated ? "YES" : "NO"}`);
  console.log(`  Token == fund sum?   : ${t.tokenBal === t.sumFunds ? "YES" : "NO"}`);
  return t;
}

export type ParsedEvent = {
  name: string;
  blockNumber: number;
  txHash: string;
  args: Record<string, string>;
  timestamp: string;
};

export async function fetchEvents(
  ethers: { provider: Provider },
  contract: Contract,
  eventName: string,
  fromBlock = 0,
): Promise<ParsedEvent[]> {
  const filter = (contract.filters as Record<string, () => unknown>)[eventName]?.();
  if (!filter) return [];

  const latest = await ethers.provider.getBlockNumber();
  // Public BSC RPCs often cap eth_getLogs to ~5k–50k blocks. Chunk + bound lookback.
  const lookbackEnv = Number(process.env.QA_EVENT_LOOKBACK || 4000);
  const chunkSize = Math.max(500, Number(process.env.QA_EVENT_CHUNK || 2000));
  const start = Math.max(fromBlock, Math.max(0, latest - lookbackEnv));

  const logs: Array<{
    blockNumber: number;
    transactionHash: string;
    args?: { [key: string]: unknown; length?: number };
    fragment?: { inputs: Array<{ name: string }> };
  }> = [];

  for (let from = start; from <= latest; from += chunkSize) {
    const to = Math.min(latest, from + chunkSize - 1);
    try {
      const part = await contract.queryFilter(filter as never, BigInt(from), BigInt(to));
      for (const log of part) {
        logs.push(log as (typeof logs)[number]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `  (skipped ${eventName} logs ${from}-${to}: ${msg.slice(0, 80)})`,
      );
    }
  }

  const out: ParsedEvent[] = [];
  for (const log of logs) {
    let timestamp = "—";
    try {
      const block = await ethers.provider.getBlock(log.blockNumber);
      timestamp = tsToIso(block?.timestamp ?? 0);
    } catch {
      /* ignore block fetch failures on rate-limited RPCs */
    }
    const args: Record<string, string> = {};
    const eventLog = log;
    const inputs = eventLog.fragment?.inputs || [];
    if (eventLog.args && inputs.length) {
      for (let i = 0; i < inputs.length; i++) {
        const name = inputs[i].name || String(i);
        const v = eventLog.args[i];
        args[name] = typeof v === "bigint" ? v.toString() : String(v);
      }
    } else if (eventLog.args) {
      for (const [k, v] of Object.entries(eventLog.args)) {
        if (/^\d+$/.test(k) || k === "length") continue;
        args[k] = typeof v === "bigint" ? v.toString() : String(v);
      }
    }
    out.push({
      name: eventName,
      blockNumber: log.blockNumber,
      txHash: log.transactionHash,
      args,
      timestamp,
    });
  }
  return out;
}

export function printEvents(title: string, events: ParsedEvent[], limit = 20): void {
  console.log(`\n── Events / ${title} (${events.length}) ──`);
  const slice = events.slice(-limit);
  for (const e of slice) {
    console.log(`  [${e.blockNumber}] ${e.name}`);
    console.log(`    Block       : ${e.blockNumber}`);
    console.log(`    Tx Hash     : ${e.txHash}`);
    console.log(`    Timestamp   : ${e.timestamp}`);
    // Friendly aliases for common fields
    if (e.args.user) console.log(`    User/To     : ${e.args.user}`);
    if (e.args.beneficiary) console.log(`    To          : ${e.args.beneficiary}`);
    if (e.args.sponsor) console.log(`    Sponsor     : ${e.args.sponsor}`);
    if (e.args.fromUser) console.log(`    From        : ${e.args.fromUser}`);
    if (e.args.amount) console.log(`    Amount      : ${e.args.amount}`);
    if (e.args.level) console.log(`    Level       : ${e.args.level}`);
    if (e.args.packageAmount) console.log(`    Package USD : ${e.args.packageAmount}`);
    if (e.args.packageCycle) console.log(`    Cycle       : ${e.args.packageCycle}`);
    if (e.args.tokenAmount) console.log(`    Token Amt   : ${e.args.tokenAmount}`);
    for (const [k, v] of Object.entries(e.args)) {
      if (
        [
          "user",
          "beneficiary",
          "sponsor",
          "fromUser",
          "amount",
          "level",
          "packageAmount",
          "packageCycle",
          "tokenAmount",
        ].includes(k)
      ) {
        continue;
      }
      console.log(`    ${k.padEnd(12)}: ${v}`);
    }
  }
  if (events.length > limit) {
    console.log(`  … showing last ${limit} of ${events.length}`);
  }
}

export async function printTransaction(
  ethers: {
    provider: Provider;
    formatEther: (v: bigint) => string;
  },
  c: Contracts,
  txHash: string,
): Promise<{
  status: number | null;
  gasUsed: bigint | null;
  blockNumber: number | null;
  timestamp: string;
  events: string[];
}> {
  const receipt = await ethers.provider.getTransactionReceipt(txHash);
  if (!receipt) {
    console.log(`\n── Transaction ${txHash} ──`);
    console.log("  NOT FOUND");
    return { status: null, gasUsed: null, blockNumber: null, timestamp: "—", events: [] };
  }
  const block = await ethers.provider.getBlock(receipt.blockNumber);
  const parsers = [c.core, c.contrib, c.treasury, c.income, c.reward, c.token];
  const events: string[] = [];
  for (const log of receipt.logs) {
    for (const contract of parsers) {
      try {
        const parsed = contract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed) {
          const argStr = parsed.args
            .map((a: unknown, i: number) => {
              const key = parsed.fragment.inputs[i]?.name || String(i);
              const val = typeof a === "bigint" ? a.toString() : String(a);
              return `${key}=${val}`;
            })
            .join(", ");
          events.push(`${parsed.name}(${argStr})`);
          break;
        }
      } catch {
        // try next
      }
    }
  }

  console.log(`\n── Transaction ──`);
  console.log(`  Hash       : ${txHash}`);
  console.log(`  Status     : ${receipt.status === 1 ? "SUCCESS" : "FAILED"} (${receipt.status})`);
  console.log(`  Block      : ${receipt.blockNumber}`);
  console.log(`  Timestamp  : ${tsToIso(block?.timestamp ?? 0)}`);
  console.log(`  Gas used   : ${receipt.gasUsed.toString()}`);
  console.log(`  Logs       : ${receipt.logs.length}`);
  console.log(`  Events     :`);
  for (const e of events) console.log(`    • ${e}`);
  if (!events.length) console.log(`    (no known ABI events decoded)`);

  return {
    status: receipt.status,
    gasUsed: receipt.gasUsed,
    blockNumber: receipt.blockNumber,
    timestamp: tsToIso(block?.timestamp ?? 0),
    events,
  };
}

export async function printReferralTree(
  c: Contracts,
  wallets: WalletSet,
): Promise<{ ok: boolean; lines: string[] }> {
  const root = await readUser(c.core, wallets.root);
  const u1 = await readUser(c.core, wallets.user1);
  const u2 = await readUser(c.core, wallets.user2);
  const u3 = await readUser(c.core, wallets.user3);

  const lines = [
    `Root  ${short(wallets.root)}  sponsor=${short(root.sponsor)} active=${root.isActive} pkg=$${root.packageAmount}`,
    `└── User1  ${short(wallets.user1)}  sponsor=${short(u1.sponsor)} active=${u1.isActive} pkg=$${u1.packageAmount}`,
    `    └── User2  ${short(wallets.user2)}  sponsor=${short(u2.sponsor)} active=${u2.isActive} pkg=$${u2.packageAmount}`,
    `        └── User3  ${short(wallets.user3)}  sponsor=${short(u3.sponsor)} active=${u3.isActive} pkg=$${u3.packageAmount}`,
  ];

  console.log(`\n── Referral Tree ──`);
  for (const line of lines) console.log(`  ${line}`);

  const z = "0x0000000000000000000000000000000000000000";
  const ok =
    root.isActive &&
    u1.isActive &&
    u2.isActive &&
    u3.isActive &&
    u1.sponsor.toLowerCase() === wallets.root.toLowerCase() &&
    u2.sponsor.toLowerCase() === wallets.user1.toLowerCase() &&
    u3.sponsor.toLowerCase() === wallets.user2.toLowerCase() &&
    (root.sponsor.toLowerCase() === z || root.sponsor === wallets.root);

  // Also verify ContributionReward.sponsors mapping
  const s1 = String(await c.contrib.sponsors(wallets.user1)).toLowerCase();
  const s2 = String(await c.contrib.sponsors(wallets.user2)).toLowerCase();
  const s3 = String(await c.contrib.sponsors(wallets.user3)).toLowerCase();
  const sponsorsOk =
    s1 === wallets.root.toLowerCase() &&
    s2 === wallets.user1.toLowerCase() &&
    s3 === wallets.user2.toLowerCase();

  console.log(`  Core sponsors match tree     : ${ok ? "YES" : "NO"}`);
  console.log(`  Contrib.sponsors match tree  : ${sponsorsOk ? "YES" : "NO"}`);

  return { ok: ok && sponsorsOk, lines };
}

export async function printContractState(
  ethers: { formatEther: (v: bigint) => string; provider: Provider },
  c: Contracts,
  btcUsd: number,
): Promise<{
  totalUsers: number;
  totalActive: number;
  totalInvestmentUsd: number;
  totalContribDistributed: bigint;
  totalRoiDistributed: bigint;
}> {
  const registered = await fetchEvents(ethers, c.core, "UserRegistered", 0);
  const activated = await fetchEvents(ethers, c.core, "PackageActivated", 0);
  let totalActive = 0;
  let totalInvestmentUsd = 0;
  const seen = new Set<string>();
  for (const e of registered) {
    const user = (e.args.user || "").toLowerCase();
    if (!user || seen.has(user)) continue;
    seen.add(user);
    const u = await readUser(c.core, user);
    if (u.isActive) totalActive++;
    totalInvestmentUsd += Number(u.packageAmount);
  }

  const contribPaid = await fetchEvents(ethers, c.contrib, "ContributionRewardPaid", 0);
  let totalContribDistributed = 0n;
  for (const e of contribPaid) {
    totalContribDistributed += BigInt(e.args.amount || "0");
  }
  const totalRoiDistributed = BigInt(await c.treasury.totalSelfRoiPaid());
  const t = await readTreasury(ethers, c);

  console.log(`\n── Contract State ──`);
  console.log(`  Total users (registered)     : ${registered.length}`);
  console.log(`  Total active users           : ${totalActive}`);
  console.log(`  Total investment (USD pkgs)  : $${totalInvestmentUsd}`);
  console.log(`  PackageActivated events      : ${activated.length}`);
  console.log(`  Contribution rewards paid    : ${fmtWei(ethers, totalContribDistributed)} BTCB (${fmtUsd(weiToUsd(ethers, totalContribDistributed, btcUsd))})`);
  console.log(`  ROI distributed              : ${fmtWei(ethers, totalRoiDistributed)} BTCB (${fmtUsd(weiToUsd(ethers, totalRoiDistributed, btcUsd))})`);
  console.log(`  Treasury token balance       : ${fmtWei(ethers, t.tokenBal)} BTCB`);
  console.log(`  Treasury fund sum            : ${fmtWei(ethers, t.sumFunds)} BTCB`);

  return {
    totalUsers: registered.length,
    totalActive,
    totalInvestmentUsd,
    totalContribDistributed,
    totalRoiDistributed,
  };
}

export function sectionResult(name: string, ok: boolean, note?: string): Check {
  const c: Check = { name, ok, note };
  return c;
}

export function printSummary(checks: Check[]): boolean {
  console.log("\n==============================");
  for (const c of checks) {
    console.log(c.name.toUpperCase());
    console.log(c.ok ? "✔ PASS" : "✘ FAIL");
    if (c.note) console.log(`  ${c.note}`);
    console.log("");
  }
  const passed = checks.filter((c) => c.ok).length;
  console.log("==============================\n");
  console.log("TOTAL");
  console.log(`${passed}/${checks.length} PASS`);
  console.log("");
  if (passed === checks.length) {
    console.log("READY FOR PHASE 3");
  } else {
    console.log("NOT READY — fix failures before Phase 3");
  }
  console.log("");
  return passed === checks.length;
}
