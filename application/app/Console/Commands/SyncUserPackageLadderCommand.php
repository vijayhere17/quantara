<?php

namespace App\Console\Commands;

use App\Models\StakeMaster;
use App\Models\User;
use App\Services\BlockchainLedgerService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * QA: mark a member as having climbed the full package ladder in Laravel DB.
 *
 * On-chain unlock (npm run qa:unlock-packages:bsc-testnet) does NOT update MySQL.
 * Invest Now / dashboard read users.package_amount + package_cycle — run this after.
 *
 *   php artisan quantara:sync-package-ladder 0x4735BD... --force
 */
class SyncUserPackageLadderCommand extends Command
{
    protected $signature = 'quantara:sync-package-ladder
                            {wallet : Member wallet (0x…)}
                            {--amount=10000 : Final package USD amount}
                            {--cycle=2 : Final package cycle}
                            {--force : Allow outside local/testing}';

    protected $description = 'QA sync: set user package ladder in DB so Invest Now shows bought tiers';

    private const LADDER = [50, 100, 300, 500, 1000, 3000, 5000, 10000];

    public function handle(BlockchainLedgerService $ledger): int
    {
        if (!app()->environment(['local', 'testing']) && !$this->option('force')) {
            $this->error('Refusing outside local/testing. Pass --force for dedicated QA DBs.');
            return self::FAILURE;
        }

        $wallet = strtolower(trim((string) $this->argument('wallet')));
        if (!preg_match('/^0x[a-f0-9]{40}$/', $wallet)) {
            $this->error('Invalid wallet address.');
            return self::FAILURE;
        }

        $targetAmount = (int) $this->option('amount');
        $targetCycle = (int) $this->option('cycle');
        if (!in_array($targetAmount, self::LADDER, true)) {
            $this->error('--amount must be one of: ' . implode(', ', self::LADDER));
            return self::FAILURE;
        }
        if ($targetCycle < 1 || $targetCycle > 2) {
            $this->error('--cycle must be 1 or 2');
            return self::FAILURE;
        }

        $user = User::whereRaw('LOWER(wallet_addr) = ?', [$wallet])
            ->orWhereRaw('LOWER(username) = ?', [$wallet])
            ->first();

        if ($user === null) {
            $this->error('No Laravel user for wallet ' . $wallet);
            $this->line('Create/login that wallet first, then re-run.');
            return self::FAILURE;
        }

        $kit = null;
        if (Schema::hasTable('stake_masters')) {
            $kit = StakeMaster::where('amount', $targetAmount)->first();
        }

        $steps = $this->buildSteps($targetAmount, $targetCycle);
        $totalInvested = array_sum(array_column($steps, 'amount'));

        DB::transaction(function () use ($user, $kit, $targetAmount, $targetCycle, $totalInvested, $steps, $ledger, $wallet) {
            if ($kit !== null && Schema::hasColumn('users', 'kit_id')) {
                $user->kit_id = $kit->id;
            }
            if (Schema::hasColumn('users', 'package_id')) {
                $user->package_id = $targetAmount;
            }
            if (Schema::hasColumn('users', 'package_amount')) {
                $user->package_amount = $targetAmount;
            }
            if (Schema::hasColumn('users', 'package_cycle')) {
                $user->package_cycle = $targetCycle;
            }
            if (Schema::hasColumn('users', 'registration_status')) {
                $user->registration_status = 'completed';
            }
            if (Schema::hasColumn('users', 'activation_date') && empty($user->activation_date)) {
                $user->activation_date = now();
            }
            if (Schema::hasColumn('users', 'self_investment')) {
                $user->self_investment = $totalInvested;
            }
            $user->save();

            foreach ($steps as $step) {
                $tx = $this->qaTxHash($user->id, $step['amount'], $step['cycle'], 'pkg');
                $approve = $this->qaTxHash($user->id, $step['amount'], $step['cycle'], 'apv');
                $ledger->recordPackageActivation(
                    $user,
                    $step['amount'],
                    $tx,
                    $step['cycle'],
                    null,
                    $approve,
                    null,
                    'qa_sync'
                );
            }
        });

        $fresh = $user->fresh();
        $this->info('Package ladder synced for user id=' . $fresh->id);
        $this->line('Wallet:          ' . $wallet);
        $this->line('package_amount:  ' . ($fresh->package_amount ?? 'n/a'));
        $this->line('package_cycle:   ' . ($fresh->package_cycle ?? 'n/a'));
        $this->line('self_investment: ' . ($fresh->self_investment ?? 'n/a'));
        $this->line('Ledger steps:    ' . count($steps));
        $this->warn('Hard-refresh Invest Now. Past tiers should show Buy 2 of 2 (not Locked).');

        return self::SUCCESS;
    }

    /**
     * @return list<array{amount:int,cycle:int}>
     */
    protected function buildSteps(int $targetAmount, int $targetCycle): array
    {
        $steps = [];
        foreach (self::LADDER as $amount) {
            if ($amount < $targetAmount) {
                $steps[] = ['amount' => $amount, 'cycle' => 1];
                $steps[] = ['amount' => $amount, 'cycle' => 2];
                continue;
            }
            if ($amount === $targetAmount) {
                $steps[] = ['amount' => $amount, 'cycle' => 1];
                if ($targetCycle >= 2) {
                    $steps[] = ['amount' => $amount, 'cycle' => 2];
                }
            }
            break;
        }
        return $steps;
    }

    protected function qaTxHash(int $userId, int $amount, int $cycle, string $kind): string
    {
        // Deterministic 32-byte hex — unique per user/amount/cycle/kind (QA only).
        $raw = hash('sha256', "quantara-qa-ladder|{$userId}|{$amount}|{$cycle}|{$kind}", true);
        return '0x' . bin2hex($raw);
    }
}
