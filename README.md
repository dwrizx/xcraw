# ⚡ SmartExtract v2.4.1

**SmartExtract** adalah ekstensi Google Chrome modern yang dirancang untuk mengubah halaman web atau elemen spesifik menjadi format **Markdown (GFM)** atau **Plain Text** yang bersih dan terstruktur secara instan. Dibangun di atas framework **WXT** dengan fokus pada kecepatan dan kebersihan output.

---

## ✨ Fitur Unggulan

- **🔍 Visual Picker (Interactive Mode):** Pilih elemen spesifik di halaman web secara visual (seperti Inspect Element). Cukup arahkan kursor dan klik elemen yang ingin diekstrak.
- **📄 Full Page Extraction:** Menggunakan algoritma **Readability** (Firefox) untuk memisahkan konten utama dari iklan, navigasi, dan sampah visual lainnya.
- **🖱️ Smart Selection:** Ambil hanya teks yang Anda sorot (highlight). Hasil ekstraksi seleksi akan bersih tanpa header tambahan.
- **📋 Auto-Copy & Toast:** Hasil ekstraksi dari _Visual Picker_ otomatis disalin ke clipboard dengan notifikasi _toast_ yang cantik di halaman web.
- **📝 Pro Markdown (GFM):** Mendukung tabel, task lists, dan strikethrough. Semua link dan gambar otomatis diubah menjadi **Absolute URL** (tidak ada link rusak).
- **🌗 Modern UI/UX:** Antarmuka berbasis **Tailwind CSS v4** yang responsif, mendukung Dark Mode, dan dilengkapi ikon interaktif dari **Lucide React**.
- **💾 Format Switcher:** Pilih output antara **Markdown (.md)** atau **Plain Text (.txt)**.

---

## 🛠️ Tech Stack & Tooling

Proyek ini menggunakan "Fastest Frontend Tooling" untuk siklus pengembangan yang super cepat:

- **Framework:** [WXT](https://wxt.dev/) (Web Extension Framework).
- **Runtime & Package Manager:** [Bun](https://bun.sh/).
- **UI Library:** React 19 + Lucide Icons.
- **Styling:** Tailwind CSS v4 (dengan Vite plugin).
- **Core Logic:** `@mozilla/readability`, `turndown` + `gfm plugin`.
- **Quality Gates:**
  - `tsgo` (TypeScript native preview) untuk type-checking kilat.
  - `oxlint` untuk linting super cepat.
  - `oxfmt` untuk formatting kode yang konsisten.

---

## 🚀 Memulai (Development)

### Prasyarat

- Pastikan [Bun](https://bun.sh/) sudah terinstal di komputer Anda.

### Instalasi

1. Clone repositori ini.
2. Jalankan perintah instalasi:
   ```bash
   bun install
   ```

### Menjalankan Mode Dev

Untuk melihat perubahan secara real-time:

```bash
bun run dev
```

_Chrome akan terbuka secara otomatis dengan ekstensi yang sudah ter-load._

### Build Produksi

Untuk menghasilkan file final yang siap dipasang:

```bash
bun run build
```

File hasil build akan berada di folder `.output/chrome-mv3`.

---

## 📦 Cara Pasang Manual di Chrome

1. Buka Chrome dan navigasi ke `chrome://extensions/`.
2. Aktifkan **Developer mode** di pojok kanan atas.
3. Klik tombol **Load unpacked**.
4. Pilih folder `.output/chrome-mv3` yang ada di direktori proyek ini.
5. Selesai! Klik ikon SmartExtract di toolbar Chrome Anda.

---

## 📋 Quality Control Scripts

- `bun run check`: Menjalankan Full Quality Gate (Typecheck + Lint + Format Check).
- `bun run fix`: Memperbaiki error linting dan formatting secara otomatis.
- `bun run typecheck`: Type-checking cepat menggunakan `tsgo`.

---

## 🛡️ Keamanan & Privasi

SmartExtract menggunakan `DOMPurify` untuk membersihkan konten HTML sebelum diproses, memastikan data yang diekstrak aman dari skrip berbahaya. Ekstensi ini berjalan sepenuhnya secara lokal di browser Anda.

---

## 📄 Lisensi

MIT License - © 2026 SmartExtract Team.
