<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Pulls on-chain income events (ROI / working / ranks / community) into Laravel ledgers.
 * Blockchain remains source of truth — this only mirrors verified logs.
 */
class BlockchainIncomeIndexer
{
    public const ROI_CLAIMED = '0x10985303ad4f76ed2e3c2ab546caf0873a9e50f3beba0ddbd74c9e470a2eac46';
    public const SELF_ROI_PAID = '0xf18ba4284b4540d5f6d84af8d18b0e62570cfddd2430469888832376244aad3a';
    public const WORKING_INCOME_PAID = '0x68d470beb73914748134148c799202c0b949e4d76e013119d0dc1624db31f78b';
    public const CONTRIBUTION_REWARD_PAID = '0x627c4db3b78ca7850be59dab7c61f1a05b2eb2e0400470be17678786d6ba39c8';
    public const BOOSTER_REWARD_PAID = '0x4e02c9842ae7a5f6f9264d38906bae2b8fa3156d23f72cff5b665e98fea808c3';
    public const RANK_INCOME_PAID = '0x6c353bf59f3d7abdb89c30ee5e19919e869696a7d7e08f84d9baa3150ce0505e';
    public const SAME_RANK_INCOME_PAID = '0x0a3c009cdab9147513460e1519da0bc0fa49fd513919a6d1685f95fe9a23850b';
    public const SAME_RANK_ACHIEVEMENT_PAID = '0x6bfa1a7ccc8daa29c28b00ace780fa3333964235ecb5477d092b93e127300d69';
    public const COMMUNITY_REWARD_CLAIMED = '0xe3e2aa57d5d3d9d0b7afa64d7ee63575c0f92cac3de1eb5244ce6d7c73bbcc3c';
    public const COMMUNITY_BUILDER_PAID = '0xd6a493edc88a5968d99e646d50b6720e06f04f0438eb4105f78d9183f6b1651e';

    public function __construct(
        protected BlockchainService $blockchain,
        protected BlockchainLedgerService $ledger
    ) {
    }

    /**
     * @return array{scanned:int,mirrored:int,from:int,to:int,errors:int}
     */
    public function sync(int $fromBlock = 0, ?int $toBlock = null, int $chunk = 2_000): array
    {
        $latest = $this->blockchain->getBlockNumber();
        $toBlock = $toBlock ?? $latest;
        if ($fromBlock <= 0) {
            $fromBlock = max(0, $this->getCursor() - 5);
        }
        if ($toBlock < $fromBlock) {
            return ['scanned' => 0, 'mirrored' => 0, 'from' => $fromBlock, 'to' => $toBlock, 'errors' => 0];
        }

        $topics = [
            self::ROI_CLAIMED,
            self::SELF_ROI_PAID,
            self::WORKING_INCOME_PAID,
            self::CONTRIBUTION_REWARD_PAID,
            self::BOOSTER_REWARD_PAID,
            self::RANK_INCOME_PAID,
            self::SAME_RANK_INCOME_PAID,
            self::SAME_RANK_ACHIEVEMENT_PAID,
            self::COMMUNITY_REWARD_CLAIMED,
            self::COMMUNITY_BUILDER_PAID,
        ];

        $scanned = 0;
        $mirrored = 0;
        $errors = 0;
        $cursor = $fromBlock;

        while ($cursor <= $toBlock) {
            $end = min($cursor + $chunk - 1, $toBlock);
            $logs = $this->blockchain->getLogs([
                'fromBlock' => '0x' . dechex($cursor),
                'toBlock' => '0x' . dechex($end),
                'topics' => [$topics],
            ]);

            if (!is_array($logs)) {
                $errors++;
                Log::warning('Income indexer getLogs failed', ['from' => $cursor, 'to' => $end]);
                $cursor = $end + 1;
                continue;
            }

            foreach ($logs as $index => $log) {
                $scanned++;
                try {
                    if ($this->mirrorLog($log, is_int($index) ? $index : 0)) {
                        $mirrored++;
                    }
                } catch (\Throwable $e) {
                    $errors++;
                    Log::warning('Income indexer mirror failed', ['error' => $e->getMessage()]);
                }
            }

            $this->setCursor($end);
            $cursor = $end + 1;
        }

        return [
            'scanned' => $scanned,
            'mirrored' => $mirrored,
            'from' => $fromBlock,
            'to' => $toBlock,
            'errors' => $errors,
        ];
    }

