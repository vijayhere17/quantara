import "dotenv/config";

import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { defineConfig } from "hardhat/config";

/**
 * Parse PRIVATE_KEY from .env into a Hardhat-valid hex key.
 * Empty / missing → no accounts (OK for localhost).
 * Placeholder or bad format → clear error (avoids Hardhat HHE15).
 */
function resolveDeployerAccounts(): string[] {
  const raw = (process.env.PRIVATE_KEY || "")
    .trim()
    .replace(/^["']|["']$/g, "");

  if (!raw) {
    return [];
  }

  if (
    /your_.*key|changeme|xxx+|placeholder|example|insert|paste/i.test(raw) ||
    raw === "0x" ||
    raw.length < 10
  ) {
    throw new Error(
      [
        "PRIVATE_KEY in smart-contracts/.env is missing or still a placeholder.",
        "",
        "Fix:",
        "  1. Open MetaMask → Account details → Show private key (use a TESTNET wallet).",
        "  2. Put it in smart-contracts/.env as ONE line, no spaces/quotes:",
        "       PRIVATE_KEY=0x................................................",
        "  3. Must be 64 hex digits after 0x (NOT your public wallet address).",
        "",
        `Current value length: ${raw.length}`,
      ].join("\n"),
    );
  }

  const normalized =
    raw.startsWith("0x") || raw.startsWith("0X") ? `0x${raw.slice(2)}` : `0x${raw}`;

  if (!/^0x[a-fA-F0-9]{64}$/.test(normalized)) {
    throw new Error(
      [
        "PRIVATE_KEY must be a hex private key: 0x + 64 hex characters.",
        "Do not paste your wallet ADDRESS (0x + 40 chars).",
        `Got length after 0x: ${normalized.length - 2} (expected 64).`,
      ].join("\n"),
    );
  }

  return [normalized];
}

const accounts = resolveDeployerAccounts();

const localhostRpc = process.env.BLOCKCHAIN_RPC || "http://127.0.0.1:8545";
/** Default public BSC Testnet RPC — override with BSC_TESTNET_RPC_URL */
const bscTestnetRpc =
  process.env.BSC_TESTNET_RPC_URL ||
  process.env.BNB_TESTNET_RPC_URL ||
  "https://data-seed-prebsc-1-s1.binance.org:8545/";
const bscMainnetRpc =
  process.env.BSC_RPC_URL ||
  process.env.BNB_RPC_URL ||
  "https://bsc-dataseed.binance.org/";

function httpNetwork(url: string, withAccounts: boolean) {
  return {
    type: "http" as const,
    chainType: "l1" as const,
    url,
    ...(withAccounts && accounts.length ? { accounts } : {}),
  };
}

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    // Local Hardhat node uses its own unlocked accounts — do not inject PRIVATE_KEY
    localhost: httpNetwork(localhostRpc, false),
    // BSC Testnet / Mainnet require a valid PRIVATE_KEY in .env
    bscTestnet: httpNetwork(bscTestnetRpc, true),
    bnbTestnet: httpNetwork(bscTestnetRpc, true),
    bsc: httpNetwork(bscMainnetRpc, true),
    bscMainnet: httpNetwork(bscMainnetRpc, true),
  },
});
