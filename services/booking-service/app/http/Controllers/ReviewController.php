<?php
namespace App\Http\Controllers;

use App\Http\Requests\StoreReviewRequest;
use App\Models\Booking;
use App\Models\Review;
use Illuminate\Http\Request;

class ReviewController extends Controller {

    // POST /bookings/:id/review
    public function store(StoreReviewRequest $request, int $id) {
        $user    = $request->auth_user;
        $booking = Booking::where('id', $id)->where('user_id', $user['id'])->first();

        if (!$booking) {
            return response()->json(['success' => false, 'message' => 'Booking tidak ditemukan.'], 404);
        }

        if ($booking->status !== 'completed' && $booking->status !== 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'Hanya booking yang sudah selesai/lunas yang bisa di-review.'
            ], 409);
        }

        if ($booking->review) {
            return response()->json(['success' => false, 'message' => 'Booking ini sudah di-review.'], 409);
        }

        $review = Review::create([
            'booking_id' => $booking->id,
            'user_id'    => $user['id'],
            'rating'     => $request->rating,
            'comment'    => $request->comment,
        ]);

        return response()->json(['success' => true, 'message' => 'Review berhasil dikirim.', 'data' => $review], 201);
    }
}