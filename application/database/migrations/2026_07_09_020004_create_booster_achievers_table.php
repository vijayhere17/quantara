<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('booster_achievers')) {
            return;
        }

        Schema::create('booster_achievers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('member_id')->unique();
            $table->unsignedInteger('tier_directs');
            $table->decimal('bonus_percent', 5, 3);
            $table->dateTime('achieved_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booster_achievers');
    }
};
