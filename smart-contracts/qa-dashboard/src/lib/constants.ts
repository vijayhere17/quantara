/** Network defaults — override with Vite env for BSC Testnet. */

const HARDHAT_PK =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

export const RPC_URL =
  import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545";

export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 31337);

/** Deployer / root / MockBTCB minter. On testnet set VITE_DEPLOYER_PK in .env */
function resolveDeployerPk(): string {
  const raw = (import.meta.env.VITE_DEPLOYER_PK || HARDHAT_PK).trim().replace(/^["']|["']$/g, "");
  if (!raw) return "";
  return raw.startsWith("0x") || raw.startsWith("0X") ? `0x${raw.slice(2)}` : `0x${raw}`;
}

export const DEPLOYER_PK = resolveDeployerPk();

export const IS_LOCAL = CHAIN_ID === 31337;
export const IS_TESTNET = CHAIN_ID === 97;
export const IS_MAINNET = CHAIN_ID === 56;

export const NETWORK_NAME = IS_LOCAL
  ? "Hardhat Local"
  : IS_TESTNET
    ? "BNB Smart Chain Testnet"
    : IS_MAINNET
      ? "BNB Smart Chain"
      : `Chain ${CHAIN_ID}`;

/** Native gas funding when creating QA wallets */
export const QA_FUND_WEI = IS_LOCAL
  ? 10n ** 18n // 1 ETH on Hardhat
  : 10n ** 16n; // 0.01 tBNB on testnet

export const QA_FUND_MIN_WEI = IS_LOCAL ? 10n ** 17n : 10n ** 15n; // 0.001 tBNB

/** Hardhat account #0 — deployer / root / funder (local only fallback) */
export const HARDHAT_DEPLOYER_PK = HARDHAT_PK;

export const PACKAGE_LADDER = [
  50, 100, 300, 500, 1000, 3000, 5000, 10000,
] as const;

export const RANK_NAMES = [
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

/** Business-facing tabs only (Developer holds technical tools). */
export type DashboardTab =
  | "overview"
  | "users"
  | "packages"
  | "income"
  | "tree"
  | "reports"
  | "developer";

export const BUSINESS_TABS: { id: DashboardTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "packages", label: "Packages" },
  { id: "income", label: "Income" },
  { id: "tree", label: "Referral Tree" },
  { id: "reports", label: "Reports" },
  { id: "developer", label: "Developer" },
];

/** @deprecated use BUSINESS_TABS */
export const TABS = BUSINESS_TABS;
