<?php

namespace App\Services;

use App\Models\BlockchainPackageActivation;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

/**
 * Blockchain sync/verify helpers.
 * Extends the existing config stub — does not replace it.
 */
class BlockchainService
{
    protected string $rpc;
    protected int $chainId;
    protected string $core;
    protected string $token;
    protected string $treasury;
    protected string $reward;

    public const USER_REGISTERED_TOPIC = '0x2138b9314634f9fdd5e49bee3eaf17ca557b6637524d0db759711c3bfcd3d850';
    public const PACKAGE_ACTIVATED_TOPIC = '0xd9e77818478fb96613e336e49129f3b174b896a6a6fa084e7fdcc5e9bd6be9da';
    /** ERC-20 Approval(address,address,uint256) */
    public const ERC20_APPROVAL_TOPIC = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';

    public function __construct()
    {
        $this->rpc = (string) config('blockchain.rpc_url');
        $this->chainId = (int) config('blockchain.chain_id', 56);

        $this->core = (string) (config('blockchain.contracts.core') ?: ($this->chainId === 31337 ? config('blockchain.local.core') : ''));
        $this->token = (string) (config('blockchain.contracts.token') ?: ($this->chainId === 31337 ? config('blockchain.local.token') : ''));
        $this->treasury = (string) (config('blockchain.contracts.treasury') ?: ($this->chainId === 31337 ? config('blockchain.local.treasury') : ''));
        $this->reward = (string) (config('blockchain.contracts.reward') ?: ($this->chainId === 31337 ? config('blockchain.local.reward') : ''));
    }

    public function getConfig(): array
    {
        $isLocalChain = $this->chainId === 31337;
        $isLocalApp = app()->environment(['local', 'testing']);
        $explorers = (array) config('blockchain.explorers', []);
        $names = (array) config('blockchain.network_names', []);

        return [
            'rpc' => $this->rpc,
            'chainId' => $this->chainId,
            'core' => $this->core,
            'token' => $this->token,
            'treasury' => $this->treasury,
            'reward' => $this->reward,
            'explorer' => (string) ($explorers[$this->chainId] ?? ''),
            'networkName' => (string) ($names[$this->chainId] ?? ('Chain ' . $this->chainId)),
            // Local Hardhat demo faucet only — never true in production
            'demoFaucet' => $isLocalChain && $isLocalApp,
        ];
    }

    public function getExplorerBaseUrl(?int $chainId = null): string
    {
        $id = $chainId ?? $this->chainId;
        $explorers = (array) config('blockchain.explorers', []);
        return (string) ($explorers[$id] ?? '');
    }

    public function getExplorerTxUrl(string $txHash, ?int $chainId = null): ?string
    {
        $base = $this->getExplorerBaseUrl($chainId);
        if ($base === '') {
            return null;
        }
        $hash = str_starts_with($txHash, '0x') ? $txHash : ('0x' . $txHash);
        return rtrim($base, '/') . '/tx/' . $hash;
    }

    public function getChainId(): int
    {
        return $this->chainId;
    }

    /**
     * Ensure a mined receipt belongs to the configured chain (replay protection).
     */
    public function assertReceiptOnConfiguredChain(array $receipt): ?string
    {
        if (!isset($receipt['transactionHash'])) {
            return 'Transaction receipt is incomplete';
        }

        // eth_getTransactionReceipt does not always include chainId; cross-check via eth_chainId
        try {
            $hex = $this->rpc('eth_chainId', []);
            if (is_string($hex) && $hex !== '') {
                $remote = hexdec($hex);
                if ($remote !== $this->chainId) {
                    return 'RPC chain ID mismatch — refusing to accept transaction from another network';
                }
            }
        } catch (\Throwable $e) {
            Log::warning('eth_chainId check failed', ['error' => $e->getMessage()]);
        }

        return null;
    }

    public function getCoreAddress(): string
    {
        return strtolower($this->core);
    }

    public function getTokenAddress(): string
    {
        return strtolower($this->token);
    }

    public function normalizeAddress(string $address): string
    {
        $address = strtolower(trim($address));
        if (!preg_match('/^0x[a-f0-9]{40}$/', $address)) {
            throw new RuntimeException('Invalid wallet address format');
        }
        return $address;
    }

    public function normalizeTxHash(string $hash): string
    {
        $hash = strtolower(trim($hash));
        if (!preg_match('/^0x[a-f0-9]{64}$/', $hash)) {
            throw new RuntimeException('Invalid transaction hash format');
        }
        return $hash;
    }

