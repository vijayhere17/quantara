<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'approve_tx_hash')) {
                $table->string('approve_tx_hash', 80)->nullable()->after('package_tx_hash');
            }
            if (!Schema::hasColumn('users', 'package_amount')) {
                $table->unsignedBigInteger('package_amount')->nullable()->after('package_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'approve_tx_hash')) {
                $table->dropColumn('approve_tx_hash');
            }
            if (Schema::hasColumn('users', 'package_amount')) {
                $table->dropColumn('package_amount');
            }
        });
    }
};
