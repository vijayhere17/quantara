import { parseUnits, formatUnits } from 'ethers';
import { LOCAL_CHAIN_ID, loadBlockchainConfig } from './config';
import { getTokenContract } from './contract';
import { createBrowserProvider, mapWalletError } from './wallet';

export const DEMO_FAUCET_AMOUNT = '1000';

/**
 * Local Hardhat-only MockBTCB faucet.
 * Requires chainId 31337 + Laravel demoFaucet flag (APP_ENV local).
 * Never available on BSC mainnet / production.
 */
export async function isDemoFaucetEnabled(): Promise<boolean> {
  try {
    const cfg = await loadBlockchainConfig();
    // Production / BSC: never show
    if (cfg.chainId !== LOCAL_CHAIN_ID) return false;
    // Explicit server flag (false in production even if chain misconfigured)
    if (cfg.demoFaucet === false) return false;
    return cfg.demoFaucet === true || cfg.chainId === LOCAL_CHAIN_ID;
  } catch {
    return false;
  }
}

export async function claimDemoBTCB(amountHuman = DEMO_FAUCET_AMOUNT): Promise<{
  txHash: string;
  balance: string;
  wallet: string;
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

    // Prefer mint(address,uint256); fall back to transfer if deployer is connected
    let txHash = '';
    try {
      const tx = await token.mint(wallet, amount);
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) {
        throw new Error('Demo mint transaction failed');
      }
      txHash = String(tx.hash);
    } catch (mintError) {
      // Transfer only works if the connected wallet holds enough BTCB (e.g. deployer)
      const bal: bigint = await token.balanceOf(wallet);
      if (bal < amount) {
        throw Object.assign(
          new Error(
            'Demo mint unavailable on this token deployment. Re-run `npm run bootstrap:demo` ' +
              'with the updated MockBTCB (mint), or import a funded Hardhat account.',
          ),
          { cause: mintError },
        );
      }
      throw mintError;
    }

    const newBal: bigint = await token.balanceOf(wallet);
    return {
      txHash,
      balance: formatUnits(newBal, decimals),
      wallet,
    };
  } catch (error) {
    throw Object.assign(new Error(mapWalletError(error)), { cause: error });
  }
}
