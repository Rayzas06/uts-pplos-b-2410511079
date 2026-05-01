<?php
namespace App\Services;

use Illuminate\Support\Facades\Http;

class FieldService {

    private string $baseUrl;

    public function __construct() {
        $this->baseUrl = env('FIELD_SERVICE_URL', 'http://localhost:3002');
    }

    // Ambil detail lapangan dari field-service
    public function getField(int $fieldId): ?array {
        $response = Http::get("{$this->baseUrl}/fields/{$fieldId}");
        if ($response->successful()) {
            return $response->json('data');
        }
        return null;
    } 
    public function getSlot(int $fieldId, string $date): array {
        $response = Http::get("{$this->baseUrl}/fields/{$fieldId}/slots", [
            'date' => $date
        ]);
        if ($response->successful()) {
            return $response->json('data') ?? [];
        }
        return [];
    }

    public function markSlotUnavailable(int $slotId): bool {
        $response = Http::patch("{$this->baseUrl}/fields/slots/{$slotId}/unavailable");
        return $response->successful();
    }

    // Tandai slot tersedia kembali jika booking dibatalkan
    public function markSlotAvailable(int $slotId): bool {
        $response = Http::patch("{$this->baseUrl}/fields/slots/{$slotId}/available");
        return $response->successful();
    }
}