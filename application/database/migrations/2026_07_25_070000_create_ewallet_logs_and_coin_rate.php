<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Earning ledger + BTC/USD rate used by BlockchainIncomeIndexer (token wei → USD).
 * Seed rate=60000 to match MockBTCPriceFeed used on local Hardhat.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('coin_rate_masters')) {
            Schema::create('coin_rate_masters', function (Blueprint $table) {
                $table->id();
                $table->decimal('rate', 18, 8)->default(0);
                $table->timestamps();
            });
        }

        if (DB::table('coin_rate_masters')->count() === 0) {
            DB::table('coin_rate_masters')->insert([
                'rate' => 60000,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        if (!Schema::hasTable('ewallet_logs')) {
            Schema::create('ewallet_logs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('member_id')->index();
                $table->unsignedTinyInteger('txn_type')->default(1); // 1 credit, 2 debit, 3 flush
                $table->unsignedInteger('earning_type')->default(0)->index();
                $table->text('description')->nullable();
                $table->decimal('gross_amount', 18, 8)->default(0);
                $table->decimal('admin_charge', 18, 8)->default(0);
                $table->decimal('system_charge', 18, 8)->default(0);
                $table->decimal('amount', 18, 8)->default(0);
                $table->decimal('coin_rate', 18, 8)->default(0);
                $table->decimal('coin_amount', 18, 8)->default(0);
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ewallet_logs');
        // keep coin_rate_masters
    }
};
