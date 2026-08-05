<?php

namespace App\Console\Commands;

use App\Services\BlockchainIncomeIndexer;
use Illuminate\Console\Command;

class SyncBlockchainIncomeCommand extends Command
{
    protected $signature = 'blockchain:sync-income
                            {--from=0 : Start block (0 = resume cursor)}
                            {--to= : End block (default latest)}
                            {--chunk=100 : Blocks per eth_getLogs request (keep small on public RPCs)}
                            {--recent=0 : If >0, sync only the last N blocks (ignores cursor)}';

    protected $description = 'Mirror on-chain ROI / working / rank / community income events into Laravel ledgers';

    public function handle(BlockchainIncomeIndexer $indexer): int
    {
        $from = (int) $this->option('from');
        $toOpt = $this->option('to');
        $to = ($toOpt === null || $toOpt === '') ? null : (int) $toOpt;
        $chunk = max(10, (int) $this->option('chunk'));
        $recent = max(0, (int) $this->option('recent'));

        if ($recent > 0) {
            $latest = app(\App\Services\BlockchainService::class)->getBlockNumber();
            $from = max(0, $latest - $recent);
            $to = $latest;
            $this->info("Recent mode: blocks {$from} → {$to} (last {$recent})");
        }

        $this->info('Syncing blockchain income events…');
        $result = $indexer->sync($from, $to, $chunk);

        $this->table(
            ['from', 'to', 'scanned', 'mirrored', 'errors'],
            [[$result['from'], $result['to'], $result['scanned'], $result['mirrored'], $result['errors']]]
        );

        return $result['errors'] > 0 && $result['mirrored'] === 0 ? self::FAILURE : self::SUCCESS;
    }
}
