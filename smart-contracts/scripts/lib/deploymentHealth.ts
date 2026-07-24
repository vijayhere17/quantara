import fs from "fs";
import path from "path";
import type { Provider } from "ethers";

export type DeployedAddresses = {
  MockBTCB?: string;
  Token?: string;
  BTCPlanCore?: string;
  TreasuryManager?: string;
  InterdependentReward?: string;
  ContributionReward?: string;
  ContributionBooster?: string;
  RankReward?: string;
  CommunityBuilder?: string;
  IncomeManager?: string;
  RootUser?: string;
  MockBTCPriceFeed?: string;
  PriceFeed?: string;
  [key: string]: string | number | undefined;
};

export function addressesPath(cwd = process.cwd()): string {
  return path.resolve(cwd, "deployed-addresses.json");
}

export function loadDeployedAddresses(cwd = process.cwd()): DeployedAddresses {
  const file = addressesPath(cwd);
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8")) as DeployedAddresses;
}

export function saveDeployedAddresses(
  addresses: DeployedAddresses,
  cwd = process.cwd(),
) {
  fs.writeFileSync(addressesPath(cwd), JSON.stringify(addresses, null, 2));
}

export async function hasContractCode(
  provider: Provider,
  address: string,
): Promise<boolean> {
  const code = await provider.getCode(address);
  return Boolean(code && code !== "0x" && code.length > 2);
}

type EthersLike = {
  getContractAt: (
    name: string,
    address: string,
  ) => Promise<{
    users: (addr: string) => Promise<{ isActive: boolean; sponsor: string }>;
    btcbToken?: () => Promise<string>;
  }>;
  ZeroAddress: string;
};

/**
 * Prove address is BTCPlanCore: bytecode present + users(address) decodes.
 * Throws with a clear message on BAD_DATA / wrong contract / empty account.
 */
export async function assertBtcPlanCore(
  ethers: EthersLike,
  coreAddress: string,
  probeUser: string,
): Promise<{ isActive: boolean; sponsor: string }> {
  const core = await ethers.getContractAt("BTCPlanCore", coreAddress);
  try {
    const user = await core.users(probeUser);
    return {
      isActive: Boolean(user.isActive),
      sponsor: String(user.sponsor),
    };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    throw new Error(
      `users(address) failed at ${coreAddress}. ` +
        `This address is not a healthy BTCPlanCore (wrong contract, stale node, or bad ABI). ` +
        `Underlying: ${raw}`,
    );
  }
}

const LARAVEL_ENV_KEYS: Array<{ env: string; keys: string[] }> = [
  { env: "TOKEN_CONTRACT", keys: ["MockBTCB", "Token"] },
  { env: "CORE_CONTRACT", keys: ["BTCPlanCore"] },
  { env: "TREASURY_CONTRACT", keys: ["TreasuryManager"] },
  { env: "REWARD_CONTRACT", keys: ["InterdependentReward"] },
  { env: "INCOME_CONTRACT", keys: ["IncomeManager"] },
  { env: "CONTRIBUTION_CONTRACT", keys: ["ContributionReward"] },
  { env: "BOOSTER_CONTRACT", keys: ["ContributionBooster"] },
  { env: "RANK_CONTRACT", keys: ["RankReward"] },
  { env: "COMMUNITY_CONTRACT", keys: ["CommunityBuilder"] },
];

function pickAddress(
  addresses: DeployedAddresses,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = addresses[key];
    if (typeof value === "string" && value.startsWith("0x")) return value;
  }
  return undefined;
}

/**
 * Upsert Laravel application/.env contract address keys from deployed-addresses.json.
 * Never invents addresses — only writes keys present in the deployment file.
 */
export function syncLaravelEnvFromAddresses(
  addresses: DeployedAddresses,
  laravelEnvPath: string,
): void {
  if (!fs.existsSync(laravelEnvPath)) {
    throw new Error(`Laravel .env not found: ${laravelEnvPath}`);
  }

  let content = fs.readFileSync(laravelEnvPath, "utf8");
  const updates: string[] = [];

  for (const row of LARAVEL_ENV_KEYS) {
    const value = pickAddress(addresses, row.keys);
    if (!value) continue;
    updates.push(`${row.env}=${value}`);

    const re = new RegExp(`^${row.env}=.*$`, "m");
    if (re.test(content)) {
      content = content.replace(re, `${row.env}=${value}`);
    } else {
      content = content.trimEnd() + `\n${row.env}=${value}\n`;
    }
  }

  // Keep chain hints for local Hardhat when present in addresses
  if (typeof addresses.chainId === "number" || typeof addresses.chainId === "string") {
    const chainId = String(addresses.chainId);
    if (/^BLOCKCHAIN_CHAIN_ID=/m.test(content)) {
      content = content.replace(/^BLOCKCHAIN_CHAIN_ID=.*$/m, `BLOCKCHAIN_CHAIN_ID=${chainId}`);
    }
  }

  fs.writeFileSync(laravelEnvPath, content);
  void updates;
}

/**
 * Update application/config/blockchain.php local fallback block (31337 only).
 */
export function syncLaravelLocalConfigFallbacks(
  addresses: DeployedAddresses,
  phpConfigPath: string,
): void {
  if (!fs.existsSync(phpConfigPath)) return;
  let php = fs.readFileSync(phpConfigPath, "utf8");

  const map: Array<[string, string | undefined]> = [
    ["token", pickAddress(addresses, ["MockBTCB", "Token"])],
    ["core", pickAddress(addresses, ["BTCPlanCore"])],
    ["treasury", pickAddress(addresses, ["TreasuryManager"])],
    ["reward", pickAddress(addresses, ["InterdependentReward"])],
  ];

  const localBlock = php.match(/'local'\s*=>\s*\[[\s\S]*?\],/);
  if (!localBlock) return;

  let block = localBlock[0];
  for (const [key, value] of map) {
    if (!value) continue;
    block = block.replace(
      new RegExp(`('${key}'\\s*=>\\s*)'0x[a-fA-F0-9]+'`),
      `$1'${value}'`,
    );
  }
  php = php.replace(localBlock[0], block);
  fs.writeFileSync(phpConfigPath, php);
}
