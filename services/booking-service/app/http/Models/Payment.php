<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model {
    protected $fillable = ['booking_id','type','amount','payment_method','paid_at'];

    public function booking() {
        return $this->belongsTo(Booking::class);
    }
}