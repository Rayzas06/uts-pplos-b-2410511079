<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->onDelete('cascade');
            $table->unsignedBigInteger('slot_id');
            $table->date('date');
            $table->time('time_start');
            $table->time('time_end');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_slots');
    }
};
