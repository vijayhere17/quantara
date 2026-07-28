import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  Wallet,
  HDNodeWallet,
  Mnemonic,
  type Provider,
  type Signer,
  type TransactionRequest,
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

/** Serialize all deployer-signed txs so Hardhat never sees a stale nonce. */
let deployerQueue: Promise<unknown> = Promise.resolve();
const addressQueues = new Map<string, Promise<unknown>>();

function enqueueDeployer<T>(fn: () => Promise<T>): Promise<T> {
  const run = deployerQueue.then(fn, fn);
  deployerQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function enqueueAddress<T>(address: string, fn: () => Promise<T>): Promise<T> {
  const key = address.toLowerCase();
  const prev = addressQueues.get(key) || Promise.resolve();
  const run = prev.then(fn, fn);
  addressQueues.set(
    key,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

function isNonceError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /nonce|NONCE_EXPIRED|already been used|too low/i.test(msg);
}

async function sendDeployerTx(
  contracts: Contracts,
  build: (nonce: number) => Promise<{ hash: string; wait: () => Promise<unknown> }>,
) {
  return enqueueDeployer(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 5; attempt++) {
      const nonce = await contracts.provider.getTransactionCount(
        contracts.deployer.address,
        "latest",
      );
      try {
        const tx = await build(nonce);
        await tx.wait();
        return tx;
      } catch (e) {
        lastError = e;
        if (!isNonceError(e) || attempt === 4) throw e;
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
    }
    throw lastError;
  });
}

async function sendUserTx(
  contracts: Contracts,
  user: Signer,
  build: (
    nonce: number,
  ) => Promise<{ hash: string; wait: () => Promise<unknown> }>,
) {
  const userAddr = await user.getAddress();
  return enqueueAddress(userAddr, async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 5; attempt++) {
      const nonce = await contracts.provider.getTransactionCount(
        userAddr,
        "latest",
      );
      try {
        const tx = await build(nonce);
        await tx.wait();
        return tx;
      } catch (e) {
        lastError = e;
        if (!isNonceError(e) || attempt === 4) throw e;
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
    }
    throw lastError;
  });
}

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
    batchMaxCount: 1,
  });

  const network = await provider.getNetwork();
  if (Number(network.chainId) !== CHAIN_ID) {
    console.warn(`Expected chain ${CHAIN_ID}, got ${network.chainId}`);
  }

  // Verify core bytecode exists at the address book entry
  const code = await provider.getCode(addresses.BTCPlanCore);
  if (!code || code === "0x") {
    throw new Error(
      `No contract at BTCPlanCore ${addresses.BTCPlanCore}. Redeploy: npm run deploy && npm run qa:dashboard:sync`,
    );
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
  for (let i = 0; i < 50; i++) {
    const w = walletFromIndex(i, contracts.provider);
    if (w.address.toLowerCase() === addr) return w;
  }
  await contracts.provider.send("hardhat_impersonateAccount", [addressOrIndex]);
  await contracts.provider.send("hardhat_setBalance", [
    addressOrIndex,
    "0x56BC75E2D63100000",
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

export async function fundEth(
  contracts: Contracts,
  to: string,
  amountWei: bigint = 10n ** 18n,
) {
  const bal = await contracts.provider.getBalance(to);
  if (bal >= 10n ** 17n) return;
  await sendDeployerTx(contracts, async (nonce) => {
    const tx = await contracts.deployer.sendTransaction({
      to,
      value: amountWei,
      nonce,
    } satisfies TransactionRequest);
    return tx;
  });
}

export async function forceCompletePackage(
  contracts: Contracts,
  user: string,
) {
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
  const tx = await income.recordIncome(user, principal * 3n, 0);
  await tx.wait();
}

export async function mintAndApprove(
  contracts: Contracts,
  user: Signer,
  usdAmount: bigint,
) {
  const userAddr = await user.getAddress();
  const tokenAmount: bigint = await contracts.core.getPackageBTCBAmount(usdAmount);

  await sendDeployerTx(contracts, async (nonce) => {
    try {
      return await contracts.token.mint(userAddr, tokenAmount, { nonce });
    } catch (mintErr) {
      // Fallback: transfer from deployer balance
      try {
        return await contracts.token.transfer(userAddr, tokenAmount, { nonce });
      } catch {
        throw mintErr;
      }
    }
  });

  const tokenAsUser = contracts.token.connect(user) as Contract;
  const current: bigint = await contracts.token.allowance(
    userAddr,
    contracts.addresses.BTCPlanCore,
  );
  if (current < tokenAmount) {
    await sendUserTx(contracts, user, async (nonce) =>
      tokenAsUser.approve(contracts.addresses.BTCPlanCore, tokenAmount * 10n, {
        nonce,
      }),
    );
  }
  return tokenAmount;
}

export async function registerUser(
  contracts: Contracts,
  user: Signer,
  sponsor: string,
) {
  const userAddr = await user.getAddress();
  if (!sponsor || sponsor.toLowerCase() === userAddr.toLowerCase()) {
    throw new Error("Invalid sponsor — cannot register with self as sponsor");
  }
  await fundEth(contracts, userAddr);
  const already = await contracts.core.isRegistered(userAddr);
  if (already) {
    return { hash: "", receipt: null, already: true as const };
  }
  const core = contracts.core.connect(user) as Contract;
  const tx = await sendUserTx(contracts, user, async (nonce) =>
    core.register(sponsor, { nonce }),
  );
  return { hash: tx.hash as string, receipt: null, already: false as const };
}

export async function activatePackage(
  contracts: Contracts,
  user: Signer,
  usdAmount: number | bigint,
) {
  const userAddr = await user.getAddress();
  const registered = await contracts.core.isRegistered(userAddr);
  if (!registered) {
    throw new Error("User is not registered — click Register first");
  }

  const amount = BigInt(usdAmount);
  const [nextPkg, nextCycle] = await contracts.core.getNextEligiblePackage(userAddr);
  if (nextPkg !== amount) {
    throw new Error(
      `Next eligible package is $${nextPkg} C${nextCycle}, not $${amount}`,
    );
  }

  const userRow = await contracts.core.users(userAddr);
  const hasPkg = Number(userRow.packageAmount ?? userRow[2] ?? 0) > 0;
  const completed = Boolean(userRow.packageCompleted ?? userRow[7]);
  if (hasPkg && !completed) {
    throw new Error(
      "Current package not completed — use Upgrade (force complete) first",
    );
  }

  await mintAndApprove(contracts, user, amount);
  const core = contracts.core.connect(user) as Contract;
  const tx = await sendUserTx(contracts, user, async (nonce) =>
    core.activatePackage(amount, { nonce }),
  );
  return { hash: tx.hash as string, receipt: null, amount };
}

export async function claimSelfRoi(contracts: Contracts, user: Signer) {
  const userAddr = await user.getAddress();
  const roi = contracts.roi.connect(user) as Contract;
  return sendUserTx(contracts, user, async (nonce) =>
    roi.claimRoi({ nonce }),
  );
}

export async function connectBrowserWallet() {
  const eth = (window as unknown as { ethereum?: unknown }).ethereum;
  if (!eth) throw new Error("No browser wallet");
  const provider = new BrowserProvider(eth as never);
  await provider.send("eth_requestAccounts", []);
  return provider.getSigner();
}
