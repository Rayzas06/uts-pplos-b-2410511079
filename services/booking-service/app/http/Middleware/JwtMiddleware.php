<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class JwtMiddleware {
    public function handle(Request $request, Closure $next) {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json([
                'success' => false,
                'message' => 'Token tidak ditemukan.'
            ], 401);
        }

        // Verifikasi token ke auth-service
        $response = Http::withToken($token)
            ->get(env('AUTH_SERVICE_URL') . '/auth/profile');

        if (!$response->successful()) {
            return response()->json([
                'success' => false,
                'message' => $response->json('message') ?? 'Token tidak valid.'
            ], $response->status());
        }

        // Simpan user ke request agar bisa diakses di controller
        $request->merge(['auth_user' => $response->json('data')]);

        return $next($request);
    }
}