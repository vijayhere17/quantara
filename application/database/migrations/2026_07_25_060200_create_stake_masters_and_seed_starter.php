<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Legacy stake kit catalog required by PackageActivationService during Web3 signup.
 * Seeds the $50 Starter Package used for Phase 1 registration.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('stake_masters')) {
            Schema::create('stake_masters', function (Blueprint $table) {
                $table->id();
                $table->string('name')->nullable();
                $table->decimal('amount', 18, 2)->default(0)->index();
                $table->decimal('coin', 18, 8)->nullable();
                $table->decimal('percantage', 8, 3)->default(0);
                $table->unsignedInteger('months')->default(0);
                $table->decimal('direct_ref', 8, 2)->default(0);
                $table->decimal('bonus', 8, 2)->default(0);
                $table->decimal('limit', 18, 2)->default(0);
                $table->unsignedTinyInteger('ptype')->default(2); // ROI-style kit
                $table->unsignedTinyInteger('locking')->default(0);
                $table->unsignedTinyInteger('is_admin')->default(0);
                $table->unsignedTinyInteger('is_travel')->default(0);
                $table->decimal('dmc_commission', 8, 2)->default(0);
                $table->decimal('left_dmc', 8, 2)->default(0);
                $table->decimal('right_dmc', 8, 2)->default(0);
                $table->decimal('dmc', 8, 2)->default(0);
                $table->timestamps();
            });
        }

        $exists = DB::table('stake_masters')->where('amount', 50)->exists();
        if (!$exists) {
            DB::table('stake_masters')->insert([
                'name' => 'Starter Package',
                'amount' => 50,
                'coin' => 0,
                'percantage' => 1.000, // matches roi_tier_masters daily_percent for $50
                'months' => 0,
                'direct_ref' => 0,
                'bonus' => 0,
                'limit' => 200, // 4X income cap in USD terms (legacy field)
                'ptype' => 2,
                'locking' => 0,
                'is_admin' => 0,
                'is_travel' => 0,
                'dmc_commission' => 0,
                'left_dmc' => 0,
                'right_dmc' => 0,
                'dmc' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        // Keep table — dropping would wipe kits. Only remove the seeded starter if present.
        if (Schema::hasTable('stake_masters')) {
            DB::table('stake_masters')->where('name', 'Starter Package')->where('amount', 50)->delete();
        }
    }
};