    /**
     * @param  array<string,mixed>  $log
     */
    protected function mirrorLog(array $log, int $fallbackIndex): bool
    {
        $topic0 = strtolower((string) (($log['topics'][0] ?? '')));
        $txHash = strtolower((string) ($log['transactionHash'] ?? ''));
        $logIndex = isset($log['logIndex']) ? hexdec((string) $log['logIndex']) : $fallbackIndex;
        $blockNumber = isset($log['blockNumber']) ? hexdec((string) $log['blockNumber']) : null;

        $meta = $this->decodeIncomeLog($topic0, $log);
        if ($meta === null || $txHash === '') {
            return false;
        }

        $wallet = $meta['wallet'];
        $user = User::whereRaw('LOWER(wallet_addr) = ?', [$wallet])
            ->orWhereRaw('LOWER(username) = ?', [$wallet])
            ->first();

        if ($user === null) {
            return false;
        }

        $usd = $this->tokenWeiToUsd($meta['amountWei']);
        if ($usd <= 0) {
            return false;
        }

        $result = $this->ledger->recordIncomeMirror(
            $user->id,
            $meta['earningType'],
            $usd,
            $txHash,
            $meta['description'],
            $logIndex,
            $blockNumber,
            $wallet
        );

        return $result !== null;
    }

    /**
     * @param  array<string,mixed>  $log
     * @return array{wallet:string,amountWei:string,earningType:int,description:string}|null
     */
    protected function decodeIncomeLog(string $topic0, array $log): ?array
    {
        $topics = $log['topics'] ?? [];
        $data = substr((string) ($log['data'] ?? '0x'), 2);

        $map = [
            self::ROI_CLAIMED => ['earningType' => 2, 'label' => 'On-chain ROI claim', 'userTopic' => 1, 'amountWord' => 0],
            self::SELF_ROI_PAID => ['earningType' => 2, 'label' => 'On-chain self ROI', 'userTopic' => 1, 'amountWord' => 0],
            self::WORKING_INCOME_PAID => ['earningType' => 1, 'label' => 'On-chain working income', 'userTopic' => 1, 'amountWord' => 0],
            self::CONTRIBUTION_REWARD_PAID => ['earningType' => 1, 'label' => 'On-chain contribution reward', 'userTopic' => 1, 'amountWord' => 1],
            self::BOOSTER_REWARD_PAID => ['earningType' => 8, 'label' => 'On-chain booster reward', 'userTopic' => 1, 'amountWord' => 0],
            self::RANK_INCOME_PAID => ['earningType' => 5, 'label' => 'On-chain rank income', 'userTopic' => 1, 'amountWord' => 0],
            self::SAME_RANK_INCOME_PAID => ['earningType' => 5, 'label' => 'On-chain same-rank income', 'userTopic' => 1, 'amountWord' => 0],
            self::SAME_RANK_ACHIEVEMENT_PAID => ['earningType' => 5, 'label' => 'On-chain same-rank achievement', 'userTopic' => 1, 'amountWord' => 1],
            self::COMMUNITY_REWARD_CLAIMED => ['earningType' => 4, 'label' => 'On-chain community reward', 'userTopic' => 1, 'amountWord' => 0],
            self::COMMUNITY_BUILDER_PAID => ['earningType' => 4, 'label' => 'On-chain community builder', 'userTopic' => 1, 'amountWord' => 0],
        ];

        if (!isset($map[$topic0])) {
            return null;
        }

        $cfg = $map[$topic0];
        $userTopic = $topics[$cfg['userTopic']] ?? null;
        if (!is_string($userTopic) || strlen($userTopic) < 40) {
            return null;
        }

        $wallet = '0x' . substr($userTopic, -40);
        $amountOffset = $cfg['amountWord'] * 64;
        if (strlen($data) < $amountOffset + 64) {
            return null;
        }

        $amountWei = '0x' . substr($data, $amountOffset, 64);

        return [
            'wallet' => strtolower($wallet),
            'amountWei' => $amountWei,
            'earningType' => $cfg['earningType'],
            'description' => $cfg['label'],
        ];
    }

    protected function tokenWeiToUsd(string $amountHex): float
    {
        $hex = preg_replace('/^0x/i', '', $amountHex) ?: '0';
        $wei = gmp_init($hex, 16);
        // 1e18
        $divisor = gmp_init('1000000000000000000');
        $whole = gmp_div_q($wei, $divisor);
        $frac = gmp_div_r($wei, $divisor);
        $token = (float) gmp_strval($whole) + ((float) gmp_strval($frac) / 1e18);

        $rate = function_exists('getcoinrate') ? (float) getcoinrate() : 0.0;
        if ($rate <= 0) {
            // Fallback: treat 1 token ≈ $1 for ledger mirror when feed unavailable
            $rate = 1.0;
        }

        return round($token * $rate, 8);
    }

    protected function getCursor(): int
    {
        if (!Schema::hasTable('blockchain_sync_cursors')) {
            return 0;
        }

        $row = DB::table('blockchain_sync_cursors')->where('name', 'income_events')->first();
        return $row ? (int) $row->last_block : 0;
    }

    protected function setCursor(int $block): void
    {
        if (!Schema::hasTable('blockchain_sync_cursors')) {
            return;
        }

        DB::table('blockchain_sync_cursors')->updateOrInsert(
            ['name' => 'income_events'],
            ['last_block' => $block, 'updated_at' => now(), 'created_at' => now()]
        );
    }
}
