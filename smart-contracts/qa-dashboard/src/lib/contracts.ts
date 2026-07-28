import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  Wallet,
  HDNodeWallet,
  Mnemonic,
  type Provider,
  type Signer,
  formatEther,
} from "ethers";
import { CHAIN_ID, DEPLOYER_PK, RPC_URL } from "./constants";

import BTCPlanCoreAbi from "@/abis/BTCPlanCore.json";
import TreasuryManagerAbi from "@/abis/TreasuryManager.json";
import IncomeManagerAbi from "@/abis/IncomeManager.json";
import InterdependentRewardAbi from "@/abis/InterdependentReward.json";
import ContributionRewardAbi from "@/abis/ContributionReward.json";
import ContributionBoosterAbi from "@/abis/ContributionBooster.json";
import RankRewardAbi from "@/abis/RankReward.json";
import CommunityBuilderAbi from "@/abis/CommunityBuilder.json";
import MockBTCBAbi from "@/abis/MockBTCB.json";

export type AddressBook = {
  network: string;
  chainId: number;
  Token: string;
  MockBTCB?: string;
  PriceFeed?: string;
  MockBTCPriceFeed?: string;
  BTCPlanCore: string;
  TreasuryManager: string;
  InterdependentReward: string;
  ContributionReward: string;
  ContributionBooster: string;
  RankReward: string;
  CommunityBuilder: string;
  IncomeManager: string;
  RootUser: string;
};

export type Contracts = {
  provider: JsonRpcProvider;
  deployer: Wallet;
  token: Contract;
  core: Contract;
  treasury: Contract;
  income: Contract;
  roi: Contract;
  contribution: Contract;
  booster: Contract;
  rank: Contract;
  community: Contract;
  addresses: AddressBook;
};

const HARDHAT_MNEMONIC =
  "test test test test test test test test test test test junk";

