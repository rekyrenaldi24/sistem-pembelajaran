// Service worker R3 EDU — sekarang benar-benar menyimpan cache supaya
// APLIKASINYA SENDIRI (HTML/JS/CSS) tetap bisa terbuka walau HP sedang
// tidak ada sinyal (mis. dipakai di lapangan). Data (absensi, nilai, dst)
// TIDAK disimpan di sini — itu ditangani terpisah oleh aplikasi lewat
// antrian offline (lihat src/offlineSync.js), supaya begitu ada sinyal
// lagi, data otomatis terkirim ke server.
//
// Strategi: "network first, fallback ke cache". Artinya:
// - Kalau ada sinyal: selalu ambil versi TERBARU dari server, sekaligus
//   menyimpannya ke cache untuk jaga-jaga.
// - Kalau TIDAK ada sinyal: pakai versi terakhir yang tersimpan di cache.
// Permintaan ke Supabase (data sekolah) sengaja TIDAK disentuh service
// worker ini — biar ditangani apa adanya oleh aplikasi.

const CACHE_NAME = "r3edu-shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("r3edu-shell-") && k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Cuma tangani permintaan GET ke domain aplikasi sendiri (HTML/JS/CSS/
  // gambar/ikon). Permintaan ke Supabase (domain lain) dan metode selain
  // GET (POST/PATCH/DELETE) dibiarkan lewat apa adanya, tidak di-cache.
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      } catch (err) {
        const cached = await cache.match(req);
        if (cached) return cached;
        // Untuk perpindahan halaman (navigasi) yang belum pernah dibuka
        // sebelumnya, coba fallback ke index.html supaya app shell tetap
        // muncul (bukan halaman error browser).
        if (req.mode === "navigate") {
          const shell = await cache.match("/index.html");
          if (shell) return shell;
        }
        throw err;
      }
    })()
  );
});
