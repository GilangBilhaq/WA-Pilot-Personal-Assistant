# WA-Pilot — Personal WhatsApp Automation Bot

![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white)
![Hono](https://img.shields.io/badge/Hono-Framework-E36002?style=flat-square&logo=hono&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)

**WA-Pilot** adalah bot WhatsApp pribadi yang dirancang untuk otomatisasi pesan, meningkatkan produktivitas sehari-hari, dan mengelola tugas secara efisien. Dibangun di atas infrastruktur **Cloudflare Workers** menggunakan framework **Hono**, bot ini berjalan sangat cepat di *edge network* dengan biaya dan latensi yang minimal.

## ✨ Fitur Utama (Features)

- **Performa Tinggi:** Dijalankan di Cloudflare Workers (Edge Computing).
- **Modern & Ringan:** Dikembangkan menggunakan framework Hono dan TypeScript.
- **Webhook WhatsApp:** Siap menerima dan merespons pesan masuk secara otomatis via WhatsApp Cloud API.
- **Mudah Dikustomisasi:** Struktur kode yang modular sehingga mudah ditambahkan fitur-fitur baru.

## 🚀 Prasyarat (Prerequisites)

Sebelum menjalankan atau men-deploy proyek ini, pastikan Anda telah menginstal:
- [Node.js](https://nodejs.org/) (versi 18+ disarankan)
- [pnpm](https://pnpm.io/installation) sebagai package manager (disarankan karena menggunakan `pnpm-workspace.yaml`)
- [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

## 🛠 Instalasi & Pengembangan Lokal (Local Setup)

1. **Clone repositori ini:**
   ```bash
   git clone https://github.com/GilangBilhaq/WA-Pilot-Personal-Assistant.git
   cd WA-Pilot-Personal-Assistant
   ```

2. **Instal dependensi:**
   ```bash
   pnpm install
   # atau menggunakan npm:
   # npm install
   ```

3. **Jalankan server pengembangan lokal (Wrangler dev):**
   ```bash
   npm run dev
   ```

4. **Sinkronisasi Tipe Cloudflare (Opsional):**
   Untuk menghasilkan/mensinkronkan tipe berdasarkan konfigurasi `wrangler.jsonc`, jalankan:
   ```bash
   npm run cf-typegen
   ```

## ☁️ Deployment

Untuk mempublikasikan (*deploy*) bot ini ke akun Cloudflare Workers Anda, cukup jalankan perintah:

```bash
npm run deploy
```

> **Catatan:** Pastikan Anda sudah login ke akun Cloudflare di Wrangler (`npx wrangler login`) sebelum melakukan deployment.

## 📝 Konfigurasi Environment (Bindings)

Saat membuat ekstensi atau handler baru, jangan lupa untuk mendefinisikan `CloudflareBindings` sebagai *generics* saat menginisialisasi `Hono` agar *type-safe*:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