    /**
     * JSON-RPC call to the configured RPC endpoint.
     */
    public function rpc(string $method, array $params = [])
    {
        if ($this->rpc === '') {
            throw new RuntimeException('BLOCKCHAIN_RPC is not configured');
        }

        $response = Http::timeout(45)->retry(2, 400)->post($this->rpc, [
            'jsonrpc' => '2.0',
            'id' => 1,
            'method' => $method,
            'params' => $params,
        ]);

        if (!$response->successful()) {
            throw new RuntimeException('RPC request failed: HTTP ' . $response->status());
        }

        $json = $response->json();
        if (isset($json['error'])) {
            throw new RuntimeException('RPC error: ' . ($json['error']['message'] ?? json_encode($json['error'])));
        }

        return $json['result'] ?? null;
    }

    public function getTransactionReceipt(string $txHash): ?array
    {
        $result = $this->rpc('eth_getTransactionReceipt', [$txHash]);
        return is_array($result) ? $result : null;
    }

    public function getTransaction(string $txHash): ?array
    {
        $result = $this->rpc('eth_getTransactionByHash', [$txHash]);
        return is_array($result) ? $result : null;
    }

    public function getBlockNumber(): int
    {
        $hex = $this->rpc('eth_blockNumber', []);
        return is_string($hex) ? hexdec($hex) : 0;
    }

    /**
     * eth_getLogs wrapper. Returns list of log objects or null on RPC failure.
     *
     * @param  array<string,mixed>  $filter
     * @return list<array<string,mixed>>|null
     */
    public function getLogs(array $filter): ?array
    {
        $result = $this->rpc('eth_getLogs', [$filter]);
        return is_array($result) ? $result : null;
    }

    protected function assertSuccessfulReceipt(
        array $receipt,
        string $expectedFrom,
        string $label,
        ?string $expectedTo = null
    ): ?string {
        if ($err = $this->assertReceiptOnConfiguredChain($receipt)) {
            return $err;
        }

        $status = $receipt['status'] ?? null;
        if ($status !== '0x1' && $status !== 1 && $status !== '1') {
            return $label . ' failed on-chain';
        }

        $to = strtolower((string) ($receipt['to'] ?? ''));
        $expectedTo = strtolower($expectedTo ?: $this->getCoreAddress());
        if ($expectedTo !== '' && $to !== $expectedTo) {
            return $label . ' was not sent to the expected contract';
        }

        // Cross-check the sender from the raw transaction when available
        $txHash = $receipt['transactionHash'] ?? null;
        if (is_string($txHash)) {
            $tx = $this->getTransaction($txHash);
            if (is_array($tx)) {
                $from = strtolower((string) ($tx['from'] ?? ''));
                if ($from !== '' && $from !== strtolower($expectedFrom)) {
                    return $label . ' sender does not match connected wallet';
                }

                // Prefer chainId from the raw tx when present (EIP-155)
                if (isset($tx['chainId'])) {
                    $txChain = is_string($tx['chainId'])
                        ? hexdec($tx['chainId'])
                        : (int) $tx['chainId'];
                    if ($txChain > 0 && $txChain !== $this->chainId) {
                        return $label . ' was mined on a different chain';
                    }
                }
            }
        }

        return null;
    }

