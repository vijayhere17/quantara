<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Blockchain sync ledger tables + optional investment columns on users.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('blockchain_package_activations')) {
            Schema::create('blockchain_package_activations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->index();
                $table->string('wallet', 80)->nullable()->index();
                $table->decimal('package_amount', 18, 8)->default(0);
                $table->unsignedInteger('package_cycle')->nullable();
                $table->string('tx_hash', 80)->unique();
                $table->string('approve_tx_hash', 80)->nullable();
                $table->unsignedBigInteger('block_number')->nullable();
                $table->string('token_amount', 80)->nullable();
                $table->string('status', 32)->default('verified');
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('blockchain_income_events')) {
            Schema::create('blockchain_income_events', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->index();
                $table->string('wallet', 80)->nullable()->index();
                $table->string('income_type', 64);
                $table->decimal('amount', 18, 8)->default(0);
                $table->string('tx_hash', 80);
                $table->unsignedInteger('log_index')->default(0);
                $table->unsignedBigInteger('block_number')->nullable();
                $table->boolean('mirrored_to_ledger')->default(false);
                $table->timestamps();

                $table->unique(['tx_hash', 'log_index'], 'blockchain_income_events_tx_log_unique');
            });
        }

        $userColumns = [
            'self_investment' => fn (Blueprint $table) => $table->decimal('self_investment', 18, 8)->default(0),
            'team_investment' => fn (Blueprint $table) => $table->decimal('team_investment', 18, 8)->default(0),
            'direct_business' => fn (Blueprint $table) => $table->decimal('direct_business', 18, 8)->default(0),
            'total_earning' => fn (Blueprint $table) => $table->decimal('total_earning', 18, 8)->default(0),
            'total_return' => fn (Blueprint $table) => $table->decimal('total_return', 18, 8)->default(0),
            'package_cycle' => fn (Blueprint $table) => $table->unsignedInteger('package_cycle')->nullable(),
        ];

        $missing = [];
        foreach (array_keys($userColumns) as $name) {
            if (!Schema::hasColumn('users', $name)) {
                $missing[] = $name;
            }
        }

        if ($missing !== []) {
            Schema::table('users', function (Blueprint $table) use ($userColumns, $missing) {
                foreach ($missing as $name) {
                    $userColumns[$name]($table);
                }
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('blockchain_income_events');
        Schema::dropIfExists('blockchain_package_activations');

        Schema::table('users', function (Blueprint $table) {
            foreach (['package_cycle'] as $col) {
                if (Schema::hasColumn('users', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
