<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookingSlot extends Model {
    protected $fillable = ['booking_id','slot_id','date','time_start','time_end'];

    public function booking() {
        return $this->belongsTo(Booking::class);
    }
}