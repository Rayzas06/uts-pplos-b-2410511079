<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('field_id');
            $table->unsignedBigInteger('slot_id');
            $table->enum('status', ['pending','dp_paid','paid','cancelled','completed'])
                  ->default('pending');
            $table->decimal('dp_amount', 10, 2)->default(0);
            $table->decimal('total_amount', 10, 2);
            $table->date('booking_date');
            $table->time('time_start');
            $table->time('time_end');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void {
        Schema::dropIfExists('bookings');
    }
};