export function walletFromIndex(index: number, provider?: Provider): HDNodeWallet {
  const mnemonic = Mnemonic.fromPhrase(HARDHAT_MNEMONIC);
  const root = HDNodeWallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${index}`);
  return provider ? root.connect(provider) : root;
}

export async function loadAddressBook(): Promise<AddressBook> {
  const res = await fetch("/deployed-addresses.json", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(
      "deployed-addresses.json missing. Run: npm run deploy (Hardhat node must be up).",
    );
  }
  return (await res.json()) as AddressBook;
}

export async function connectContracts(): Promise<Contracts> {
  const addresses = await loadAddressBook();
  const provider = new JsonRpcProvider(RPC_URL, CHAIN_ID, {
    staticNetwork: true,
  });

  // Probe node
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== CHAIN_ID) {
    console.warn(`Expected chain ${CHAIN_ID}, got ${network.chainId}`);
  }

  const deployer = new Wallet(DEPLOYER_PK, provider);
  const tokenAddr = addresses.Token || addresses.MockBTCB;
  if (!tokenAddr) throw new Error("Token address missing in address book");

  const at = (addr: string, abi: unknown) =>
    new Contract(addr, (abi as { abi: unknown }).abi as never, deployer);

  return {
    provider,
    deployer,
    addresses,
    token: at(tokenAddr, MockBTCBAbi),
    core: at(addresses.BTCPlanCore, BTCPlanCoreAbi),
    treasury: at(addresses.TreasuryManager, TreasuryManagerAbi),
    income: at(addresses.IncomeManager, IncomeManagerAbi),
    roi: at(addresses.InterdependentReward, InterdependentRewardAbi),
    contribution: at(addresses.ContributionReward, ContributionRewardAbi),
    booster: at(addresses.ContributionBooster, ContributionBoosterAbi),
    rank: at(addresses.RankReward, RankRewardAbi),
    community: at(addresses.CommunityBuilder, CommunityBuilderAbi),
  };
}

export async function getSignerFor(
  contracts: Contracts,
  addressOrIndex: string | number,
): Promise<Signer> {
  if (typeof addressOrIndex === "number") {
    return walletFromIndex(addressOrIndex, contracts.provider);
  }
  const addr = addressOrIndex.toLowerCase();
  // Try Hardhat accounts 0..49
  for (let i = 0; i < 50; i++) {
    const w = walletFromIndex(i, contracts.provider);
    if (w.address.toLowerCase() === addr) return w;
  }
  // Impersonate arbitrary address (Hardhat only)
  await contracts.provider.send("hardhat_impersonateAccount", [addressOrIndex]);
  await contracts.provider.send("hardhat_setBalance", [
    addressOrIndex,
    "0x56BC75E2D63100000", // 100 ETH
  ]);
  return await contracts.provider.getSigner(addressOrIndex);
}

export async function withContractSigner(
  contract: Contract,
  signer: Signer,
): Promise<Contract> {
  return contract.connect(signer) as Contract;
}

export async function increaseTime(provider: JsonRpcProvider, seconds: number) {
  await provider.send("evm_increaseTime", [seconds]);
  await provider.send("evm_mine", []);
}

export async function snapshot(provider: JsonRpcProvider): Promise<string> {
  return provider.send("evm_snapshot", []);
}

export async function revert(provider: JsonRpcProvider, id: string) {
  await provider.send("evm_revert", [id]);
}

export async function forceCompletePackage(
  contracts: Contracts,
  user: string,
) {
  // Impersonate an authorized income recorder (InterdependentReward)
  const auth = contracts.addresses.InterdependentReward;
  await contracts.provider.send("hardhat_impersonateAccount", [auth]);
  await contracts.provider.send("hardhat_setBalance", [
    auth,
    "0x56BC75E2D63100000",
  ]);
  const signer = await contracts.provider.getSigner(auth);
  const income = contracts.income.connect(signer) as Contract;
  const principal: bigint = await contracts.income.principal(user);
  if (principal === 0n) return;
  const tx = await income.recordIncome(user, principal * 3n, 0); // ROI
  await tx.wait();
}

export async function mintAndApprove(
  contracts: Contracts,
  user: Signer,
  usdAmount: bigint,
) {
  const userAddr = await user.getAddress();
  const tokenAmount: bigint = await contracts.core.getPackageBTCBAmount(usdAmount);
  const nonce = await contracts.provider.getTransactionCount(
    contracts.deployer.address,
    "pending",
  );
  try {
    const mintTx = await contracts.token.mint(userAddr, tokenAmount, { nonce });
    await mintTx.wait();
  } catch {
    const tx = await contracts.token.transfer(userAddr, tokenAmount, {
      nonce: await contracts.provider.getTransactionCount(
        contracts.deployer.address,
        "pending",
      ),
    });
    await tx.wait();
  }
  const tokenAsUser = contracts.token.connect(user) as Contract;
  const approveTx = await tokenAsUser.approve(
    contracts.addresses.BTCPlanCore,
    tokenAmount,
  );
  await approveTx.wait();
  return tokenAmount;
}

export async function registerUser(
  contracts: Contracts,
  user: Signer,
  sponsor: string,
) {
  const core = contracts.core.connect(user) as Contract;
  const tx = await core.register(sponsor);
  const receipt = await tx.wait();
  return { hash: tx.hash as string, receipt };
}

export async function activatePackage(
  contracts: Contracts,
  user: Signer,
  usdAmount: number | bigint,
) {
  const amount = BigInt(usdAmount);
  await mintAndApprove(contracts, user, amount);
  const core = contracts.core.connect(user) as Contract;
  const tx = await core.activatePackage(amount);
  const receipt = await tx.wait();
  return { hash: tx.hash as string, receipt, amount };
}

export async function ethBalance(provider: Provider, address: string) {
  return formatEther(await provider.getBalance(address));
}

/** Optional browser wallet (MetaMask) — not required for local Hardhat QA */
export async function connectBrowserWallet() {
  const eth = (window as unknown as { ethereum?: unknown }).ethereum;
  if (!eth) throw new Error("No browser wallet");
  const provider = new BrowserProvider(eth as never);
  await provider.send("eth_requestAccounts", []);
  return provider.getSigner();
}
