<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('blockchain_sync_cursors')) {
            Schema::create('blockchain_sync_cursors', function (Blueprint $table) {
                $table->id();
                $table->string('name', 64)->unique();
                $table->unsignedBigInteger('last_block')->default(0);
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('blockchain_sync_cursors');
    }
};
