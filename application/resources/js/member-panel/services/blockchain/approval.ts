import { Contract, JsonRpcSigner, formatUnits } from 'ethers';
import { loadBlockchainConfig } from './config';
import { getTokenContract } from './contract';

/** ERC-20 Approval(address,address,uint256) topic */
export const ERC20_APPROVAL_TOPIC =
  '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';

function isTxHash(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

/**
 * ALWAYS open MetaMask for ERC-20 approve(core, amount), wait until mined,
 * and return the real approval transaction hash.
 *
 * Never skips MetaMask. Never returns null/dummy hashes.
 * Required before activatePackage so Laravel can store approve_tx_hash.
 */
export async function ensureTokenApproval(
  signer: JsonRpcSigner,
  tokenAmount: bigint,
  onStatus?: (message: string) => void,
): Promise<{ approveTxHash: string; allowance: bigint }> {
  if (tokenAmount <= 0n) {
    throw new Error('Invalid approval amount.');
  }

  const cfg = await loadBlockchainConfig();
  if (!cfg.core || !cfg.token) {
    throw new Error('Blockchain is not configured. Please contact support.');
  }

  const token = await getTokenContract(signer);
  const wallet = await signer.getAddress();

  const balance: bigint = await token.balanceOf(wallet);
  if (balance < tokenAmount) {
    const decimals = Number(await token.decimals().catch(() => 18));
    throw new Error(
      `Insufficient package balance. Need ${formatUnits(tokenAmount, decimals)} BTCB.`,
    );
  }

  onStatus?.('Confirm token approval in MetaMask…');
  // Always submit approve so MetaMask opens and we obtain a real mined hash.
  // Approving the exact package amount (not MaxUint256) keeps the Approval event
  // amount verifiable against the package payment.
  const approveTx = await token.approve(cfg.core, tokenAmount);
  onStatus?.('Waiting for approval confirmation…');
  const approveReceipt = await approveTx.wait();
  if (!approveReceipt || approveReceipt.status !== 1) {
    throw new Error('Approval cancelled.');
  }

  const approveTxHash = String(approveTx.hash);
  if (!isTxHash(approveTxHash)) {
    throw new Error('Invalid approval transaction hash.');
  }

  // Confirm Approval event in receipt (spender = core)
  const coreTopic = '0x' + cfg.core.replace(/^0x/, '').toLowerCase().padStart(64, '0');
  const ownerTopic = '0x' + wallet.replace(/^0x/, '').toLowerCase().padStart(64, '0');
  const hasApprovalLog = (approveReceipt.logs || []).some((log: { topics?: readonly string[] }) => {
    const topics = log.topics || [];
    return (
      String(topics[0] || '').toLowerCase() === ERC20_APPROVAL_TOPIC &&
      String(topics[1] || '').toLowerCase() === ownerTopic &&
      String(topics[2] || '').toLowerCase() === coreTopic
    );
  });
  if (!hasApprovalLog) {
    throw new Error('Approval event not found in transaction receipt.');
  }

  const refreshed: bigint = await token.allowance(wallet, cfg.core);
  if (refreshed < tokenAmount) {
    throw new Error('Approval failed.');
  }

  return { approveTxHash, allowance: refreshed };
}

/**
 * Find the most recent Approval(owner → core) tx hash on the token contract.
 * Used when resuming an already-activated package so approve_tx_hash is never null.
 */
export async function findPriorApprovalTx(
  signer: JsonRpcSigner,
  wallet: string,
): Promise<string | null> {
  const cfg = await loadBlockchainConfig();
  if (!cfg.token || !cfg.core || !signer.provider) {
    return null;
  }

  const ownerTopic = '0x' + wallet.replace(/^0x/, '').toLowerCase().padStart(64, '0');
  const spenderTopic = '0x' + cfg.core.replace(/^0x/, '').toLowerCase().padStart(64, '0');
  const latest = await signer.provider.getBlockNumber();
  const fromBlock = Math.max(0, latest - 500_000);

  const logs = await signer.provider.getLogs({
    address: cfg.token,
    topics: [ERC20_APPROVAL_TOPIC, ownerTopic, spenderTopic],
    fromBlock,
    toBlock: 'latest',
  });

  if (!logs.length) {
    return null;
  }

  const hash = logs[logs.length - 1]?.transactionHash ?? null;
  return hash && isTxHash(hash) ? hash : null;
}

export async function readAllowance(
  signer: JsonRpcSigner,
  owner: string,
  spender: string,
): Promise<bigint> {
  const token: Contract = await getTokenContract(signer);
  return token.allowance(owner, spender);
}
