import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
import Auth from "./Auth.jsx";
import ResetPassword from "./ResetPassword.jsx";
import GuruApp from "./GuruApp.jsx";
import WaliKelasApp from "./WaliKelasApp.jsx";
import SiswaApp from "./SiswaApp.jsx";
import BiodataFormPublic from "./BiodataFormPublic.jsx";
import { NAVY, NAVY2, ORANGE, BG, MUTED } from "./shared.jsx";
import { Loader2, LogOut, Clock, GraduationCap, Users2, BarChart3, Hourglass } from "lucide-react";

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

  // Daftar peran yang dimiliki akun ini (satu akun bisa punya lebih dari satu).
  const availableRoles = [
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

  if (role === "guru") return <GuruApp profile={profile} onLogout={onLogout} onSwitchRole={onSwitchRole} />;
  if (role === "wali_kelas") return <WaliKelasApp profile={profile} onLogout={onLogout} onSwitchRole={onSwitchRole} />;
  if (role === "siswa") return <SiswaApp profile={profile} onLogout={onLogout} onSwitchRole={onSwitchRole} />;

  // Kepala Program sedang disiapkan di tahap berikutnya.
  const roleLabel = "Kepala Program";
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6" style={{ background: BG }}>
      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-1" style={{ background: NAVY + "14" }}>
        <Hourglass size={22} color={NAVY} />
      </div>
      <div className="text-base font-bold" style={{ color: NAVY }}>Menu {roleLabel} Segera Hadir</div>
      <div className="text-sm max-w-sm" style={{ color: MUTED }}>
        Akun Anda sudah terdaftar sebagai {roleLabel}, tapi menunya masih dalam pengembangan. Akan aktif di update berikutnya.
      </div>
      <div className="flex gap-3">
        {canSwitchRole && (
          <button onClick={onSwitchRole} className="text-xs font-bold underline" style={{ color: NAVY }}>
            Ganti Peran
          </button>
        )}
        <button onClick={onLogout} className="text-xs font-bold underline" style={{ color: NAVY }}>
          Keluar
        </button>
      </div>
    </div>
  );
}
