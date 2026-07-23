import type { Contract, Signer } from "ethers";

export const DEMO_BTCB_AMOUNT = "1000";
/** Hardhat accounts #1, #2, #3 */
export const DEMO_ACCOUNT_INDEXES = [1, 2, 3] as const;

type EthersLike = {
  parseUnits: (value: string, decimals?: number | bigint) => bigint;
  formatUnits: (value: bigint, decimals?: number | bigint) => string;
};

/**
 * Prefer MockBTCB.mint(to, amount). Fall back to transfer from the deployer signer.
 */
export async function fundAddressWithMockBTCB(
  token: Contract,
  deployer: Signer,
  recipient: string,
  amount: bigint,
): Promise<"mint" | "transfer"> {
  const maybeMint = (token as Contract & { mint?: (...args: unknown[]) => Promise<unknown> })
    .mint;

  if (typeof maybeMint === "function") {
    try {
      const tx = await (token as Contract).getFunction("mint")(recipient, amount);
      await tx.wait();
      return "mint";
    } catch {
      // fall through to transfer
    }
  }

  const connected = token.connect(deployer) as Contract;
  const tx = await connected.getFunction("transfer")(recipient, amount);
  await tx.wait();
  return "transfer";
}

export async function fundDemoAccounts(params: {
  ethers: EthersLike;
  token: Contract;
  deployer: Signer;
  signers: Signer[];
  amountHuman?: string;
  indexes?: readonly number[];
}): Promise<
  Array<{ index: number; address: string; method: "mint" | "transfer"; balance: string }>
> {
  const {
    ethers,
    token,
    deployer,
    signers,
    amountHuman = DEMO_BTCB_AMOUNT,
    indexes = DEMO_ACCOUNT_INDEXES,
  } = params;

  const decimals = Number(await token.getFunction("decimals")());
  const amount = ethers.parseUnits(amountHuman, decimals);
  const results: Array<{
    index: number;
    address: string;
    method: "mint" | "transfer";
    balance: string;
  }> = [];

  for (const index of indexes) {
    const account = signers[index];
    if (!account) {
      console.warn(`  Skipping account #${index} — signer not available`);
      continue;
    }
    const address = await account.getAddress();
    const method = await fundAddressWithMockBTCB(token, deployer, address, amount);
    const bal = await token.getFunction("balanceOf")(address);
    results.push({
      index,
      address,
      method,
      balance: ethers.formatUnits(bal, decimals),
    });
  }

  return results;
}

export async function printAccountBalances(params: {
  ethers: EthersLike;
  token: Contract;
  signers: Signer[];
  indexes: number[];
}) {
  const { ethers, token, signers, indexes } = params;
  const decimals = Number(await token.getFunction("decimals")());

  for (const index of indexes) {
    const account = signers[index];
    if (!account) continue;
    const address = await account.getAddress();
    const bal = await token.getFunction("balanceOf")(address);
    const label = index === 0 ? "Account #0 (root/deployer)" : `Account #${index}`;
    console.log(label);
    console.log(`  ${address}`);
    console.log(`  ${ethers.formatUnits(bal, decimals)} BTCB`);
  }
}
