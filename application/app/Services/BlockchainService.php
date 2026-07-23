<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
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

        return [
            'rpc' => $this->rpc,
            'chainId' => $this->chainId,
            'core' => $this->core,
            'token' => $this->token,
            'treasury' => $this->treasury,
            'reward' => $this->reward,
            // Local Hardhat demo faucet only — never true in production
            'demoFaucet' => $isLocalChain && $isLocalApp,
        ];
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

    protected function assertSuccessfulReceipt(array $receipt, string $expectedFrom, string $label): ?string
    {
        $status = $receipt['status'] ?? null;
        if ($status !== '0x1' && $status !== 1 && $status !== '1') {
            return $label . ' failed on-chain';
        }

        $to = strtolower((string) ($receipt['to'] ?? ''));
        if ($to !== $this->getCoreAddress()) {
            return $label . ' was not sent to the core contract';
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
            }
        }

        return null;
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
}
