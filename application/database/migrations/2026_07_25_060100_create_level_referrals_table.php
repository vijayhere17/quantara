<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Level referral downline ledger used by SignupController during Web3 registration.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('level_referrals')) {
            return;
        }

        Schema::create('level_referrals', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('member_id')->index();
            $table->unsignedInteger('level')->default(1);
            $table->unsignedInteger('team_count')->default(0);
            $table->text('downlines')->nullable();
            $table->timestamps();

            $table->unique(['member_id', 'level']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('level_referrals');
    }
};
