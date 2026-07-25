import { BrowserProvider, Contract, JsonRpcSigner } from 'ethers';
import coreAbi from './BTCPlanCore.abi.json';
import tokenAbi from './MockBTCB.abi.json';
import { loadBlockchainConfig } from './config';

async function assertContractBytecode(
  signerOrProvider: JsonRpcSigner | BrowserProvider,
  address: string,
  label: string,
) {
  const provider =
    'provider' in signerOrProvider && signerOrProvider.provider
      ? signerOrProvider.provider
      : (signerOrProvider as BrowserProvider);

  const code = await provider.getCode(address);
  if (!code || code === '0x') {
    throw new Error(
      `${label} at ${address} has no bytecode. ` +
        'The configured contract address is stale or undeployed — redeploy and refresh CORE_CONTRACT / TOKEN_CONTRACT.',
    );
  }
}

export async function getCoreContract(signerOrProvider: JsonRpcSigner | BrowserProvider) {
  const cfg = await loadBlockchainConfig();
  if (!cfg.core) {
    throw new Error('CORE_CONTRACT is not configured. Set CORE_CONTRACT in the environment.');
  }
  await assertContractBytecode(signerOrProvider, cfg.core, 'CORE_CONTRACT');
  return new Contract(cfg.core, coreAbi, signerOrProvider);
}

export async function getTokenContract(signerOrProvider: JsonRpcSigner | BrowserProvider) {
  const cfg = await loadBlockchainConfig();
  if (!cfg.token) {
    throw new Error('TOKEN_CONTRACT is not configured. Set TOKEN_CONTRACT in the environment.');
  }
  await assertContractBytecode(signerOrProvider, cfg.token, 'TOKEN_CONTRACT');
  return new Contract(cfg.token, tokenAbi, signerOrProvider);
}
