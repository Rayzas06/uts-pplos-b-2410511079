<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreBookingRequest extends FormRequest {
    public function authorize(): bool { return true; }

    public function rules(): array {
        return [
            'field_id'     => 'required|integer',
            'slot_id'      => 'required|integer',
            'booking_date' => 'required|date|after_or_equal:today',
            'time_start'   => 'required|date_format:H:i',
            'time_end'     => 'required|date_format:H:i|after:time_start',
            'total_amount' => 'required|numeric|min:1',
            'dp_amount'    => 'nullable|numeric|min:0',
            'notes'        => 'nullable|string|max:500',
        ];
    }

    
    protected function failedValidation(Validator $validator) {
        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => 'Validasi gagal.',
            'errors'  => $validator->errors(),
        ], 422));
    }
}