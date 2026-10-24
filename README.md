# Zenith Bypass ⚡

> **Ekstensi Browser Pintar (Manifest V3) & Serverless Edge Relay untuk Bypass Blokir Internet Positif, DNS Poisoning, dan Sensor ISP secara Selektif.**

![Platform](https://img.shields.io/badge/Platform-Chromium%20|%20Edge%20|%20Brave-blue?style=flat-square)
![Manifest](https://img.shields.io/badge/Manifest-V3-10b981?style=flat-square)
![Backend](https://img.shields.io/badge/Backend-Node.js%20(Zero%20Dep)-6366f1?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-gray?style=flat-square)

---

## 📌 Mengapa Zenith Bypass?

Di Indonesia dan beberapa negara lain, sensor internet (Internet Positif / Nawala) bekerja dengan 2 cara utama:
1. **DNS Poisoning / Hijacking**: ISP mencegat paket DNS UDP port 53 dan membelokkannya ke IP blokir (misal `10.x.x.x` atau halaman Internet Baik).
2. **SNI Filtering (Deep Packet Inspection)**: ISP membaca nama host pada TLS ClientHello untuk memutus koneksi HTTPS.

Banyak ekstensi VPN gratis di luar sana yang **memperlambat seluruh koneksi internet** karena mem-proxy semua traffic (termasuk YouTube, m-banking, dan marketplace lokal), serta rawan kebocoran data pengguna.

**Zenith Bypass** memecahkan masalah ini dengan arsitektur **Smart PAC (Proxy Auto-Config) + Encrypted Edge Relay**:
- **Smart Selective Routing**: Hanya domain yang terdaftar dalam daftar blokir (misal `*.reddit.com`, `*.vimeo.com`) yang dialihkan ke proxy. Website lainnya tetap **DIRECT** via ISP lokal sehingga kecepatan browsing harian tetap maksimal.
- **Resolusi DNS di Sisi Server (Remote DNS)**: Browser tidak me-resolve DNS lewat ISP lokal untuk domain yang diblokir, sehingga DNS hijacking otomatis tembus.
- **Enkripsi TLS End-to-End**: Jalur antara browser dan proxy terenkripsi via HTTPS (port 443), mencegah ISP melakukan sniffing SNI.
- **100% Gratis & Serverless**: Backend proxy dapat di-deploy tanpa biaya sepeser pun di Koyeb atau Render (Free Tier).

---

## 🏗️ Arsitektur Sistem

```
[ Browser Client (Chrome / Brave / Edge) ]
                 │
                 ▼
        [ Ekstensi MV3 PAC Engine ]
                 │
        ┌────────┴──────────────────────────┐
        │                                   │
[ Domain Biasa / Lokal ]         [ Domain Terblokir (Reddit, dll.) ]
  (Google, Tokopedia, dll.)                 │
        │                                   ▼ (TLS Encrypted Tunnel - Port 443)
        ▼                            [ Serverless Edge Relay ]
   DIRECT via ISP                    (Koyeb / Render / VPS Luar Negeri)
 (Kecepatan Maksimal)                       │
                                            ▼ (DNS & Fetch dari Luar)
                                      [ Target Website ]
```

---

## ✨ Fitur Utama

- **Manifest V3 Compliant**: Didesain sesuai standar keamanan ekstensi browser modern terbaru.
- **Dual Mode**:
  - `Smart PAC (Selective)`: Hanya me-route domain yang diblokir (Default).
  - `Global Mode`: Me-route semua lalu lintas browser melewati proxy.
- **In-Memory & Storage Domain Manager**: Tambah, hapus, dan kelola domain target dengan dukungan wildcard (`*.domain.com`).
- **Silent Proxy Authentication**: Autentikasi proxy ditangani otomatis di background via `chrome.webRequest.onAuthRequired` tanpa dialog prompt yang mengganggu.
- **Edge Latency Ping Test**: Pengujian responsivitas server proxy langsung dari UI popup.
- **Zero-Dependency Backend**: Server relay ditulis menggunakan library native Node.js (`http` & `net`), memakan RAM <25MB dan siap jalan di container gratis.

---

## 🚀 Panduan Instalasi Ekstensi (Client)

1. **Clone atau Unduh Repository ini**:
   ```bash
   git clone https://github.com/AuliaRadix/smart-bypass-extension.git
   ```
2. **Buka Browser Chromium** (Google Chrome, Microsoft Edge, Brave, dll.).
3. Kunjungi halaman ekstensi:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
4. Aktifkan **Developer mode** di pojok kanan atas.
5. Klik **Load unpacked** (Muat yang belum dibongkar).
6. Pilih folder `extension` dari repositori ini.
7. Ikon **Zenith Bypass** akan muncul di bilah toolbar browser Anda!

---

## 🌐 Deploy Backend Relay (100% Gratis)

Pilih salah satu platform gratis berikut untuk menjalankan relay pribadi Anda:

### Opsi A: Deploy di Koyeb (Direkomendasikan)
1. Fork repo ini ke akun GitHub Anda.
2. Buka dashboard [Koyeb](https://app.koyeb.com/) dan buat service baru via **GitHub**.
3. Arahkan **Work directory** ke `server`.
4. Tambahkan Environment Variables:
   - `PORT`: `8080`
   - `PROXY_USERNAME`: username_pilihan_anda
   - `PROXY_PASSWORD`: password_rahasia_anda
5. Deploy. Anda akan mendapatkan URL HTTPS seperti: `https://zenith-proxy-xyz.koyeb.app`.

### Opsi B: Deploy di Render
1. Buka [Render](https://render.com/) dan buat **Web Service** baru dari repo ini.
2. Pilih runtime **Node**, build command: `npm install`, start command: `node server.js`.
3. Set environment variable `PROXY_USERNAME` dan `PROXY_PASSWORD`.

---

## ⚙️ Cara Konfigurasi di Ekstensi

1. Klik ikon **Zenith Bypass** di browser.
2. Buka tab **Server Config**.
3. Masukkan data server Anda:
   - **Protocol**: `HTTPS`
   - **Server Host**: `zenith-proxy-xyz.koyeb.app` (domain server Anda)
   - **Port**: `443`
   - **Username & Password**: Sesuai yang Anda set di backend.
4. Klik **Save Server Configuration**.
5. Nyalakan switch **Bypass Status** menjadi **ACTIVE**.
6. Selesai! Coba buka `reddit.com` atau domain yang sebelumnya terblokir.

---

## 📂 Struktur Project

```
smart-bypass-extension/
├── extension/                 # Ekstensi Browser Chrome (Manifest V3)
│   ├── manifest.json          # Definisi permission & metadata ekstensi
│   ├── background.js          # Service worker (PAC logic & auto-auth)
│   ├── popup/
│   │   ├── popup.html         # Tampilan popup ekstensi
│   │   ├── popup.css          # Styling minimalis gelap (Anti-Slop)
│   │   └── popup.js           # Controller & manajemen domain
│   └── icons/                 # Aset icon 16px, 48px, 128px
│
├── server/                    # Serverless Edge Proxy Backend
│   ├── server.js              # Native Node.js HTTPS CONNECT proxy
│   ├── package.json           # Definisi package
│   ├── Dockerfile             # Container image alpine ringan
│   ├── render.yaml            # Blueprint 1-click deploy Render
│   └── README.md              # Dokumentasi teknis backend
│
├── .gitignore
├── LICENSE                    # MIT License
└── README.md                  # Dokumentasi utama
```

---

## 🛡️ Keamanan & Privasi

- **Tanpa Logging Data**: Ekstensi dan server tidak menyimpan riwayat penelusuran (browsing history) atau konten paket data.
- **Aman dari Akses Liar**: Proteksi Basic Auth mencegah orang lain memakai bandwidth proxy Anda.
- **Kredensial Tersimpan Lokal**: Username dan password proxy hanya tersimpan di `chrome.storage.local` perangkat Anda.

---

## 📄 Lisensi

Didistribusikan di bawah lisensi MIT. Silakan gunakan, pelajari, dan kembangkan secara bebas. Dibuat oleh [Aulia Radix Putra Winarko](https://github.com/AuliaRadix).
