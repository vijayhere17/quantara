import { Contract, JsonRpcSigner, zeroPadValue } from 'ethers';
import { getCoreContract } from './contract';
import { loadBlockchainConfig } from './config';

/** Event topic hashes for BTCPlanCore (ethers.id of canonical signatures) */
export const USER_REGISTERED_TOPIC =
  '0x2138b9314634f9fdd5e49bee3eaf17ca557b6637524d0db759711c3bfcd3d850';

/** PackageActivated(address,uint256,uint8,uint256) */
export const PACKAGE_ACTIVATED_TOPIC =
  '0xd9e77818478fb96613e336e49129f3b174b896a6a6fa084e7fdcc5e9bd6be9da';

function padAddressTopic(address: string): string {
  return zeroPadValue(address.toLowerCase(), 32);
}

/**
 * Look up prior UserRegistered / PackageActivated txs for a wallet.
 * Used when on-chain register already succeeded but Laravel never persisted the user.
 */
export async function findPriorRegistrationTxs(
  signer: JsonRpcSigner,
  wallet: string,
): Promise<{
  registerTxHash: string | null;
  packageTxHash: string | null;
  packageAmount: number | null;
  packageCycle: number | null;
  sponsor: string | null;
}> {
  const cfg = await loadBlockchainConfig();
  if (!cfg.core) {
    return {
      registerTxHash: null,
      packageTxHash: null,
      packageAmount: null,
      packageCycle: null,
      sponsor: null,
    };
  }

  const provider = signer.provider;
  if (!provider) {
    throw new Error('Wallet provider is unavailable');
  }

  const walletTopic = padAddressTopic(wallet);
  const latest = await provider.getBlockNumber();
  // Cap lookback to avoid RPC limits on public endpoints
  const fromBlock = Math.max(0, latest - 500_000);

  const registered = await provider.getLogs({
    address: cfg.core,
    topics: [USER_REGISTERED_TOPIC, walletTopic],
    fromBlock,
    toBlock: 'latest',
  });

  const activated = await provider.getLogs({
    address: cfg.core,
    topics: [PACKAGE_ACTIVATED_TOPIC, walletTopic],
    fromBlock,
    toBlock: 'latest',
  });

  const registerLog = registered.length ? registered[registered.length - 1] : null;
  const packageLog = activated.length ? activated[activated.length - 1] : null;

  let sponsor: string | null = null;
  if (registerLog?.topics?.[2]) {
    sponsor = ('0x' + registerLog.topics[2].slice(-40)).toLowerCase();
  }

  let packageAmount: number | null = null;
  let packageCycle: number | null = null;
  if (packageLog?.data) {
    const data = packageLog.data.replace(/^0x/, '');
    if (data.length >= 128) {
      packageAmount = Number(BigInt('0x' + data.slice(0, 64)));
      packageCycle = Number(BigInt('0x' + data.slice(64, 128)));
    }
  }

  return {
    registerTxHash: registerLog?.transactionHash ?? null,
    packageTxHash: packageLog?.transactionHash ?? null,
    packageAmount,
    packageCycle,
    sponsor,
  };
}

export async function readOnChainUser(signer: JsonRpcSigner, wallet: string) {
  const core = await getCoreContract(signer);
  return core.users(wallet);
}

export async function assertSponsorActiveOnChain(core: Contract, sponsor: string) {
  if (sponsor === '0x0000000000000000000000000000000000000000') {
    return;
  }
  const row = await core.users(sponsor);
  if (!row.isActive) {
    throw new Error(
      'Sponsor is not registered on-chain yet. The genesis/root wallet must call ' +
        'BTCPlanCore.register(address(0)) after deploy (see npm run bootstrap:root). ' +
        'Then use that root wallet as the Laravel sponsor.',
    );
  }
}
