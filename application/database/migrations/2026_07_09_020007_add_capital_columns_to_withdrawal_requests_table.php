<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('withdrawal_requests')) {
            return;
        }

        Schema::table('withdrawal_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('withdrawal_requests', 'w_type')) {
                $table->tinyInteger('w_type')->default(0)->comment('0=income, 1=capital');
            }
            if (!Schema::hasColumn('withdrawal_requests', 'staked_user_id')) {
                $table->unsignedBigInteger('staked_user_id')->nullable();
            }
            if (!Schema::hasColumn('withdrawal_requests', 'charge_percent')) {
                $table->decimal('charge_percent', 5, 2)->nullable();
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('withdrawal_requests')) {
            return;
        }

        Schema::table('withdrawal_requests', function (Blueprint $table) {
            foreach (['w_type', 'staked_user_id', 'charge_percent'] as $col) {
                if (Schema::hasColumn('withdrawal_requests', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