    /**
     * Verify ERC-20 approve(spender=core) receipt + Approval event.
     *
     * @return array{ok:bool,error?:string,txHash?:string,blockNumber?:int,amountHex?:string}
     */
    public function verifyApprovalTransaction(
        string $txHash,
        string $expectedWallet,
        ?string $minAmountWei = null
    ): array {
        try {
            if ($this->token === '' || $this->core === '') {
                return ['ok' => false, 'error' => 'Token/core contracts are not configured'];
            }

            $txHash = $this->normalizeTxHash($txHash);
            $expectedWallet = $this->normalizeAddress($expectedWallet);
            $spender = $this->getCoreAddress();
            $token = $this->getTokenAddress();

            $receipt = $this->getTransactionReceipt($txHash);
            if ($receipt === null) {
                return ['ok' => false, 'error' => 'Approval transaction not found or not yet mined'];
            }

            if ($err = $this->assertSuccessfulReceipt($receipt, $expectedWallet, 'Approval transaction', $token)) {
                return ['ok' => false, 'error' => $err];
            }

            $found = false;
            $amountHex = null;
            $ownerTopic = '0x' . str_pad(substr($expectedWallet, 2), 64, '0', STR_PAD_LEFT);
            $spenderTopic = '0x' . str_pad(substr($spender, 2), 64, '0', STR_PAD_LEFT);

            foreach (($receipt['logs'] ?? []) as $log) {
                if (strtolower((string) ($log['address'] ?? '')) !== $token) {
                    continue;
                }

                $topics = $log['topics'] ?? [];
                if (($topics[0] ?? '') !== self::ERC20_APPROVAL_TOPIC) {
                    continue;
                }
                if (count($topics) < 3) {
                    continue;
                }

                if (strtolower((string) $topics[1]) !== $ownerTopic) {
                    continue;
                }
                if (strtolower((string) $topics[2]) !== $spenderTopic) {
                    continue;
                }

                $data = substr((string) ($log['data'] ?? '0x'), 2);
                if (strlen($data) < 64) {
                    return ['ok' => false, 'error' => 'Approval event data is incomplete'];
                }

                $amountHex = '0x' . substr($data, 0, 64);

                if ($minAmountWei !== null && $minAmountWei !== '') {
                    if (!BigInteger::gte('0x' . substr($data, 0, 64), $minAmountWei)) {
                        return ['ok' => false, 'error' => 'Approved amount is below package payment'];
                    }
                }

                $found = true;
                break;
            }

            if (!$found) {
                return ['ok' => false, 'error' => 'Approval event not found for wallet → core'];
            }

            return [
                'ok' => true,
                'txHash' => $txHash,
                'blockNumber' => isset($receipt['blockNumber']) ? hexdec($receipt['blockNumber']) : 0,
                'amountHex' => $amountHex,
            ];
        } catch (\Throwable $e) {
            Log::error('verifyApprovalTransaction failed', ['error' => $e->getMessage()]);
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Verify BTCPlanCore.register(sponsor) from chain receipt + UserRegistered event.
     *
     * @return array{ok:bool,error?:string,wallet?:string,sponsor?:string,blockNumber?:int,txHash?:string}
     */
    public function verifyRegistrationTransaction(
        string $txHash,
        string $expectedWallet,
        string $expectedSponsor
    ): array {
        try {
            if ($this->core === '') {
                return ['ok' => false, 'error' => 'CORE_CONTRACT is not configured'];
            }

            $txHash = $this->normalizeTxHash($txHash);
            $expectedWallet = $this->normalizeAddress($expectedWallet);
            $expectedSponsor = $this->normalizeAddress($expectedSponsor);

            $receipt = $this->getTransactionReceipt($txHash);
            if ($receipt === null) {
                return ['ok' => false, 'error' => 'Registration transaction not found or not yet mined'];
            }

            if ($err = $this->assertSuccessfulReceipt($receipt, $expectedWallet, 'Registration transaction')) {
                return ['ok' => false, 'error' => $err];
            }

            $found = false;
            $decodedSponsor = null;

            foreach (($receipt['logs'] ?? []) as $log) {
                $logAddress = strtolower((string) ($log['address'] ?? ''));
                if ($logAddress !== $this->getCoreAddress()) {
                    continue;
                }

                $topics = $log['topics'] ?? [];
                if (($topics[0] ?? '') !== self::USER_REGISTERED_TOPIC) {
                    continue;
                }
                if (count($topics) < 3) {
                    continue;
                }

                $user = $this->normalizeAddress('0x' . substr($topics[1], -40));
                $sponsor = $this->normalizeAddress('0x' . substr($topics[2], -40));

                if ($user !== $expectedWallet) {
                    continue;
                }

                if ($sponsor !== $expectedSponsor) {
                    return ['ok' => false, 'error' => 'Sponsor in UserRegistered event does not match referral wallet'];
                }

                $found = true;
                $decodedSponsor = $sponsor;
                break;
            }

            if (!$found) {
                return ['ok' => false, 'error' => 'UserRegistered event not found for this wallet'];
            }

            $blockNumber = isset($receipt['blockNumber']) ? hexdec($receipt['blockNumber']) : 0;

            return [
                'ok' => true,
                'wallet' => $expectedWallet,
                'sponsor' => $decodedSponsor,
                'blockNumber' => $blockNumber,
                'txHash' => $txHash,
            ];
        } catch (\Throwable $e) {
            Log::error('verifyRegistrationTransaction failed', ['error' => $e->getMessage()]);
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Verify BTCPlanCore.activatePackage(amount) via PackageActivated event.
     */
    public function verifyPackageActivation(
        string $txHash,
        string $expectedWallet,
        int $expectedPackageAmount
    ): array {
        try {
            if ($this->core === '') {
                return ['ok' => false, 'error' => 'CORE_CONTRACT is not configured'];
            }

            $txHash = $this->normalizeTxHash($txHash);
            $expectedWallet = $this->normalizeAddress($expectedWallet);

            $receipt = $this->getTransactionReceipt($txHash);
            if ($receipt === null) {
                return ['ok' => false, 'error' => 'Package transaction not found or not yet mined'];
            }

            if ($err = $this->assertSuccessfulReceipt($receipt, $expectedWallet, 'Package transaction')) {
                return ['ok' => false, 'error' => $err];
            }

            $found = false;
            $cycle = null;
            $tokenAmount = null;

            foreach (($receipt['logs'] ?? []) as $log) {
                if (strtolower((string) ($log['address'] ?? '')) !== $this->getCoreAddress()) {
                    continue;
                }

                $topics = $log['topics'] ?? [];
                if (($topics[0] ?? '') !== self::PACKAGE_ACTIVATED_TOPIC) {
                    continue;
                }
                if (count($topics) < 2) {
                    continue;
                }

                $user = $this->normalizeAddress('0x' . substr($topics[1], -40));
                if ($user !== $expectedWallet) {
                    continue;
                }

                // data = packageAmount + packageCycle + tokenAmount (each 32 bytes)
                $data = substr((string) ($log['data'] ?? '0x'), 2);
                if (strlen($data) < 192) {
                    return ['ok' => false, 'error' => 'PackageActivated event data is incomplete'];
                }

                $amount = hexdec(substr($data, 0, 64));
                $cycle = hexdec(substr($data, 64, 64));
                $tokenAmount = '0x' . substr($data, 128, 64);

                if ($amount !== $expectedPackageAmount) {
                    return ['ok' => false, 'error' => 'Package amount mismatch on-chain'];
                }

                $found = true;
                break;
            }

            if (!$found) {
                return ['ok' => false, 'error' => 'PackageActivated event not found'];
            }

            return [
                'ok' => true,
                'txHash' => $txHash,
                'blockNumber' => isset($receipt['blockNumber']) ? hexdec($receipt['blockNumber']) : 0,
                'packageAmount' => $expectedPackageAmount,
                'packageCycle' => $cycle,
                'tokenAmountHex' => $tokenAmount,
            ];
        } catch (\Throwable $e) {
            Log::error('verifyPackageActivation failed', ['error' => $e->getMessage()]);
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Alias — DB hint for next eligible package (see getNextEligiblePackageHint).
     */
    public function getNextEligiblePackage(?User $user): array
    {
        return $this->getNextEligiblePackageHint($user);
    }

    /**
     * DB-side hint for the next eligible package (mirrors BTCPlanCore.getNextEligiblePackage).
     * Uses last mirrored activation / user.package_* columns — not a live chain call.
     *
     * @return array{amount:int,cycle:int,source:string,last_amount?:int|null,last_cycle?:int|null}
     */
    public function getNextEligiblePackageHint(?User $user): array
    {
        $ladder = [50, 100, 300, 500, 1000, 3000, 5000, 10000];

        if ($user === null) {
            return ['amount' => 50, 'cycle' => 1, 'source' => 'default', 'last_amount' => null, 'last_cycle' => null];
        }

        $lastAmount = null;
        $lastCycle = null;

        if (Schema::hasTable('blockchain_package_activations')) {
            $last = BlockchainPackageActivation::where('user_id', $user->id)
                ->orderByDesc('id')
                ->first();
            if ($last !== null) {
                $lastAmount = (int) $last->package_amount;
                $lastCycle = $last->package_cycle !== null ? (int) $last->package_cycle : null;
            }
        }

        if ($lastAmount === null || $lastAmount <= 0) {
            $lastAmount = (int) ($user->package_amount ?: $user->package_id ?: 0);
        }
        if ($lastCycle === null || $lastCycle <= 0) {
            $lastCycle = (int) ($user->package_cycle ?? 0);
        }

        // New / never activated
        if ($lastAmount <= 0) {
            return [
                'amount' => 50,
                'cycle' => 1,
                'source' => 'db_hint',
                'last_amount' => null,
                'last_cycle' => null,
            ];
        }

        // Cycle 1 → same amount cycle 2
        if ($lastCycle <= 1) {
            return [
                'amount' => $lastAmount,
                'cycle' => 2,
                'source' => 'db_hint',
                'last_amount' => $lastAmount,
                'last_cycle' => $lastCycle ?: 1,
            ];
        }

        // After cycle 2 at max package → unlimited 10000 C2
        $max = $ladder[count($ladder) - 1];
        if ($lastAmount >= $max) {
            return [
                'amount' => $max,
                'cycle' => 2,
                'source' => 'db_hint',
                'last_amount' => $lastAmount,
                'last_cycle' => $lastCycle,
            ];
        }

        // Advance to next ladder amount, cycle 1
        $nextAmount = $max;
        foreach ($ladder as $idx => $amt) {
            if ($amt === $lastAmount && isset($ladder[$idx + 1])) {
                $nextAmount = $ladder[$idx + 1];
                break;
            }
            if ($amt > $lastAmount) {
                $nextAmount = $amt;
                break;
            }
        }

        return [
            'amount' => $nextAmount,
            'cycle' => 1,
            'source' => 'db_hint',
            'last_amount' => $lastAmount,
            'last_cycle' => $lastCycle,
        ];
    }
}
