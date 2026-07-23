<?php

namespace App\Console\Commands;

use App\Services\BlockchainIncomeIndexer;
use Illuminate\Console\Command;

class SyncBlockchainIncomeCommand extends Command
{
    protected $signature = 'blockchain:sync-income
                            {--from=0 : Start block (0 = resume cursor)}
                            {--to= : End block (default latest)}
                            {--chunk=2000 : Blocks per eth_getLogs request}';

    protected $description = 'Mirror on-chain ROI / working / rank / community income events into Laravel ledgers';

    public function handle(BlockchainIncomeIndexer $indexer): int
    {
        $from = (int) $this->option('from');
        $toOpt = $this->option('to');
        $to = ($toOpt === null || $toOpt === '') ? null : (int) $toOpt;
        $chunk = max(100, (int) $this->option('chunk'));

        $this->info('Syncing blockchain income events…');
        $result = $indexer->sync($from, $to, $chunk);

        $this->table(
            ['from', 'to', 'scanned', 'mirrored', 'errors'],
            [[$result['from'], $result['to'], $result['scanned'], $result['mirrored'], $result['errors']]]
        );

        return $result['errors'] > 0 && $result['mirrored'] === 0 ? self::FAILURE : self::SUCCESS;
    }
}
