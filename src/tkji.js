// =========================================================
// KALKULATOR TKJI — Tes Kesegaran Jasmani Indonesia
// Norma untuk usia 16-19 tahun (SMA/SMK), berdasarkan pedoman TKJI
// Depdiknas. Dipakai di menu "Tes Kebugaran" (Guru Mapel PJOK).
//
// PENTING: tabel norma di bawah ini disalin dari referensi standar TKJI
// 16-19 tahun yang umum dipakai di sekolah. Kalau sekolah Anda punya
// pedoman resmi tersendiri (mis. dari Dispora/pengawas), sebaiknya
// dicocokkan ulang sebelum dipakai untuk nilai rapor.
// =========================================================

// Item 1: Lari 60 meter (detik, makin cepat makin baik)
export function scoreLari60(detik, gender) {
  if (detik == null || detik === "") return null;
  const d = Number(detik);
  if (gender === "L") {
    if (d <= 7.2) return 5;
    if (d <= 8.3) return 4;
    if (d <= 9.6) return 3;
    if (d <= 11.0) return 2;
    return 1;
  }
  if (d <= 8.4) return 5;
  if (d <= 9.8) return 4;
  if (d <= 11.4) return 3;
  if (d <= 13.4) return 2;
  return 1;
}

// Item 2: Putra = jumlah angkat tubuh/pull-up 60 detik (kali)
//         Putri = lama bertahan gantung siku tekuk (detik)
export function scoreGantung(raw, gender) {
  if (raw == null || raw === "") return null;
  const v = Number(raw);
  if (gender === "L") {
    if (v >= 19) return 5;
    if (v >= 14) return 4;
    if (v >= 9) return 3;
    if (v >= 5) return 2;
    return 1;
  }
  if (v >= 41) return 5;
  if (v >= 22) return 4;
  if (v >= 10) return 3;
  if (v >= 3) return 2;
  return 1;
}

// Item 3: Baring duduk 60 detik (kali)
export function scoreSitup(reps, gender) {
  if (reps == null || reps === "") return null;
  const v = Number(reps);
  if (gender === "L") {
    if (v >= 41) return 5;
    if (v >= 30) return 4;
    if (v >= 21) return 3;
    if (v >= 10) return 2;
    return 1;
  }
  if (v >= 29) return 5;
  if (v >= 20) return 4;
  if (v >= 10) return 3;
  if (v >= 3) return 2;
  return 1;
}

// Item 4: Loncat tegak (cm)
export function scoreLoncat(cm, gender) {
  if (cm == null || cm === "") return null;
  const v = Number(cm);
  if (gender === "L") {
    if (v >= 73) return 5;
    if (v >= 60) return 4;
    if (v >= 50) return 3;
    if (v >= 39) return 2;
    return 1;
  }
  if (v >= 50) return 5;
  if (v >= 39) return 4;
  if (v >= 30) return 3;
  if (v >= 21) return 2;
  return 1;
}

// Item 5: Lari jauh — putra 1200m, putri 1000m (total detik, makin cepat makin baik)
export function scoreLariJauh(totalDetik, gender) {
  if (totalDetik == null || totalDetik === "") return null;
  const v = Number(totalDetik);
  if (gender === "L") {
    if (v <= 194) return 5;  // 3'14"
    if (v <= 265) return 4;  // 4'25"
    if (v <= 312) return 3;  // 5'12"
    if (v <= 393) return 2;  // 6'33"
    return 1;
  }
  if (v <= 232) return 5;  // 3'52"
  if (v <= 296) return 4;  // 4'56"
  if (v <= 358) return 3;  // 5'58"
  if (v <= 443) return 2;  // 7'23"
  return 1;
}

export function classifyTotal(total) {
  if (total >= 22) return "Baik Sekali";
  if (total >= 18) return "Baik";
  if (total >= 14) return "Sedang";
  if (total >= 10) return "Kurang";
  return "Kurang Sekali";
}

// Total nilai TKJI (5-25) diubah ke skala 0-100 supaya konsisten dengan
// nilai lain di aplikasi (dikali 4: 5->20, 25->100).
export function totalToScale100(total) {
  return total * 4;
}

export function gantungLabel(gender) {
  return gender === "P" ? "Gantung Siku Tekuk (detik bertahan)" : "Gantung Angkat Tubuh 60 Detik (kali)";
}

export function lariJauhLabel(gender) {
  return gender === "P" ? "Lari 1000 Meter" : "Lari 1200 Meter";
}

export function mmssToDetik(menit, detik) {
  const m = Number(menit) || 0;
  const s = Number(detik) || 0;
  return m * 60 + s;
}

export function detikToMMSS(totalDetik) {
  if (totalDetik == null) return { menit: "", detik: "" };
  const m = Math.floor(totalDetik / 60);
  const s = totalDetik % 60;
  return { menit: String(m), detik: String(s) };
}
