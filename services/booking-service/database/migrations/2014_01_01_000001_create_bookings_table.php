<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->unsignedBigInteger('field_id');
            $table->unsignedBigInteger('slot_id')->nullable();
            $table->enum('status', ['pending', 'confirmed', 'completed', 'cancelled']);
            $table->decimal('dp_amount', 12, 2);
            $table->decimal('total_amount', 12, 2);
            $table->date('booking_date');
            $table->time('time_start');
            $table->time('time_end');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
