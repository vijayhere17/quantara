import { Interface, parseUnits, formatUnits } from 'ethers';
import { LOCAL_CHAIN_ID, loadBlockchainConfig, type BlockchainPublicConfig } from './config';
import { getTokenContract } from './contract';
import { createBrowserProvider, mapWalletError } from './wallet';
import tokenAbi from './MockBTCB.abi.json';

export const DEMO_FAUCET_AMOUNT = '1000';

const MINT_SELECTOR = '0x40c10f19'; // mint(address,uint256)

function tokenInterface(): Interface {
  return new Interface(tokenAbi);
}

/**
 * Local Hardhat-only MockBTCB faucet.
 * Requires chainId 31337 + Laravel demoFaucet flag (APP_ENV local).
 * Never available on BSC mainnet / production.
 */
export async function isDemoFaucetEnabled(): Promise<boolean> {
  try {
    const cfg = await loadBlockchainConfig();
    if (cfg.chainId !== LOCAL_CHAIN_ID) return false;
    if (cfg.demoFaucet === false) return false;
    return cfg.demoFaucet === true || cfg.chainId === LOCAL_CHAIN_ID;
  } catch {
    return false;
  }
}

function isUnrecognizedSelectorError(error: unknown): boolean {
  const raw = JSON.stringify(error ?? {}).toLowerCase();
  const msg = String(
    (error as { shortMessage?: string; message?: string; reason?: string })?.shortMessage ||
      (error as { message?: string })?.message ||
      (error as { reason?: string })?.reason ||
      '',
  ).toLowerCase();
  return (
    msg.includes('unrecognized-selector') ||
    msg.includes('unrecognized selector') ||
    msg.includes('function selector was not recognized') ||
    raw.includes('unrecognized-selector') ||
    // Hardhat empty require on missing fn often surfaces as require(false)
    (msg.includes('require(false)') && msg.includes('estimate'))
  );
}

/**
 * Probe whether the live TOKEN_CONTRACT implements mint(address,uint256).
 * Older MockBTCB deployments (pre-faucet) do not — bootstrap funded them via transfer.
 */
export async function tokenSupportsMint(
  token: Awaited<ReturnType<typeof getTokenContract>>,
  wallet: string,
): Promise<boolean> {
  try {
    // eth_call — no state change. Success or a business revert ⇒ selector exists.
    await token.mint.staticCall(wallet, 0n);
    return true;
  } catch (error) {
    if (isUnrecognizedSelectorError(error)) {
      return false;
    }
    const msg = String(
      (error as { shortMessage?: string; message?: string })?.shortMessage ||
        (error as { message?: string })?.message ||
        '',
    ).toLowerCase();
    // Missing function variants from different nodes
    if (msg.includes('call revert exception') && msg.includes('missing revert data')) {
      // Ambiguous on some nodes — try packing and eth_call raw
      return false;
    }
    // Any other revert means the function was dispatched
    return true;
  }
}

export function describeTokenCall(
  cfg: BlockchainPublicConfig,
  functionName: 'mint' | 'approve' | 'transfer' | 'transferFrom' | 'balanceOf',
  args: unknown[],
) {
  const iface = tokenInterface();
  const data = iface.encodeFunctionData(functionName, args);
  const fragment = iface.getFunction(functionName);
  return {
    functionName,
    selector: data.slice(0, 10),
    expectedMintSelector: MINT_SELECTOR,
    calldata: data,
    contractAddress: cfg.token,
    abiFunctions: (tokenAbi as Array<{ type?: string; name?: string }>)
      .filter((x) => x.type === 'function')
      .map((x) => x.name)
      .filter(Boolean),
    fragment: fragment?.format('minimal') ?? null,
  };
}

export async function claimDemoBTCB(amountHuman = DEMO_FAUCET_AMOUNT): Promise<{
  txHash: string;
  balance: string;
  wallet: string;
  method: 'mint' | 'already-funded' | 'skipped-no-mint';
}> {
  const cfg = await loadBlockchainConfig();
  if (cfg.chainId !== LOCAL_CHAIN_ID) {
    throw new Error('Demo faucet is only available on the local Hardhat network.');
  }
  if (cfg.demoFaucet === false) {
    throw new Error('Demo faucet is disabled in this environment.');
  }
  if (!cfg.token) {
    throw new Error('TOKEN_CONTRACT is not configured.');
  }

  try {
    const session = await createBrowserProvider();
    const token = await getTokenContract(session.signer);
    const wallet = session.address;
    const decimals = Number(await token.decimals());
    const amount = parseUnits(amountHuman, decimals);
    const current: bigint = await token.balanceOf(wallet);

    // Already funded (e.g. bootstrap:demo transferred 1000/2000 BTCB) — do not call mint
    if (current >= amount) {
      if (import.meta.env.DEV) {
        console.info('[demo-faucet] already funded — skipping mint', {
          wallet,
          balance: formatUnits(current, decimals),
          token: cfg.token,
        });
      }
      return {
        txHash: '',
        balance: formatUnits(current, decimals),
        wallet,
        method: 'already-funded',
      };
    }

    const supportsMint = await tokenSupportsMint(token, wallet);
    const callInfo = describeTokenCall(cfg, 'mint', [wallet, amount]);

    console.info('[demo-faucet] planned call', callInfo);

    if (!supportsMint) {
      throw new Error(
        `This MockBTCB at ${cfg.token} has no mint() (selector ${MINT_SELECTOR}). ` +
          `Hardhat shows MockBTCB#<unrecognized-selector> for Get Demo BTCB. ` +
          `Your balance is ${formatUnits(current, decimals)} BTCB. ` +
          `Re-run FORCE_DEPLOY=1 npm run bootstrap:demo to deploy MockBTCB with mint(), ` +
          `or fund via npm run bootstrap:root (transfer from deployer).`,
      );
    }

    const tx = await token.mint(wallet, amount);
    console.info('[demo-faucet] submitted', {
      ...callInfo,
      txHash: tx.hash,
    });
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new Error('Demo mint transaction failed');
    }

    const newBal: bigint = await token.balanceOf(wallet);
    return {
      txHash: String(tx.hash),
      balance: formatUnits(newBal, decimals),
      wallet,
      method: 'mint',
    };
  } catch (error) {
    if (isUnrecognizedSelectorError(error)) {
      throw new Error(
        `MockBTCB rejected mint() selector ${MINT_SELECTOR} (contract was deployed without mint). ` +
          `Run FORCE_DEPLOY=1 npm run bootstrap:demo, update TOKEN_CONTRACT, then retry. ` +
          `If bootstrap already funded your account, skip Get Demo BTCB and Complete Registration.`,
      );
    }
    throw Object.assign(new Error(mapWalletError(error)), { cause: error });
  }
}
