<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('users') || !Schema::hasColumn('users', 'package_tx_hash')) {
            return;
        }

        $rows = Schema::getConnection()->select(
            "SELECT 1 AS ok FROM information_schema.statistics
             WHERE table_schema = DATABASE()
               AND table_name = 'users'
               AND index_name = 'users_package_tx_hash_unique'
             LIMIT 1"
        );

        if (count($rows) > 0) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->unique('package_tx_hash', 'users_package_tx_hash_unique');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('users')) {
            return;
        }

        try {
            Schema::table('users', function (Blueprint $table) {
                $table->dropUnique('users_package_tx_hash_unique');
            });
        } catch (\Throwable $e) {
            // index may not exist
        }
    }
};
