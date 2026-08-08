import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diatur. Lihat SETUP-SUPABASE.md."
  );
}

export const supabase = createClient(url || "", anonKey || "");

// Client TERPISAH, sesi TIDAK disimpan (persistSession: false) dan tidak
// otomatis refresh token. Dipakai khusus untuk aksi "buat akun untuk orang
// lain" (mis. Wali Kelas membuat akun Siswa/Sekretaris) lewat supabase.auth.signUp().
// Kalau pakai client `supabase` biasa untuk ini, sesi login Wali Kelas yang
// sedang aktif akan TERTIMPA oleh sesi akun baru yang baru dibuat — makanya
// perlu client kedua yang berdiri sendiri, supaya sesi utama tidak terganggu.
export function createTempAuthClient() {
  return createClient(url || "", anonKey || "", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
