import "dotenv/config";

import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { defineConfig } from "hardhat/config";

const bnbTestnetRpcUrl = process.env.BNB_TESTNET_RPC_URL;
const privateKey = process.env.PRIVATE_KEY;
const localhostRpc = process.env.BLOCKCHAIN_RPC || "http://127.0.0.1:8545";

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
    // Running `npx hardhat node` — used by deploy / bootstrap-root against live local chain
    localhost: {
      type: "http" as const,
      chainType: "l1" as const,
      url: localhostRpc,
      ...(privateKey ? { accounts: [privateKey] } : {}),
    },
    ...(bnbTestnetRpcUrl && privateKey
      ? {
          bnbTestnet: {
            type: "http" as const,
            chainType: "l1" as const,
            url: bnbTestnetRpcUrl,
            accounts: [privateKey],
          },
        }
      : {}),
  },
});
