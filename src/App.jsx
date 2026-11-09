import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
import Auth from "./Auth.jsx";
import ResetPassword from "./ResetPassword.jsx";
import GuruApp from "./GuruApp.jsx";
import WaliKelasApp from "./WaliKelasApp.jsx";
import SiswaApp from "./SiswaApp.jsx";
import KepalaProgramApp from "./KepalaProgramApp.jsx";
import AdminApp from "./AdminApp.jsx";
import BiodataFormPublic from "./BiodataFormPublic.jsx";
import { NAVY, NAVY2, ORANGE, BG, MUTED, setCurrentSemesterId } from "./shared.jsx";
import { Loader2, LogOut, Clock, GraduationCap, Users2, BarChart3, ShieldCheck } from "lucide-react";

// Bilah kecil di atas aplikasi: memilih semester yang dibuka. Semester
// lama (arsip) tetap bisa dibuka dan dilihat kapan saja.
function SemesterBar({ semesters, viewSemId, activeId, onChange }) {
  const isArchive = viewSemId !== activeId;
  return (
    <div className="px-4 py-1.5 flex items-center gap-2 flex-wrap text-xs" style={{ background: isArchive ? "#FFF4EE" : "#EEF0F3", color: isArchive ? "#9A4A22" : MUTED }}>
      <span className="font-bold">Semester</span>
      <select value={viewSemId || ""} onChange={(e) => onChange(e.target.value)} disabled={semesters.length < 2}
        className="text-xs font-semibold px-2 py-1 rounded-md border-0" style={{ background: "white", color: NAVY }}>
        {semesters.map((x) => <option key={x.id} value={x.id}>{x.name}{x.is_active ? " (aktif)" : " — arsip"}</option>)}
      </select>
      {isArchive && <span>Anda membuka arsip semester lama. Perubahan yang disimpan masuk ke semester ini.</span>}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = belum tahu, null = belum login
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [activeRole, setActiveRole] = useState(null); // "guru" | "wali_kelas" | null (belum dipilih)
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setProfile(null); return; }
    setLoadingProfile(true);
    supabase.from("profiles").select("*").eq("id", session.user.id).single()
      .then(({ data }) => { setProfile(data); setLoadingProfile(false); });
  }, [session]);

  useEffect(() => { setActiveRole(null); }, [session?.user?.id]);

  // Daftar semester (kalau tabelnya sudah ada). viewSemId = semester yang sedang dibuka.
  const [semesters, setSemesters] = useState([]);
  const [viewSemId, setViewSemId] = useState(null);
  const loadSemesters = async (switchToActive = false) => {
    const { data, error } = await supabase.from("semesters").select("*").order("created_at", { ascending: false });
    if (error || !data || data.length === 0) { setSemesters([]); setViewSemId(null); return; }
    setSemesters(data);
    const act = data.find((x) => x.is_active) || data[0];
    setViewSemId((prev) => (switchToActive || !prev || !data.some((x) => x.id === prev) ? act.id : prev));
  };
  useEffect(() => {
    if (profile?.approved) loadSemesters(true);
    else { setSemesters([]); setViewSemId(null); }
  }, [profile?.id, profile?.approved]); // eslint-disable-line

  // Halaman formulir biodata untuk SISWA (tanpa login) — kalau URL-nya
  // ada ?isi_biodata=<id kelas>, langsung tampilkan formulir itu saja,
  // jangan lewat proses login sama sekali.
  const biodataClassId = new URLSearchParams(window.location.search).get("isi_biodata");
  if (biodataClassId) {
    return <BiodataFormPublic classId={biodataClassId} />;
  }

  if (recoveryMode) {
    return <ResetPassword onDone={() => setRecoveryMode(false)} />;
  }

  if (session === undefined || (session && loadingProfile)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <Loader2 className="animate-spin" size={20} style={{ color: MUTED }} />
      </div>
    );
  }

  if (!session) return <Auth />;

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-6" style={{ background: BG }}>
        <div className="text-sm" style={{ color: MUTED }}>
          Profil akun belum lengkap atau belum dikonfirmasi. Coba muat ulang halaman, atau hubungi admin sekolah.
        </div>
        <button onClick={() => supabase.auth.signOut()} className="text-xs font-bold underline" style={{ color: NAVY }}>
          Keluar
        </button>
      </div>
    );
  }

  if (!profile.approved) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-6" style={{ background: BG }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-1" style={{ background: NAVY + "14" }}>
          <Clock size={22} color={NAVY} />
        </div>
        <div className="text-base font-bold" style={{ color: NAVY }}>Menunggu Persetujuan</div>
        <div className="text-sm max-w-sm" style={{ color: MUTED }}>
          Akun Anda ({profile.name}) sudah terdaftar, tapi belum diaktifkan oleh admin sekolah.
          Hubungi admin untuk mengaktifkan akun Anda.
        </div>
        <button onClick={() => supabase.auth.signOut()} className="text-xs font-bold underline mt-1" style={{ color: NAVY }}>
          Keluar
        </button>
      </div>
    );
  }

  // dukung akun lama yang masih pakai kolom "role" tunggal
  const isGuru = !!profile.is_guru || profile.role === "guru";
  const isWaliKelas = !!profile.is_wali_kelas || profile.role === "wali_kelas";
  const isKepalaProgram = !!profile.is_kepala_program;
  const isSiswa = !!profile.is_siswa;
  const isAdmin = !!profile.is_admin;

  // Daftar peran yang dimiliki akun ini (satu akun bisa punya lebih dari satu).
  const availableRoles = [
    isAdmin && { key: "admin", label: "Admin", icon: ShieldCheck, subtitle: "Pantau semua & kelola data" },
    isGuru && { key: "guru", label: "Guru Mapel", icon: GraduationCap, subtitle: profile.subject || "—" },
    isWaliKelas && { key: "wali_kelas", label: "Wali Kelas", icon: Users2, subtitle: "Absensi, catatan & tabungan" },
    isKepalaProgram && { key: "kepala_program", label: "Kepala Program", icon: BarChart3, subtitle: "Pantau absen & tabungan jurusan" },
    isSiswa && { key: "siswa", label: "Sekretaris Kelas", icon: Users2, subtitle: "Absensi & tabungan kelas" },
  ].filter(Boolean);

  if (availableRoles.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-6" style={{ background: BG }}>
        <div className="text-sm" style={{ color: MUTED }}>
          Akun ini belum punya peran yang aktif. Hubungi admin sekolah.
        </div>
        <button onClick={() => supabase.auth.signOut()} className="text-xs font-bold underline" style={{ color: NAVY }}>
          Keluar
        </button>
      </div>
    );
  }

  if (availableRoles.length > 1 && !activeRole) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-6" style={{ background: NAVY }}>
        <div>
          <div className="text-white font-bold text-xl">Halo, {profile.name}</div>
          <div className="text-sm mt-1" style={{ color: "#93A0BE" }}>Mau masuk sebagai apa hari ini?</div>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4">
          {availableRoles.map((r) => (
            <button key={r.key} onClick={() => setActiveRole(r.key)}
              className="w-64 rounded-xl p-6 flex flex-col items-center gap-2" style={{ background: NAVY2 }}>
              <r.icon size={26} color={ORANGE} />
              <div className="text-white font-bold text-sm">{r.label}</div>
              <div className="text-xs" style={{ color: "#93A0BE" }}>{r.subtitle}</div>
            </button>
          ))}
        </div>
        <button onClick={() => supabase.auth.signOut()} className="text-xs font-bold underline" style={{ color: "#93A0BE" }}>
          Keluar
        </button>
      </div>
    );
  }

  const role = availableRoles.length > 1 ? activeRole : availableRoles[0].key;
  const canSwitchRole = availableRoles.length > 1;
  const onSwitchRole = canSwitchRole ? () => setActiveRole(null) : undefined;
  const onLogout = () => supabase.auth.signOut();

  // Semester yang dibuka. Sekretaris kelas selalu di semester aktif.
  const activeSem = semesters.find((x) => x.is_active);
  const viewSem = role === "siswa" ? activeSem : (semesters.find((x) => x.id === viewSemId) || activeSem);
  setCurrentSemesterId(viewSem?.id || null);
  // key = semester: ganti semester -> aplikasi dimuat ulang dengan data semester itu.
  const appKey = viewSem?.id || "tanpa-semester";

  const appEl =
    role === "admin" ? <AdminApp key={appKey} profile={profile} onLogout={onLogout} onSwitchRole={onSwitchRole} semesters={semesters} onSemestersChanged={() => loadSemesters(true)} /> :
    role === "guru" ? <GuruApp key={appKey} profile={profile} onLogout={onLogout} onSwitchRole={onSwitchRole} /> :
    role === "wali_kelas" ? <WaliKelasApp key={appKey} profile={profile} onLogout={onLogout} onSwitchRole={onSwitchRole} /> :
    role === "siswa" ? <SiswaApp key={appKey} profile={profile} onLogout={onLogout} onSwitchRole={onSwitchRole} /> :
    <KepalaProgramApp key={appKey} profile={profile} onLogout={onLogout} onSwitchRole={onSwitchRole} />;

  return (
    <>
      {role !== "siswa" && semesters.length > 0 && (
        <SemesterBar semesters={semesters} viewSemId={viewSem?.id} activeId={activeSem?.id} onChange={setViewSemId} />
      )}
      {appEl}
    </>
  );
}
