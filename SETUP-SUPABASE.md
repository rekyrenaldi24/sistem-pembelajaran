# Setup Database (Supabase) — Wajib Dilakukan Dulu

Aplikasi ini butuh database sungguhan untuk sistem login banyak akun (Guru Mapel & Wali Kelas). Kita pakai **Supabase**, gratis, tidak perlu kartu kredit.

## Langkah 1 — Buat akun & proyek Supabase
1. Buka https://supabase.com → **Start your project** → daftar (bisa pakai akun GitHub).
2. Klik **New project**.
3. Isi:
   - **Name**: bebas, misalnya `sistem-pembelajaran`
   - **Database Password**: buat password, **simpan baik-baik** (dipakai kalau perlu akses langsung ke database)
   - **Region**: pilih yang terdekat, misal Singapore
4. Klik **Create new project**, tunggu ±2 menit sampai selesai disiapkan.

## Langkah 2 — Jalankan skema database
1. Di sidebar kiri proyek Supabase, klik ikon **SQL Editor**.
2. Klik **New query**.
3. Buka file `supabase/schema.sql` yang ada di folder proyek ini, **copy semua isinya**.
4. Paste ke SQL Editor tadi, lalu klik **Run** (atau tombol ▶️).
5. Kalau muncul "Success. No rows returned" — berarti berhasil. Semua tabel siap.

## Langkah 3 — Ambil kunci API
1. Di sidebar, klik ikon **Settings (gear)** → **API**.
2. Catat dua nilai ini:
   - **Project URL** (contoh: `https://xxxxx.supabase.co`)
   - **anon public key** (kunci panjang di bagian "Project API keys")

## Langkah 4 — Matikan konfirmasi email (opsional, biar langsung bisa login)
Supaya guru/wali kelas bisa langsung login setelah daftar tanpa perlu klik link konfirmasi di email (lebih praktis untuk lingkungan sekolah tertutup):
1. Di sidebar, klik **Authentication** → **Providers** → **Email**.
2. Matikan (off) opsi **Confirm email**.
3. Klik **Save**.

*(Kalau opsi ini dinyalakan, setiap akun baru harus konfirmasi email dulu sebelum bisa login — juga tidak masalah, hanya butuh langkah ekstra.)*

## Langkah 5 — Masukkan kunci API ke proyek
1. Di folder proyek ini, cari file bernama `.env.example`.
2. Buat salinannya, beri nama **`.env`** (buang `.example`).
3. Isi dengan nilai dari Langkah 3:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=isi-anon-key-di-sini
   ```
4. Simpan.

File `.env` ini juga perlu diisi di pengaturan **Vercel** nanti saat publish (lihat `CARA-PUBLISH.md`) — bagian "Environment Variables".

## Selesai
Database sudah siap. Lanjutkan ke `CARA-PUBLISH.md` untuk mem-publish aplikasinya.

---

### Cara akun & peran bekerja
- Siapa pun bisa mendaftar sendiri lewat halaman **Daftar Akun**, memilih peran **Guru Mapel** atau **Wali Kelas**.
- Guru mapel mengisi nama mata pelajaran yang diampu saat daftar (misalnya "PJOK").
- Data kelas & siswa **dibagikan bersama** — siapa pun yang login bisa menambah kelas/siswa baru, supaya tidak perlu didaftarkan berulang oleh tiap guru.
- Data absensi, poin, nilai, catatan, dan tabungan **hanya bisa diubah oleh pembuatnya sendiri** — guru lain atau wali kelas lain tidak bisa mengubah data milik orang lain.
