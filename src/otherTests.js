// =========================================================
// BEEP TEST (Multistage Fitness Test) & TES BEBAS
// Berbeda dari tkji.js: angka-angka di sini adalah ESTIMASI dari rumus
// umum yang dipublikasikan (Leger dkk.), BUKAN standar baku nasional
// seperti TKJI. Selalu tampilkan catatan "cek ulang" di UI.
// =========================================================

// Perkiraan jumlah shuttle (bolak-balik 20m) per level pada tes lari
// multitahap standar. Dipakai untuk menghitung level pecahan (mis. level
// 7 shuttle 4 dari 10 -> level 7.4) supaya estimasi lebih halus.
const SHUTTLES_PER_LEVEL = {
  1: 7, 2: 8, 3: 8, 4: 9, 5: 9, 6: 10, 7: 10, 8: 11, 9: 11, 10: 11,
  11: 12, 12: 12, 13: 13, 14: 13, 15: 13, 16: 14, 17: 14, 18: 15, 19: 15, 20: 16, 21: 16,
};

export function beepFractionalLevel(level, shuttle) {
  const lv = Number(level) || 0;
  const sh = Number(shuttle) || 0;
  const total = SHUTTLES_PER_LEVEL[lv] || 10;
  const frac = Math.max(0, Math.min(sh / total, 0.99));
  return lv + frac;
}

export function beepVelocity(fractionalLevel) {
  return 8.0 + 0.5 * (fractionalLevel - 1);
}

// Rumus Leger (1988) untuk estimasi VO2max dari kecepatan tahap terakhir & usia.
export function beepVO2max(level, shuttle, age) {
  if (!level || !age) return null;
  const fracLevel = beepFractionalLevel(level, shuttle);
  const v = beepVelocity(fracLevel);
  const a = Number(age);
  const vo2 = 31.025 + 3.238 * v - 3.248 * a + 0.1536 * v * a;
  return Math.round(vo2 * 10) / 10;
}

export function classifyVO2max(vo2, gender) {
  if (vo2 == null) return null;
  if (gender === "L") {
    if (vo2 >= 55) return "Superior";
    if (vo2 >= 51) return "Sangat Baik";
    if (vo2 >= 45) return "Baik";
    if (vo2 >= 39) return "Cukup";
    if (vo2 >= 35) return "Kurang";
    return "Kurang Sekali";
  }
  if (vo2 >= 50) return "Superior";
  if (vo2 >= 46) return "Sangat Baik";
  if (vo2 >= 39) return "Baik";
  if (vo2 >= 34) return "Cukup";
  if (vo2 >= 31) return "Kurang";
  return "Kurang Sekali";
}

// Ubah VO2max jadi skala 0-100 sederhana (linear antara 20-65 ml/kg/menit)
// supaya bisa dikirim sebagai nilai ke Nilai Harian.
export function vo2ToScale100(vo2) {
  if (vo2 == null) return null;
  const clamped = Math.max(20, Math.min(65, vo2));
  return Math.round(((clamped - 20) / (65 - 20)) * 100);
}

// ---------- TES BEBAS ----------
// Guru menentukan sendiri titik "nilai 0" dan "nilai 100"; arah (makin
// besar makin baik ATAU makin kecil makin baik) otomatis mengikuti mana
// yang lebih besar di antara keduanya.
export function customScore(raw, worst, best) {
  if (raw === "" || raw == null || worst === "" || worst == null || best === "" || best == null) return null;
  const r = Number(raw), w = Number(worst), b = Number(best);
  if (w === b) return null;
  const pct = (r - w) / (b - w);
  return Math.round(Math.max(0, Math.min(1, pct)) * 100);
}
