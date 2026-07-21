import React, { useState } from "react";
import { supabase } from "./supabaseClient.js";
import { NAVY, NAVY2, ORANGE, MUTED } from "./shared.jsx";
import { Loader2 } from "lucide-react";

export default function Auth() {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("guru");
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message === "Invalid login credentials" ? "Email atau password salah." : error.message);
    setBusy(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    if (!name.trim()) { setErr("Nama wajib diisi."); setBusy(false); return; }
    if (role === "guru" && !subject.trim()) { setErr("Mata pelajaran wajib diisi."); setBusy(false); return; }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setErr(error.message); setBusy(false); return; }

    const userId = data.user?.id;
    if (!userId) {
      setErr("Pendaftaran berhasil. Silakan cek email untuk konfirmasi, lalu masuk.");
      setBusy(false);
      setMode("login");
      return;
    }
    const { error: profileErr } = await supabase.from("profiles").insert({
      id: userId, name: name.trim(), role, subject: role === "guru" ? subject.trim() : null,
    });
    if (profileErr) { setErr(profileErr.message); setBusy(false); return; }
    setBusy(false);
    // sebagian proyek Supabase mewajibkan konfirmasi email dulu
    if (!data.session) {
      setErr("Akun dibuat. Cek email untuk konfirmasi, lalu masuk.");
      setMode("login");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-5" style={{ background: NAVY, fontFamily: "Arial, sans-serif" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-7">
          <div className="text-white font-bold text-2xl">Sistem Pembelajaran</div>
          <div className="text-sm mt-1" style={{ color: "#93A0BE" }}>Guru Mapel & Wali Kelas</div>
        </div>

        <div className="rounded-xl p-6" style={{ background: "white" }}>
          <div className="flex rounded-lg overflow-hidden mb-5" style={{ border: "1px solid #E7E9EE" }}>
            {["login", "signup"].map((m) => (
              <button key={m} onClick={() => { setMode(m); setErr(""); }}
                className="flex-1 py-2.5 text-sm font-bold"
                style={{ background: mode === m ? NAVY : "white", color: mode === m ? "white" : MUTED }}>
                {m === "login" ? "Masuk" : "Daftar Akun"}
              </button>
            ))}
          </div>

          <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="flex flex-col gap-3">
            {mode === "signup" && (
              <>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap"
                  className="text-sm px-3 py-2.5 rounded-lg" style={{ background: "#F4F5F7", color: NAVY }} required />
                <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #E7E9EE" }}>
                  {[["guru", "Guru Mapel"], ["wali_kelas", "Wali Kelas"]].map(([v, label]) => (
                    <button key={v} type="button" onClick={() => setRole(v)}
                      className="flex-1 py-2 text-xs font-bold"
                      style={{ background: role === v ? ORANGE : "white", color: role === v ? "white" : MUTED }}>
                      {label}
                    </button>
                  ))}
                </div>
                {role === "guru" && (
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Mata pelajaran, mis. PJOK"
                    className="text-sm px-3 py-2.5 rounded-lg" style={{ background: "#F4F5F7", color: NAVY }} required />
                )}
              </>
            )}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
              className="text-sm px-3 py-2.5 rounded-lg" style={{ background: "#F4F5F7", color: NAVY }} required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min. 6 karakter)"
              className="text-sm px-3 py-2.5 rounded-lg" style={{ background: "#F4F5F7", color: NAVY }} minLength={6} required />

            {err && <div className="text-xs font-medium" style={{ color: "#D6455A" }}>{err}</div>}

            <button type="submit" disabled={busy}
              className="mt-1 py-2.5 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2"
              style={{ background: NAVY2 }}>
              {busy && <Loader2 size={15} className="animate-spin" />}
              {mode === "login" ? "Masuk" : "Buat Akun"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
