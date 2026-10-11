# Panduan Setup Lengkap: WhatsApp Delayed Auto-Reply Bot

Dokumen ini adalah panduan langkah demi langkah dari nol (0) untuk menjalankan WhatsApp Bot Anda. Silakan ikuti secara berurutan.

---

## Langkah 1: Persiapan Akun & Token Fonnte (Untuk WhatsApp)
Fonnte adalah layanan yang menghubungkan sistem bot kita dengan WhatsApp Anda.
1. Buka website **[Fonnte](https://fonnte.com/)** dan buat akun jika belum punya.
2. Login ke Dashboard Fonnte.
3. Pergi ke menu **Device** (Perangkat), lalu tambahkan perangkat baru.
4. Akan muncul QR Code. Buka aplikasi WhatsApp di HP Anda -> **Perangkat Tertaut (Linked Devices)** -> Scan QR Code tersebut seperti Anda login ke WhatsApp Web.
5. Setelah statusnya **Connected**, pergi ke menu **Api** di sebelah kiri.
6. Salin **Token** Anda.
   *(Simpan token ini, kita akan memasukkannya ke dalam file `wrangler.jsonc` pada langkah 3).*

---

## Langkah 2: Persiapan Akun Upstash (Database & Antrean)
Upstash menyediakan layanan Redis (untuk mengingat nomor mana yang sedang menunggu balasan) dan QStash (untuk menghitung mundur 60 detik).
1. Buka website **[Upstash](https://upstash.com/)** dan daftar/login (bisa menggunakan akun Google atau GitHub).

**2A. Membuat Database Redis:**
1. Di Dashboard Upstash, masuk ke tab **Redis**, klik **Create Database**.
2. Beri nama database (misal: `wa-bot-db`), pilih Region yang terdekat (misal: `ap-southeast-1` Singapore), lalu klik **Create**.
3. Di halaman database yang baru dibuat, gulir ke bawah ke bagian **REST API**.
4. Salin **UPSTASH_REDIS_REST_URL** dan **UPSTASH_REDIS_REST_TOKEN**. 
   *(Simpan keduanya untuk langkah 3).*

**2B. Mengambil Token QStash:**
1. Di Dashboard Upstash bagian atas, pindah ke tab **QStash**.
2. Anda akan langsung melihat bagian **QSTASH_TOKEN** di halaman utamanya.
3. Klik tombol *copy* (salin) pada Token tersebut.
   *(Simpan token ini untuk langkah 3).*

---

## Langkah 3: Mengisi `wrangler.jsonc`
Sekarang, masukkan semua token yang sudah Anda dapatkan ke dalam file `wrangler.jsonc`.
Buka file tersebut, lalu pada bagian `"vars"`, ganti tulisan `GANTI_DENGAN_...` dengan token aslinya. Pastikan tetap berada di dalam tanda kutip ganda `""`.

Contoh hasil akhir akan terlihat seperti ini:
```jsonc
  "vars": {
    "MY_PHONE_NUMBER": "6289513259281",
    // WORKER_URL biarkan saja GANTI_DENGAN_URL_WORKER_ANDA untuk sementara
    "WORKER_URL": "GANTI_DENGAN_URL_WORKER_ANDA",
    "UPSTASH_REDIS_REST_URL": "https://ap-southeast-1-xxxxx.upstash.io",
    "UPSTASH_REDIS_REST_TOKEN": "AUsgAAIncDxxxxxxxxxxxxxxxxxx",
    "QSTASH_TOKEN": "eyJSxxxxxxxxxxxxxxxxxxxxxx",
    "FONNTE_TOKEN": "abc123def456ghi789"
  }
```

---

## Langkah 4: Mendaftar Cloudflare & Deploy Bot
1. Buat akun di **[Cloudflare](https://dash.cloudflare.com/sign-up)** jika belum punya. Jangan lupa verifikasi email Anda.
2. Kembali ke VS Code (atau tempat Anda membuka *project* ini).
3. Buka Terminal baru di VS Code (`Terminal -> New Terminal`).
4. Pastikan Anda berada di dalam folder `wa-bot`.
5. Ketik perintah berikut dan tekan Enter:
   ```bash
   npm run deploy
   ```
6. Terminal akan meminta Anda untuk login ke Cloudflare. Biasanya ia akan membuka browser secara otomatis. Klik tombol **Allow / Authorize** di browser tersebut.
7. Tunggu proses *deploy* selesai di terminal.
8. Jika berhasil, terminal akan memunculkan URL Worker Anda yang berakhiran `.workers.dev`.
   *(Contoh: `https://wa-bot.username-anda.workers.dev`)*.
9. **Kopi URL Worker tersebut**.
10. Buka kembali file `wrangler.jsonc`, dan masukkan URL tadi ke bagian `"WORKER_URL"`. 
    - Penting: **JANGAN pakai garis miring `/` di paling belakang URL!** 
    - Contoh: `"WORKER_URL": "https://wa-bot.gila.workers.dev"`
11. Simpan file `wrangler.jsonc`, lalu ketik `npm run deploy` sekali lagi di terminal untuk menerapkan URL baru tersebut.

---

## Langkah 5: Memasang Webhook di Fonnte
Langkah terakhir adalah memberitahu Fonnte agar mengirimkan pesan WhatsApp yang masuk ke Bot kita.
1. Buka kembali Dashboard Fonnte, masuk ke menu **Device**.
2. Pada baris perangkat Anda, klik tombol Edit (ikon pensil atau ikon gerigi/settings).
3. Cari kolom input bernama **Webhook URL**.
4. Masukkan URL Worker Anda tadi lalu ditambahkan `/webhook/fonnte` di belakangnya.
   - Contoh: `https://wa-bot.username-anda.workers.dev/webhook/fonnte`
5. Centang opsi **Webhook** agar aktif, lalu simpan (Save/Update).

---

## Langkah 6: Cara Uji Coba Bot Anda

Semuanya sudah siap! Mari kita tes:
1. Ambil HP orang lain (teman atau nomor kedua Anda).
2. Kirim pesan ke nomor utama Anda (yang terhubung di Fonnte).
3. Secara default, bot dalam keadaan **mati**.
4. Untuk menyalakan bot, kirim pesan ini dari **nomor Anda sendiri** (kirim pesan ke diri sendiri atau melalui fitur Message Yourself di WhatsApp):
   `/bot on`
5. Jika berhasil, Anda akan mendapat pesan balasan: *"Bot diaktifkan. Auto-reply menyala."*
6. Sekarang, minta HP teman Anda mengirim pesan lagi ke Anda.
7. **Tunggu 60 detik tanpa membalas pesan teman Anda tersebut.**
8. Setelah 60 detik, bot otomatis akan membalas pesan teman Anda.

### Perintah (Commands) Lainnya:
*(Kirim dari nomor Anda sendiri)*
*   `/bot off` = Mematikan bot kembali.
*   `/ubah_teks [pesan balasan baru]` = Mengganti teks auto-reply.
    *   *Contoh:* `/ubah_teks Maaf, saat ini saya sedang mengemudi. Akan saya balas nanti ya.`

Selesai! Selamat mencoba!
