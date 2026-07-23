import { BrowserProvider, Contract, JsonRpcSigner } from 'ethers';
import coreAbi from './BTCPlanCore.abi.json';
import tokenAbi from './MockBTCB.abi.json';
import { loadBlockchainConfig } from './config';

export async function getCoreContract(signerOrProvider: JsonRpcSigner | BrowserProvider) {
  const cfg = await loadBlockchainConfig();
  if (!cfg.core) {
    throw new Error('CORE_CONTRACT is not configured. Set CORE_CONTRACT in the environment.');
  }
  return new Contract(cfg.core, coreAbi, signerOrProvider);
}

export async function getTokenContract(signerOrProvider: JsonRpcSigner | BrowserProvider) {
  const cfg = await loadBlockchainConfig();
  if (!cfg.token) {
    throw new Error('TOKEN_CONTRACT is not configured. Set TOKEN_CONTRACT in the environment.');
  }
  return new Contract(cfg.token, tokenAbi, signerOrProvider);
}
