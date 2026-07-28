export const RPC_URL =
  import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545";

export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 31337);

/** Hardhat account #0 — deployer / root / funder */
export const DEPLOYER_PK =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

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

export type DashboardTab =
  | "overview"
  | "users"
  | "tree"
  | "packages"
  | "roi"
  | "income"
  | "rank"
  | "ga"
  | "tier"
  | "community"
  | "recycling"
  | "events"
  | "txs"
  | "reports"
  | "timetravel"
  | "demo"
  | "reset"
  | "logs"
  | "dev";

export const TABS: { id: DashboardTab; label: string; client?: boolean }[] = [
  { id: "overview", label: "Overview", client: true },
  { id: "users", label: "Users", client: true },
  { id: "tree", label: "Tree", client: true },
  { id: "packages", label: "Packages", client: true },
  { id: "roi", label: "ROI", client: true },
  { id: "income", label: "Income", client: true },
  { id: "rank", label: "Rank", client: true },
  { id: "ga", label: "Growth Accel", client: true },
  { id: "tier", label: "Tier Booster", client: true },
  { id: "community", label: "Community", client: true },
  { id: "recycling", label: "Recycling", client: true },
  { id: "events", label: "Events" },
  { id: "txs", label: "Transactions" },
  { id: "reports", label: "Reports", client: true },
  { id: "timetravel", label: "Time Travel" },
  { id: "demo", label: "Demo", client: true },
  { id: "reset", label: "Reset" },
  { id: "logs", label: "Logs" },
  { id: "dev", label: "Developer" },
];
