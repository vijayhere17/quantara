<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('users')) {
            return;
        }

        if (!Schema::hasColumn('users', 'booster_evaluated_at')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dateTime('booster_evaluated_at')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'booster_evaluated_at')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('booster_evaluated_at');
            });
        }
    }
};
