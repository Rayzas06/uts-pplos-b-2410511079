UTS SE - Microservices API

Nama    : Raymond Divian Nathaniel
Kelas   : B
NIM     : 2410511079 
Link youtube: 
Sistem reservasi lapangan olahraga berbasis microservices yang dibangun dengan Node.js (Express), Laravel, MySQL, dan API Gateway. Proyek ini menggunakan arsitektur microservices untuk meningkatkan skalabilitas, fleksibilitas, dan maintainability.


Arsitektur Proyek
Bisa dilihat pada docs\ArsitekturProyek.png


Layanan & Fungsinya

 1. API Gateway (Port 8000)
- Fungsi: Menghubungkan semua service dan hanya bisa dipanggil melalui gateway
- Tugas:
  - Routing request ke microservices yang sesuai
  - Validasi JWT token untuk request yang memerlukan auth
  - Rate limiting untuk mencegah abuse
  - CORS handling
  - Health check untuk semua services

 2. Auth Service (Port 3001, Node.js)
- Fungsi: Menangani autentikasi dan autorisasi
- Tugas:
  - User registration (membuat akun baru)
  - User login (generate JWT token)
  - Token refresh (perpanjang akses token)
  - User logout (invalidate token)
  - OAuth GitHub integration
- Database: `auth_db` (MySQL, Port 3307)
  - Table: `users` (menyimpan data user dengan password terenkripsi)

 3. Field Service (Port 3002, Node.js)
- Fungsi: Mengelola data lapangan olahraga
- Tugas:
  - List semua lapangan yang tersedia
  - Get detail lapangan tertentu
  - Create lapangan baru (memerlukan autentikasi)
  - Update lapangan
  - Delete lapangan
- Database: `field_db` (MySQL, Port 3308)
  - Table: `fields` (data lapangan: nama, tipe, lokasi, harga)

 4. Booking Service (Port 8080, Laravel)
- Fungsi: Mengelola reservasi/pemesanan lapangan
- Tugas:
  - List semua booking
  - Get detail booking tertentu
  - Create booking baru (memerlukan autentikasi)
  - Update status booking
  - Delete booking
  - Validasi ketersediaan jam booking
- Database: `booking_db` (MySQL, Port 3309)
  - Tables: 
    - `bookings` - data pemesanan
    - `booking_slots` - slot waktu yang tersedia




Database

Proyek menggunakan 3 database terpisah (Database per Service Pattern):

| Service | Database | Port | Username | Password |
|---------|----------|------|----------|----------|
| Auth | `auth_db` | 3307 | root | niel151206 |
| Field | `field_db` | 3308 | root | niel151206 |
| Booking | `booking_db` | 3309 | root | niel151206 |

Keuntungan Database Terpisah:
-  Service independence (setiap service punya database sendiri)
-  Scalability (dapat di-scale secara independen)
-  Technology flexibility (bisa gunakan DB berbeda per service)
-  Failure isolation (error di satu DB tidak affect services lain)


 Cara Menjalankan Proyek

 Prasyarat
- Node.js v16 atau lebih tinggi
- Docker & Docker Compose (untuk database MySQL)
- PHP 8.0+ (untuk Laravel Booking Service)
- Composer (untuk Laravel dependencies)
- MySQL Client 

 Langkah 1: Setup Database dengan Docker
cd c:\coba-coba2\uts-se

Start semua service dan database
docker-compose up -d

Verify services running
docker ps


 Langkah 2: Setup Auth Service
cd services/auth-service

Install dependencies
npm install

Run development server
npm run dev

Expected output: Auth Service berjalan di port 3001


 Langkah 3: Setup Field Service

Buka terminal baru:
cd services/field-service

 Install dependencies
npm install

 Run development server
npm run dev

 Expected output:  Field Service berjalan di port 3002


 Langkah 4: Setup Booking Service (Laravel)
Buka terminal baru:
cd services/booking-service

 Install PHP dependencies
composer install

 Generate app key
php artisan key:generate

 Run Laravel development server
php artisan serve --port=8080

 Expected output: Laravel development server started...


 Langkah 5: Setup Gateway
Buka terminal baru:
cd gateway

 Install dependencies
npm install

 Run development server
npm run dev

 Expected output: API Gateway berjalan di port 8000


Pastikan semua 4 terminal berjalan dan tidak ada error!

---
 Testing API (10 Endpoints)

 Menggunakan Postman

Import file `postman/UTS_SE_API_Collection.json` ke Postman untuk testing semua endpoints.

Auth Endpoints (4)

1. POST   /auth/register          - Create user baru
2. POST   /auth/login             - Login & dapatkan JWT token
3. POST   /auth/refresh           - Refresh access token
4. POST   /auth/logout            - Logout user


Field Endpoints (3)

5. GET    /fields                 - List semua lapangan
6. GET    /fields/:id             - Get detail lapangan
7. POST   /fields                 - Create lapangan baru (auth required)


Booking Endpoints (3)

8. GET    /bookings               - List semua booking
9. POST   /bookings               - Create booking baru (auth required)
10. GET   /bookings/:id           - Get detail booking       

 Security Features

- JWT Authentication: Token-based authentication untuk protected routes
- Password Encryption: Bcrypt untuk hashing password
- Rate Limiting: Mencegah brute force attacks
- CORS: Cross-Origin Resource Sharing configuration
- Environment Variables: Sensitive data di `.env` (tidak di-commit)
