<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Enforce one Approval tx per package activation (never leave / reuse approve_tx_hash).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('blockchain_package_activations')) {
            return;
        }

        if (!Schema::hasColumn('blockchain_package_activations', 'approve_tx_hash')) {
            Schema::table('blockchain_package_activations', function (Blueprint $table) {
                $table->string('approve_tx_hash', 80)->nullable()->after('tx_hash');
            });
        }

        // Drop duplicate approve hashes (keep earliest row) before unique index
        try {
            DB::statement(
                'DELETE bpa1 FROM blockchain_package_activations bpa1
                 INNER JOIN blockchain_package_activations bpa2
                 WHERE bpa1.id > bpa2.id
                   AND bpa1.approve_tx_hash IS NOT NULL
                   AND bpa1.approve_tx_hash = bpa2.approve_tx_hash'
            );
        } catch (\Throwable $e) {
            // ignore if engine/syntax differs — index add may still succeed on clean DBs
        }

        $indexExists = collect(DB::select('SHOW INDEX FROM blockchain_package_activations'))
            ->contains(fn ($row) => ($row->Key_name ?? '') === 'bpa_approve_tx_hash_unique');

        if (!$indexExists) {
            Schema::table('blockchain_package_activations', function (Blueprint $table) {
                $table->unique('approve_tx_hash', 'bpa_approve_tx_hash_unique');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('blockchain_package_activations')) {
            return;
        }

        $indexExists = collect(DB::select('SHOW INDEX FROM blockchain_package_activations'))
            ->contains(fn ($row) => ($row->Key_name ?? '') === 'bpa_approve_tx_hash_unique');

        if ($indexExists) {
            Schema::table('blockchain_package_activations', function (Blueprint $table) {
                $table->dropUnique('bpa_approve_tx_hash_unique');
            });
        }
    }
};
