<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('staked_users')) {
            return;
        }

        Schema::table('staked_users', function (Blueprint $table) {
            if (!Schema::hasColumn('staked_users', 'roi_tier_id')) {
                $table->unsignedBigInteger('roi_tier_id')->nullable();
            }
            if (!Schema::hasColumn('staked_users', 'capital_withdrawn_at')) {
                $table->dateTime('capital_withdrawn_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('staked_users')) {
            return;
        }

        Schema::table('staked_users', function (Blueprint $table) {
            foreach (['roi_tier_id', 'capital_withdrawn_at'] as $col) {
                if (Schema::hasColumn('staked_users', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
