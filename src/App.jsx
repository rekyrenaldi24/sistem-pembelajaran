import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
import Auth from "./Auth.jsx";
import GuruApp from "./GuruApp.jsx";
import WaliKelasApp from "./WaliKelasApp.jsx";
import { NAVY, NAVY2, ORANGE, BG, MUTED } from "./shared.jsx";
import { Loader2, LogOut, Clock, GraduationCap, Users2 } from "lucide-react";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = belum tahu, null = belum login
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [activeRole, setActiveRole] = useState(null); // "guru" | "wali_kelas" | null (belum dipilih)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setProfile(null); return; }
    setLoadingProfile(true);
    supabase.from("profiles").select("*").eq("id", session.user.id).single()
      .then(({ data }) => { setProfile(data); setLoadingProfile(false); });
  }, [session]);

  useEffect(() => { setActiveRole(null); }, [session?.user?.id]);

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

  if (isGuru && isWaliKelas && !activeRole) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-6" style={{ background: NAVY }}>
        <div>
          <div className="text-white font-bold text-xl">Halo, {profile.name}</div>
          <div className="text-sm mt-1" style={{ color: "#93A0BE" }}>Mau masuk sebagai apa hari ini?</div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={() => setActiveRole("guru")}
            className="w-64 rounded-xl p-6 flex flex-col items-center gap-2" style={{ background: NAVY2 }}>
            <GraduationCap size={26} color={ORANGE} />
            <div className="text-white font-bold text-sm">Guru Mapel</div>
            <div className="text-xs" style={{ color: "#93A0BE" }}>{profile.subject || "—"}</div>
          </button>
          <button onClick={() => setActiveRole("wali_kelas")}
            className="w-64 rounded-xl p-6 flex flex-col items-center gap-2" style={{ background: NAVY2 }}>
            <Users2 size={26} color={ORANGE} />
            <div className="text-white font-bold text-sm">Wali Kelas</div>
            <div className="text-xs" style={{ color: "#93A0BE" }}>Absensi, catatan & tabungan</div>
          </button>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="text-xs font-bold underline" style={{ color: "#93A0BE" }}>
          Keluar
        </button>
      </div>
    );
  }

  const role = isGuru && isWaliKelas ? activeRole : (isGuru ? "guru" : "wali_kelas");
  const canSwitchRole = isGuru && isWaliKelas;
  const onSwitchRole = canSwitchRole ? () => setActiveRole(null) : undefined;

  return role === "guru"
    ? <GuruApp profile={profile} onLogout={() => supabase.auth.signOut()} onSwitchRole={onSwitchRole} />
    : <WaliKelasApp profile={profile} onLogout={() => supabase.auth.signOut()} onSwitchRole={onSwitchRole} />;
}
