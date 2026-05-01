<?php
namespace App\Http\Controllers;

use App\Http\Requests\StoreBookingRequest;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\BookingSlot;
use App\Services\FieldService;
use Illuminate\Http\Request;

class BookingController extends Controller {

    public function __construct(private FieldService $fieldService) {}


    public function index(Request $request) {
        $user    = $request->auth_user ?? null;
        $perPage = (int) ($request->query('per_page', 10));
        $status  = $request->query('status');

        $query = Booking::with(['payments', 'review', 'user', 'field']);

      
        if ($user) {
            $query->where('user_id', $user['id']);
        }

        if ($status) {
            $query->where('status', $status);
        }

        $bookings = $query->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'success'     => true,
            'data'        => $bookings->items(),
            'total'       => $bookings->total(),
            'page'        => $bookings->currentPage(),
            'per_page'    => $bookings->perPage(),
            'total_pages' => $bookings->lastPage(),
        ]);
    }

    // POST /bookings
    public function store(StoreBookingRequest $request) {
        $user = $request->auth_user;
        $data = $request->validated();

        // Cek lapangan ada di field-service
        $field = $this->fieldService->getField($data['field_id']);
        if (!$field) {
            return response()->json([
                'success' => false,
                'message' => 'Lapangan tidak ditemukan di field-service.'
            ], 404);
        }

        // Hitung DP minimum, harus 50% dari total
        $dpMin = $data['total_amount'] * 0.5;
        $dp    = $data['dp_amount'] ?? $dpMin;

        // Buat booking
        $booking = Booking::create([
            'user_id'      => $user['id'],
            'field_id'     => $data['field_id'],
            'slot_id'      => $data['slot_id'],
            'status'       => 'pending',
            'dp_amount'    => $dp,
            'total_amount' => $data['total_amount'],
            'booking_date' => $data['booking_date'],
            'time_start'   => $data['time_start'],
            'time_end'     => $data['time_end'],
            'notes'        => $data['notes'] ?? null,
        ]);

        
        BookingSlot::create([
            'booking_id' => $booking->id,
            'slot_id'    => $data['slot_id'],
            'date'       => $data['booking_date'],
            'time_start' => $data['time_start'],
            'time_end'   => $data['time_end'],
        ]);

        
        $this->fieldService->markSlotUnavailable($data['slot_id']);

        return response()->json([
            'success' => true,
            'message' => 'Booking berhasil dibuat. Lakukan pembayaran DP.',
            'data'    => $booking->load('slots'),
        ], 201);
    }

// GET /bookings/:id 
    public function show(Request $request, int $id) {
        $user    = $request->auth_user ?? null;
        
        $booking = Booking::with(['payments','slots','review','user','field'])
            ->where('id', $id);
        
       
        if ($user) {
            $booking->where('user_id', $user['id']);
        }
        
        $booking = $booking->first();

        if (!$booking) {
            return response()->json(['success' => false, 'message' => 'Booking tidak ditemukan.'], 404);
        }

        return response()->json(['success' => true, 'data' => $booking]);
    }

    // PUT /bookings/:id — update status
    public function update(Request $request, int $id) {
        $user    = $request->auth_user;
        $booking = Booking::where('id', $id)->where('user_id', $user['id'])->first();

        if (!$booking) {
            return response()->json(['success' => false, 'message' => 'Booking tidak ditemukan.'], 404);
        }

        $status = $request->input('status');
        $allowed = ['cancelled'];

        if (!in_array($status, $allowed)) {
            return response()->json([
                'success' => false,
                'message' => 'Status hanya bisa diubah ke: cancelled'
            ], 422);
        }

   
        if ($status === 'cancelled') {
            $this->fieldService->markSlotAvailable($booking->slot_id);
        }

        $booking->update(['status' => $status]);

        return response()->json(['success' => true, 'message' => 'Status booking diperbarui.', 'data' => $booking]);
    }

    // DELETE /bookings/:id
    public function destroy(Request $request, int $id) {
        $user    = $request->auth_user;
        $booking = Booking::where('id', $id)->where('user_id', $user['id'])->first();

        if (!$booking) {
            return response()->json(['success' => false, 'message' => 'Booking tidak ditemukan.'], 404);
        }

        if (!in_array($booking->status, ['pending','cancelled'])) {
            return response()->json([
                'success' => false,
                'message' => 'Booking yang sudah dibayar tidak bisa dihapus.'
            ], 409);
        }

        $this->fieldService->markSlotAvailable($booking->slot_id);
        $booking->delete();

        return response()->json(['success' => true, 'message' => 'Booking dihapus.'], 204);
    }

    // POST /bookings/:id/pay 
    public function pay(Request $request, int $id) {
        $user    = $request->auth_user;
        $booking = Booking::where('id', $id)->where('user_id', $user['id'])->first();

        if (!$booking) {
            return response()->json(['success' => false, 'message' => 'Booking tidak ditemukan.'], 404);
        }

        if ($booking->status === 'paid') {
            return response()->json(['success' => false, 'message' => 'Booking sudah lunas.'], 409);
        }

        $type   = $request->input('type', 'dp'); // dp atau lunas
        $amount = $request->input('amount');
        $method = $request->input('payment_method', 'transfer');

        if (!$amount || $amount <= 0) {
            return response()->json(['success' => false, 'message' => 'Jumlah pembayaran tidak valid.'], 422);
        }

        Payment::create([
            'booking_id'     => $booking->id,
            'type'           => $type,
            'amount'         => $amount,
            'payment_method' => $method,
            'paid_at'        => now(),
        ]);

        // Update status booking
        $newStatus = ($type === 'lunas') ? 'paid' : 'dp_paid';
        $booking->update(['status' => $newStatus]);

        return response()->json([
            'success' => true,
            'message' => $type === 'lunas' ? 'Pembayaran lunas berhasil.' : 'Pembayaran DP berhasil.',
            'data'    => $booking->fresh(['payments']),
        ]);
    }
}