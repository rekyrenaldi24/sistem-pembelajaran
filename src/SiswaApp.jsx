import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
import { NAVY, NAVY2, BG, MUTED, Toast, OfflineBanner, useOfflineStatus } from "./shared.jsx";
import { AbsensiTab, CatatanTab, TabunganTab } from "./WaliKelasApp.jsx";
import { CalendarCheck, StickyNote, PiggyBank, LogOut, Repeat } from "lucide-react";

const NAV = [
  { key: "absensi", label: "Absensi Kelas", icon: CalendarCheck },
  { key: "tabungan", label: "Tabungan", icon: PiggyBank },
  { key: "catatan", label: "Catatan", icon: StickyNote },
];

// Akun Siswa = dipegang sekretaris kelas. Sengaja HANYA 3 menu ini (tidak ada
// Biodata, tidak ada Kelas & Siswa, tidak ada Riwayat) — sesuai batas yang
// diminta. Di balik layar, komponen yang dipakai SAMA PERSIS dengan yang
// dipakai Wali Kelas (diimpor dari WaliKelasApp.jsx), supaya datanya otomatis
// nyambung ke rekap Wali Kelas — cuma dikunci ke SATU kelas saja (kelas yang
// diwakili akun ini) dan `ownerId` diarahkan ke wali kelas kelas itu, bukan
// ke akun sekretarisnya sendiri.
export default function SiswaApp({ profile, onLogout, onSwitchRole }) {
  const [tab, setTab] = useState("absensi");
  const [kelas, setKelas] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };
  const { pending, offline, syncNow } = useOfflineStatus(notify);

  useEffect(() => {
    (async () => {
      if (!profile.siswa_class_id) { setLoading(false); return; }
      const { data: c } = await supabase.from("classes").select("*").eq("id", profile.siswa_class_id).maybeSingle();
      setKelas(c || null);
      const { data: s } = await supabase.from("students").select("*").eq("class_id", profile.siswa_class_id).order("name");
      setStudents(s || []);
      setLoading(false);
    })();
  }, [profile.siswa_class_id]);

  if (!profile.siswa_class_id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-6" style={{ background: BG }}>
        <div className="text-sm" style={{ color: MUTED }}>Akun ini belum dikaitkan ke kelas manapun. Hubungi wali kelas Anda.</div>
        <button onClick={onLogout} className="text-xs font-bold underline" style={{ color: NAVY }}>Keluar</button>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm" style={{ background: BG, color: MUTED }}>Memuat…</div>;
  }

  const ownerId = kelas?.owner_id || kelas?.wali_kelas_id || null;
  const classesArr = kelas ? [kelas] : [];
  const noop = () => {};

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row" style={{ background: BG, fontFamily: "Arial, sans-serif" }}>
      <aside className="md:w-60 w-full shrink-0 flex flex-col" style={{ background: NAVY }}>
        <div className="flex md:block items-center justify-between px-4 md:px-6 py-3 md:pt-7 md:pb-5">
          <div>
            <div className="text-white font-bold text-base md:text-lg leading-tight">R3 EDU</div>
            <div className="hidden md:block text-xs mt-0.5" style={{ color: "#93A0BE" }}>Sekretaris · {kelas?.name || "—"}</div>
          </div>
          <div className="flex items-center gap-1 md:hidden">
            {onSwitchRole && (
              <button onClick={onSwitchRole} title="Ganti Peran" className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ color: "#A7B1C7" }}>
                <Repeat size={18} />
              </button>
            )}
            <button onClick={onLogout} title="Keluar" className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ color: "#A7B1C7" }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
        <nav className="flex md:flex-col flex-1 md:px-3 md:py-2 overflow-x-auto md:overflow-visible" style={{ borderTop: "1px solid #243453" }}>
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = tab === n.key;
            return (
              <button key={n.key} onClick={() => setTab(n.key)}
                className="flex items-center gap-2.5 px-4 md:px-3 py-3 md:py-2.5 md:rounded-lg text-sm font-semibold shrink-0 md:mb-1 whitespace-nowrap"
                style={{ color: active ? "white" : "#A7B1C7", background: active ? NAVY2 : "transparent" }}>
                <Icon size={17} /><span>{n.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="hidden md:block mt-auto px-3 py-5">
          {onSwitchRole && (
            <button onClick={onSwitchRole} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold w-full mb-1" style={{ color: "#A7B1C7" }}>
              <Repeat size={16} /> Ganti Peran
            </button>
          )}
          <button onClick={onLogout} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold w-full" style={{ color: "#A7B1C7" }}>
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-5 md:p-8">
        <OfflineBanner offline={offline} pending={pending} onSyncNow={syncNow} />
        {tab === "absensi" && <AbsensiTab profile={profile} classes={classesArr} activeClassId={kelas?.id || ""} setActiveClassId={noop} students={students} notify={notify} activeClass={kelas} ownerId={ownerId} />}
        {tab === "tabungan" && <TabunganTab profile={profile} classes={classesArr} activeClassId={kelas?.id || ""} setActiveClassId={noop} students={students} notify={notify} activeClass={kelas} ownerId={ownerId} />}
        {tab === "catatan" && <CatatanTab profile={profile} classes={classesArr} activeClassId={kelas?.id || ""} setActiveClassId={noop} students={students} notify={notify} ownerId={ownerId} />}
      </main>
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
