<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('turnover_reward_masters')) {
            return;
        }

        Schema::create('turnover_reward_masters', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('milestone_order')->unique();
            $table->decimal('turnover_amount', 18, 2);
            $table->decimal('cash_reward', 18, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('turnover_reward_masters');
    }
};
