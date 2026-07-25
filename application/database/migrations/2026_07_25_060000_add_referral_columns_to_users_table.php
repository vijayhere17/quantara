<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 1 registration requires sponsor linkage columns that the Web3
 * AuthController + User model already write, but were missing from this DB.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('users')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'referral_id')) {
                $table->unsignedBigInteger('referral_id')->nullable()->after('username')->index();
            }
            if (!Schema::hasColumn('users', 'leg')) {
                $table->string('leg', 1)->default('L')->after('referral_id');
            }
            if (!Schema::hasColumn('users', 'referral_uplines')) {
                $table->text('referral_uplines')->nullable()->after('leg');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('users')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'referral_uplines')) {
                $table->dropColumn('referral_uplines');
            }
            if (Schema::hasColumn('users', 'leg')) {
                $table->dropColumn('leg');
            }
            if (Schema::hasColumn('users', 'referral_id')) {
                $table->dropColumn('referral_id');
            }
        });
    }
};
