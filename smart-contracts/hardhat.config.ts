import "dotenv/config";

import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { defineConfig } from "hardhat/config";

const privateKey = process.env.PRIVATE_KEY;
const accounts = privateKey ? [privateKey] : [];

const localhostRpc = process.env.BLOCKCHAIN_RPC || "http://127.0.0.1:8545";
const bscTestnetRpc =
  process.env.BSC_TESTNET_RPC_URL ||
  process.env.BNB_TESTNET_RPC_URL ||
  "";
const bscMainnetRpc =
  process.env.BSC_RPC_URL ||
  process.env.BNB_RPC_URL ||
  "";

function httpNetwork(url: string) {
  return {
    type: "http" as const,
    chainType: "l1" as const,
    url,
    ...(accounts.length ? { accounts } : {}),
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
    // `npx hardhat node` — local Hardhat JSON-RPC
    localhost: httpNetwork(localhostRpc),
    // BNB Smart Chain Testnet (chainId 97)
    ...(bscTestnetRpc
      ? {
          bscTestnet: httpNetwork(bscTestnetRpc),
          bnbTestnet: httpNetwork(bscTestnetRpc),
        }
      : {}),
    // BNB Smart Chain Mainnet (chainId 56)
    ...(bscMainnetRpc
      ? {
          bsc: httpNetwork(bscMainnetRpc),
          bscMainnet: httpNetwork(bscMainnetRpc),
        }
      : {}),
  },
});
