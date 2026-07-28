export const RPC_URL = resolveRpcUrl();

export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 31337);

/** Deployer / root / funder — Hardhat #0 locally; set VITE_DEPLOYER_PK on testnet */
export const DEPLOYER_PK =
  import.meta.env.VITE_DEPLOYER_PK ||
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

function resolveRpcUrl(): string {
  const env = (import.meta.env.VITE_RPC_URL || "").trim();
  if (!env) return "http://127.0.0.1:8545";
  // Use Vite dev proxy (see vite.config.ts) — required for BSC testnet from browser
  if (env === "/rpc" || env === "proxy") {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/rpc`;
    }
    return "http://127.0.0.1:5173/rpc";
  }
  return env;
}

export function networkLabel(chainId = CHAIN_ID): string {
  if (chainId === 31337) return "Hardhat Local";
  if (chainId === 97) return "BSC Testnet";
  if (chainId === 56) return "BSC Mainnet";
  return `Chain ${chainId}`;
}

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
