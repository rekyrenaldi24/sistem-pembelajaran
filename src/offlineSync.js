import { supabase } from "./supabaseClient.js";

// =========================================================
// MESIN OFFLINE — dipakai di semua menu input data
// =========================================================
// Cara kerja singkat:
// - Setiap kali aplikasi mau menyimpan data (tambah/ubah/hapus), panggil
//   offlineWrite(...) alih-alih memanggil supabase langsung.
// - Kalau lagi online dan berhasil, langsung tersimpan seperti biasa.
// - Kalau lagi offline (atau tiba-tiba gagal karena sinyal hilang di
//   tengah jalan), data disimpan dulu di HP/browser (localStorage) dalam
//   antrian, dan aplikasi tetap menganggapnya "tersimpan" di layar.
// - Begitu ada sinyal lagi (event "online" dari browser, atau dicoba
//   ulang tiap beberapa detik), antrian ini otomatis dikirim ke server
//   satu per satu, sesuai urutan.
// - ID setiap data baru (siswa, kelas, dsb) dibuat di HP (bukan nunggu
//   server), jadi tetap konsisten baik saat online maupun offline.

const QUEUE_KEY = "r3edu_offline_queue_v1";
const listeners = new Set();

export function genId() {
  return crypto.randomUUID();
}

export function isOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function getQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // kalau localStorage penuh/gagal, tidak banyak yang bisa dilakukan;
    // biarkan saja supaya aplikasi tidak crash.
  }
  notifyListeners();
}

export function getPendingCount() {
  return getQueue().length;
}

// Dipakai komponen (mis. badge "3 data belum sinkron") untuk tahu kalau
// jumlah antrian berubah. Mengembalikan fungsi untuk berhenti berlangganan.
export function subscribePending(cb) {
  listeners.add(cb);
  cb(getPendingCount());
  return () => listeners.delete(cb);
}

function notifyListeners() {
  const n = getPendingCount();
  listeners.forEach((cb) => {
    try { cb(n); } catch { /* abaikan error listener */ }
  });
}

function enqueue(item) {
  const queue = getQueue();
  queue.push({ id: genId(), queuedAt: new Date().toISOString(), ...item });
  setQueue(queue);
}

function buildQuery(table, method, payload, { onConflict, match, inFilter } = {}) {
  let q = supabase.from(table);
  if (method === "insert") q = q.insert(payload);
  else if (method === "upsert") q = q.upsert(payload, onConflict ? { onConflict } : undefined);
  else if (method === "update") q = q.update(payload);
  else if (method === "delete") q = q.delete();
  // match: object berisi beberapa filter kolom sekaligus, mis. { guru_id, subject, date }
  if ((method === "update" || method === "delete") && match) {
    Object.entries(match).forEach(([col, val]) => { q = q.eq(col, val); });
  }
  // inFilter: filter tambahan pakai .in(), mis. { column: "student_id", values: [...] }
  if ((method === "update" || method === "delete") && inFilter) {
    q = q.in(inFilter.column, inFilter.values);
  }
  return q;
}

async function runOne(item) {
  const q = buildQuery(item.table, item.method, item.payload, item);
  return await q;
}

// Menyimpan/mengubah/menghapus SATU aksi. Bentuk hasilnya dibuat mirip
// hasil supabase biasa ({ data, error }) plus tanda "offline" supaya
// pemanggil bisa kasih tahu ke user kalau data disimpan offline dulu.
//
// table: nama tabel
// method: "insert" | "upsert" | "update" | "delete"
// payload: object/array data (untuk insert/upsert), atau object data baru (untuk update)
// options: { onConflict, match: {kolom: nilai, ...}, inFilter: { column, values } }
export async function offlineWrite(table, method, payload, options = {}) {
  if (isOnline()) {
    try {
      const q = buildQuery(table, method, payload, options);
      const res = await q;
      return { data: res.data, error: res.error, offline: false };
    } catch (networkErr) {
      // fetch gagal total (bukan error dari server, tapi jaringan putus
      // di tengah proses) -> lanjut ke bagian antre di bawah.
    }
  }
  enqueue({ table, method, payload, ...options });
  return { data: Array.isArray(payload) ? payload : payload, error: null, offline: true };
}

let syncing = false;

// Mengirim semua data yang tertunda ke server, satu per satu sesuai
// urutan. Berhenti begitu ada satu yang gagal karena jaringan (supaya
// urutan tetap terjaga), tapi tetap lanjut kalau errornya bukan soal
// jaringan (data itu dibuang dari antrian + dilaporkan lewat notify).
export async function syncNow(notify) {
  if (syncing || !isOnline()) return;
  syncing = true;
  let success = 0;
  let failed = 0;
  try {
    let queue = getQueue();
    while (queue.length) {
      const item = queue[0];
      try {
        const { error } = await runOne(item);
        if (error) {
          // server merespons tapi menolak (mis. data tidak valid) —
          // bukan soal sinyal, jadi keluarkan dari antrian supaya tidak
          // macet selamanya, dan catat sebagai gagal.
          failed++;
          queue = queue.slice(1);
          setQueue(queue);
          continue;
        }
        success++;
        queue = queue.slice(1);
        setQueue(queue);
      } catch (networkErr) {
        // masih belum ada sinyal -> berhenti, sisanya dicoba lagi nanti
        break;
      }
    }
  } finally {
    syncing = false;
  }
  if (notify && (success || failed)) {
    if (failed > 0) notify(`${success} data tersinkron, ${failed} data gagal (ditolak server) dan dibuang dari antrian.`);
    else if (success > 0) notify(`${success} data berhasil disinkronkan.`);
  }
}

// Dipanggil sekali di setiap layar Guru/Wali Kelas: otomatis coba sinkron
// tiap kali browser mendeteksi koneksi kembali, dan juga dicoba ulang
// berkala (jaga-jaga kalau event "online" tidak selalu akurat).
export function initAutoSync(notify) {
  const handler = () => syncNow(notify);
  window.addEventListener("online", handler);
  const interval = setInterval(() => { if (getPendingCount() > 0) syncNow(notify); }, 20000);
  // coba langsung sekali saat aplikasi dibuka (kalau kebetulan online dan ada sisa antrian)
  syncNow(notify);
  return () => {
    window.removeEventListener("online", handler);
    clearInterval(interval);
  };
}
