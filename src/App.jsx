import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
import Auth from "./Auth.jsx";
import GuruApp from "./GuruApp.jsx";
import WaliKelasApp from "./WaliKelasApp.jsx";
import { NAVY, BG, MUTED } from "./shared.jsx";
import { Loader2, LogOut } from "lucide-react";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = belum tahu, null = belum login
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

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

  return profile.role === "guru"
    ? <GuruApp profile={profile} onLogout={() => supabase.auth.signOut()} />
    : <WaliKelasApp profile={profile} onLogout={() => supabase.auth.signOut()} />;
}
