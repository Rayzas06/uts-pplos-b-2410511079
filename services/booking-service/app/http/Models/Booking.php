<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Booking extends Model {
    protected $fillable = [
        'user_id','field_id','slot_id','status',
        'dp_amount','total_amount','booking_date',
        'time_start','time_end','notes'
    ];

    public function user() {
        return $this->belongsTo(User::class);
    }

    public function payments() {
        return $this->hasMany(Payment::class);
    }

    public function slots() {
        return $this->hasMany(BookingSlot::class);
    }

    public function review() {
        return $this->hasOne(Review::class);
    }
}