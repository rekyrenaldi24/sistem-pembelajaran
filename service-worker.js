// Service worker minimal — hanya supaya browser mengenali ini sebagai aplikasi
// yang bisa di-install. Tidak menyimpan cache apa pun, supaya versi terbaru
// selalu dimuat (tidak ada risiko tampilan lama "nyangkut").
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {}); // sengaja dikosongkan (pass-through ke jaringan)
