<?php

namespace App\Console\Commands;

use App\Models\RoiTierMaster;
use App\Models\StakeMaster;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

/**
 * Local / testing CAT seed — does NOT invent blockchain tx hashes.
 * Creates root sponsor + package kits so MetaMask registration can proceed.
 */
class SeedDemoQaCommand extends Command
{
    protected $signature = 'quantara:seed-demo-qa
                            {--wallet=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 : Root sponsor wallet (Hardhat #0)}
                            {--force : Allow outside local/testing}';

    protected $description = 'Seed root sponsor + package kits for client acceptance testing (local/testing only)';

    public function handle(): int
    {
        if (!app()->environment(['local', 'testing']) && !$this->option('force')) {
            $this->error('Refusing to seed outside local/testing. Pass --force only for dedicated QA DBs.');
            return self::FAILURE;
        }

        $wallet = strtolower(trim((string) $this->option('wallet')));
        if (!preg_match('/^0x[a-f0-9]{40}$/', $wallet)) {
            $this->error('Invalid --wallet address.');
            return self::FAILURE;
        }

        $this->seedKits();
        $this->seedRoiTiers();
        $root = $this->seedRootSponsor($wallet);

        $this->info('Demo QA seed complete.');
        $this->line('Root sponsor username/wallet: ' . $root->username);
        $this->line('Root password: QuantaraDemo#2026');
        $this->warn('Members must still register via MetaMask (register → approve → activate). No fake tx hashes.');

        return self::SUCCESS;
    }

    protected function seedRootSponsor(string $wallet): User
    {
        $existing = User::whereRaw('LOWER(wallet_addr) = ?', [$wallet])
            ->orWhereRaw('LOWER(username) = ?', [$wallet])
            ->first();

        if ($existing !== null) {
            $this->line('Root sponsor already exists (id=' . $existing->id . ').');
            return $existing;
        }

        $user = new User();
        $user->firstname = 'Quantara';
        $user->lastname = 'Root';
        $user->email = 'root@quantara.local';
        $user->password = 'QuantaraDemo#2026';
        $user->username = $wallet;
        if (Schema::hasColumn('users', 'wallet_addr')) {
            $user->wallet_addr = $wallet;
        }
        if (Schema::hasColumn('users', 'wallet_status')) {
            $user->wallet_status = 'verified';
        }
        if (Schema::hasColumn('users', 'status')) {
            $user->status = 0;
        }
        if (Schema::hasColumn('users', 'package_amount')) {
            $user->package_amount = 50;
        }
        if (Schema::hasColumn('users', 'registration_status')) {
            $user->registration_status = 'completed';
        }
        $user->save();

        $this->info('Created root sponsor id=' . $user->id);
        return $user;
    }

    protected function seedKits(): void
    {
        if (!Schema::hasTable('stake_masters')) {
            $this->warn('stake_masters missing — skip kits.');
            return;
        }

        $packages = [50, 100, 300, 500, 1000, 3000, 5000, 10000];
        foreach ($packages as $amount) {
            $kit = StakeMaster::where('amount', $amount)->first();
            if ($kit !== null) {
                continue;
            }

            $kit = new StakeMaster();
            if (Schema::hasColumn('stake_masters', 'name')) {
                $kit->name = '$' . $amount . ' Package';
            }
            if (Schema::hasColumn('stake_masters', 'amount')) {
                $kit->amount = $amount;
            }
            if (Schema::hasColumn('stake_masters', 'percantage')) {
                $kit->percantage = 1;
            }
            if (Schema::hasColumn('stake_masters', 'months')) {
                $kit->months = 365;
            }
            if (Schema::hasColumn('stake_masters', 'ptype')) {
                $kit->ptype = 2;
            }
            if (Schema::hasColumn('stake_masters', 'status')) {
                $kit->status = 1;
            }
            $kit->save();
            $this->line('Created stake kit $' . $amount);
        }
    }

    protected function seedRoiTiers(): void
    {
        if (!Schema::hasTable('roi_tier_masters')) {
            return;
        }

        if (RoiTierMaster::whereRaw('daily_percent = ROUND(?, 3)', [1])->exists()) {
            return;
        }

        $tier = new RoiTierMaster();
        if (Schema::hasColumn('roi_tier_masters', 'name')) {
            $tier->name = 'Standard 1%';
        }
        if (Schema::hasColumn('roi_tier_masters', 'daily_percent')) {
            $tier->daily_percent = 1;
        }
        if (Schema::hasColumn('roi_tier_masters', 'status')) {
            $tier->status = 1;
        }
        $tier->save();
        $this->line('Created ROI tier 1%.');
    }
}
