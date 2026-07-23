<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

/**
 * Apply database/sql/REPAIR_ALL_MIGRATIONS.sql then run pending migrations.
 * Safe: does not drop tables or delete data.
 */
class RepairMigrationsCommand extends Command
{
    protected $signature = 'migrate:repair
                            {--sql= : Path to repair SQL (default: database/sql/REPAIR_ALL_MIGRATIONS.sql)}
                            {--dry-run : Only show planned actions, do not execute}';

    protected $description = 'Repair out-of-sync migration history against the live MySQL schema (no data loss)';

    public function handle(): int
    {
        $path = $this->option('sql')
            ?: database_path('sql/REPAIR_ALL_MIGRATIONS.sql');

        if (!File::exists($path)) {
            $this->error('Repair SQL not found: ' . $path);
            return self::FAILURE;
        }

        if ($this->option('dry-run')) {
            $this->warn('Dry-run: would execute ' . $path);
            $this->line('Then: php artisan migrate');
            return self::SUCCESS;
        }

        $this->info('Applying repair SQL: ' . $path);
        $sql = File::get($path);

        // Strip DELIMITER directives — PDO/mysqli multi-query handles procedures via raw connection
        $sql = preg_replace('/^DELIMITER .*$/m', '', $sql);

        try {
            DB::unprepared($sql);
        } catch (\Throwable $e) {
            $this->error('Repair SQL failed: ' . $e->getMessage());
            $this->line('You can also run the SQL file directly with the mysql client.');
            return self::FAILURE;
        }

        $this->info('Repair SQL applied. Running pending migrations…');
        $this->call('migrate', ['--force' => true]);
        $this->call('migrate:status');

        $this->info('Migration system repaired.');
        return self::SUCCESS;
    }
}
