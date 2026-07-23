<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Idempotent Web3 registration columns for users.
 * Safe to run even if earlier partial migrations already applied some fields.
 *
 * Fixes SQLSTATE[42S22] Unknown column 'approve_tx_hash' (and related) in 'users'.
 */
return new class extends Migration
{
    public function up(): void
    {
        $columns = [
            'wallet_addr' => fn (Blueprint $table) => $table->string('wallet_addr', 80)->nullable()->index(),
            'transaction_hash' => fn (Blueprint $table) => $table->string('transaction_hash', 80)->nullable()->unique(),
            'package_tx_hash' => fn (Blueprint $table) => $table->string('package_tx_hash', 80)->nullable()->unique(),
            'approve_tx_hash' => fn (Blueprint $table) => $table->string('approve_tx_hash', 80)->nullable(),
            'chain_id' => fn (Blueprint $table) => $table->unsignedInteger('chain_id')->nullable(),
            'package_id' => fn (Blueprint $table) => $table->unsignedBigInteger('package_id')->nullable(),
            'package_amount' => fn (Blueprint $table) => $table->unsignedBigInteger('package_amount')->nullable(),
            'registration_block' => fn (Blueprint $table) => $table->unsignedBigInteger('registration_block')->nullable(),
            'registration_timestamp' => fn (Blueprint $table) => $table->timestamp('registration_timestamp')->nullable(),
            'wallet_status' => fn (Blueprint $table) => $table->string('wallet_status', 32)->nullable()->default('unverified'),
            'registration_status' => fn (Blueprint $table) => $table->string('registration_status', 32)->nullable()->default('pending'),
            'activation_date' => fn (Blueprint $table) => $table->timestamp('activation_date')->nullable(),
        ];

        $missing = [];
        foreach (array_keys($columns) as $name) {
            if (!Schema::hasColumn('users', $name)) {
                $missing[] = $name;
            }
        }

        if ($missing === []) {
            return;
        }

        Schema::table('users', function (Blueprint $table) use ($columns, $missing) {
            foreach ($missing as $name) {
                $columns[$name]($table);
            }
        });
    }

    public function down(): void
    {
        // Prefer re-running ensure up() over destructive down of shared columns.
        Schema::table('users', function (Blueprint $table) {
            foreach (['approve_tx_hash', 'package_amount'] as $col) {
                if (Schema::hasColumn('users', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
