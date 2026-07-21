# Cara Mempublikasikan Aplikasi (Gratis)

**Sebelum mulai: pastikan Anda sudah menyelesaikan `SETUP-SUPABASE.md` terlebih dahulu.**
Tanpa itu, aplikasinya akan terbuka tapi login/data tidak akan berfungsi.

## Langkah 1 — Buat akun GitHub (kalau belum punya)
1. Buka https://github.com → **Sign up**.

## Langkah 2 — Unggah folder proyek ini ke GitHub
1. Login → klik **+** di kanan atas → **New repository**.
2. Nama bebas, misalnya `sistem-pembelajaran` → **Public** → **Create repository**.
3. Klik **uploading an existing file**.
4. Upload **semua isi folder ini**, termasuk folder `src/` dan `supabase/` beserta isinya (drag folder-nya langsung, GitHub akan menjaga strukturnya).
   - **Jangan upload file `.env`** kalau Anda sempat membuatnya (sudah otomatis diabaikan lewat `.gitignore`, tapi cek lagi supaya tidak ke-upload — karena itu berisi kunci rahasia).
5. Klik **Commit changes**.

## Langkah 3 — Hubungkan ke Vercel
1. Buka https://vercel.com → **Sign up** → **Continue with GitHub**.
2. **Add New... → Project** → pilih repo tadi → **Import**.
3. **Sebelum klik Deploy**, buka bagian **Environment Variables**, tambahkan dua baris:
   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | (isi dari Supabase Settings → API) |
   | `VITE_SUPABASE_ANON_KEY` | (isi dari Supabase Settings → API) |
4. Klik **Deploy**, tunggu ±1 menit.
5. Selesai — dapat link publik, contoh: `https://sistem-pembelajaran.vercel.app`.

## Langkah 4 — Coba login
1. Buka link tadi → klik **Daftar Akun**.
2. Buat akun pertama sebagai **Guru Mapel** (isi mata pelajaran) atau **Wali Kelas**.
3. Masuk, lalu tambahkan kelas & siswa lewat menu **Kelas & Siswa**.
4. Guru lain / wali kelas lain bisa daftar akun sendiri-sendiri lewat link yang sama.

## Kalau nanti mau update aplikasi
Ubah file di GitHub (atau minta saya buatkan versi barunya untuk di-upload ulang) → Vercel otomatis mem-publish ulang setiap ada perubahan di repo.

## Yang perlu diketahui
- Data sekarang **tersimpan di database Supabase**, bukan di browser — jadi otomatis sama dan tersambung di semua perangkat, untuk semua guru/wali kelas yang login.
- Paket gratis Supabase cukup untuk sekolah dengan jumlah siswa & guru wajar; kalau nanti databasenya idle lebih dari 1 minggu tanpa aktivitas, Supabase bisa menjeda proyek otomatis — tinggal buka dashboard Supabase dan klik "Restore" kalau itu terjadi.
