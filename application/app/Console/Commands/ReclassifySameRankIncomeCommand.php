<?php

namespace App\Console\Commands;

use App\Models\EarningWallet;
use App\Services\BlockchainIncomeIndexer;
use Illuminate\Console\Command;

/**
 * One-time ledger repair: Same Rank rows were historically stored as earning_type=5 (Rank).
 * Move description-matched same-rank mirrors to earning_type=7 so Rank / Same Rank pages stay isolated.
 */
class ReclassifySameRankIncomeCommand extends Command
{
    protected $signature = 'blockchain:reclassify-same-rank {--dry-run : Preview without writing}';

    protected $description = 'Move same-rank ewallet_logs from type 5 (Rank) to type 7 (Same Rank)';

    public function handle(): int
    {
        $query = EarningWallet::query()
            ->where('earning_type', BlockchainIncomeIndexer::TYPE_RANK)
            ->where(function ($q) {
                $q->where('description', 'like', '%same-rank%')
                    ->orWhere('description', 'like', '%same rank%')
                    ->orWhere('description', 'like', '%Same Rank%');
            });

        $count = (clone $query)->count();
        $this->info("Matching same-rank rows currently on type 5: {$count}");

        if ($this->option('dry-run')) {
            $this->warn('Dry run — no changes written.');
            return self::SUCCESS;
        }

        if ($count === 0) {
            $this->info('Nothing to reclassify.');
            return self::SUCCESS;
        }

        $updated = $query->update([
            'earning_type' => BlockchainIncomeIndexer::TYPE_SAME_RANK,
        ]);

        $this->info("Updated {$updated} row(s) to earning_type=" . BlockchainIncomeIndexer::TYPE_SAME_RANK);

        return self::SUCCESS;
    }
}
