<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'transaction_hash')) {
                $table->string('transaction_hash', 80)->nullable()->unique()->after('wallet_addr');
            }
            if (!Schema::hasColumn('users', 'package_tx_hash')) {
                $table->string('package_tx_hash', 80)->nullable()->after('transaction_hash');
            }
            if (!Schema::hasColumn('users', 'chain_id')) {
                $table->unsignedInteger('chain_id')->nullable()->after('package_tx_hash');
            }
            if (!Schema::hasColumn('users', 'package_id')) {
                $table->unsignedBigInteger('package_id')->nullable()->after('kit_id');
            }
            if (!Schema::hasColumn('users', 'registration_block')) {
                $table->unsignedBigInteger('registration_block')->nullable()->after('chain_id');
            }
            if (!Schema::hasColumn('users', 'registration_timestamp')) {
                $table->timestamp('registration_timestamp')->nullable()->after('registration_block');
            }
            if (!Schema::hasColumn('users', 'wallet_status')) {
                $table->string('wallet_status', 32)->nullable()->default('unverified')->after('registration_timestamp');
            }
            if (!Schema::hasColumn('users', 'registration_status')) {
                $table->string('registration_status', 32)->nullable()->default('pending')->after('wallet_status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $cols = [
                'transaction_hash',
                'package_tx_hash',
                'chain_id',
                'package_id',
                'registration_block',
                'registration_timestamp',
                'wallet_status',
                'registration_status',
            ];
            foreach ($cols as $col) {
                if (Schema::hasColumn('users', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
