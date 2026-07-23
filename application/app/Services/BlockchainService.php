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
        return [
            'rpc' => $this->rpc,
            'chainId' => $this->chainId,
            'core' => $this->core,
            'token' => $this->token,
            'treasury' => $this->treasury,
            'reward' => $this->reward,
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

    /**
     * JSON-RPC call to the configured RPC endpoint.
     */
    public function rpc(string $method, array $params = [])
    {
        if ($this->rpc === '') {
            throw new RuntimeException('BLOCKCHAIN_RPC is not configured');
        }

        $response = Http::timeout(30)->post($this->rpc, [
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
     * Verify a BTCPlanCore.register(sponsor) transaction from the chain.
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

            $receipt = $this->getTransactionReceipt($txHash);
            if ($receipt === null) {
                return ['ok' => false, 'error' => 'Transaction not found or not yet mined'];
            }

            $status = $receipt['status'] ?? null;
            if ($status !== '0x1' && $status !== 1 && $status !== '1') {
                return ['ok' => false, 'error' => 'Transaction failed on-chain'];
            }

            $to = strtolower((string) ($receipt['to'] ?? ''));
            if ($to !== $this->getCoreAddress()) {
                return ['ok' => false, 'error' => 'Transaction was not sent to the registration contract'];
            }

            $expectedWallet = strtolower($expectedWallet);
            $expectedSponsor = strtolower($expectedSponsor);
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

                $user = '0x' . substr($topics[1], -40);
                $sponsor = '0x' . substr($topics[2], -40);
                $user = strtolower($user);
                $sponsor = strtolower($sponsor);

                if ($user !== $expectedWallet) {
                    continue;
                }

                // Zero-address sponsor allowed for root
                if ($expectedSponsor !== '0x0000000000000000000000000000000000000000' && $sponsor !== $expectedSponsor) {
                    return ['ok' => false, 'error' => 'Sponsor in event does not match referral wallet'];
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
                'txHash' => strtolower($txHash),
            ];
        } catch (\Throwable $e) {
            Log::error('verifyRegistrationTransaction failed', ['error' => $e->getMessage()]);
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Optionally verify PackageActivated after activatePackage().
     */
    public function verifyPackageActivation(
        string $txHash,
        string $expectedWallet,
        int $expectedPackageAmount
    ): array {
        try {
            $receipt = $this->getTransactionReceipt($txHash);
            if ($receipt === null) {
                return ['ok' => false, 'error' => 'Package transaction not found'];
            }

            $status = $receipt['status'] ?? null;
            if ($status !== '0x1' && $status !== 1 && $status !== '1') {
                return ['ok' => false, 'error' => 'Package transaction failed on-chain'];
            }

            $to = strtolower((string) ($receipt['to'] ?? ''));
            if ($to !== $this->getCoreAddress()) {
                return ['ok' => false, 'error' => 'Package tx not sent to core contract'];
            }

            $expectedWallet = strtolower($expectedWallet);
            $found = false;

            foreach (($receipt['logs'] ?? []) as $log) {
                if (strtolower((string) ($log['address'] ?? '')) !== $this->getCoreAddress()) {
                    continue;
                }
                $topics = $log['topics'] ?? [];
                if (($topics[0] ?? '') !== self::PACKAGE_ACTIVATED_TOPIC) {
                    continue;
                }
                $user = strtolower('0x' . substr($topics[1], -40));
                if ($user !== $expectedWallet) {
                    continue;
                }

                // data = packageAmount (uint256) + packageCycle (uint8 padded) + tokenAmount (uint256)
                $data = substr((string) ($log['data'] ?? '0x'), 2);
                if (strlen($data) >= 64) {
                    $amount = hexdec(substr($data, 0, 64));
                    if ($amount !== $expectedPackageAmount) {
                        return ['ok' => false, 'error' => 'Package amount mismatch on-chain'];
                    }
                }

                $found = true;
                break;
            }

            if (!$found) {
                return ['ok' => false, 'error' => 'PackageActivated event not found'];
            }

            return [
                'ok' => true,
                'txHash' => strtolower($txHash),
                'blockNumber' => isset($receipt['blockNumber']) ? hexdec($receipt['blockNumber']) : 0,
            ];
        } catch (\Throwable $e) {
            Log::error('verifyPackageActivation failed', ['error' => $e->getMessage()]);
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }
}
