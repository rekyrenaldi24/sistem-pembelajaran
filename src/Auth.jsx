import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
import { NAVY, NAVY2, ORANGE, MUTED, GREEN } from "./shared.jsx";
import { Loader2 } from "lucide-react";

export default function Auth() {
  const [mode, setMode] = useState("login"); // login | signup | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isGuru, setIsGuru] = useState(true);
  const [isWaliKelas, setIsWaliKelas] = useState(false);
  const [isKepalaProgram, setIsKepalaProgram] = useState(false);
  const [subject, setSubject] = useState("");
  const [jurusanList, setJurusanList] = useState([]);
  const [kepalaProgramJurusanId, setKepalaProgramJurusanId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    supabase.from("jurusan").select("id, name").order("name").then(({ data }) => {
      if (data) setJurusanList(data);
    });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message === "Invalid login credentials" ? "Email atau password salah." : error.message);
    setBusy(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setErr(""); setInfo(""); setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setInfo("Link reset password sudah dikirim ke email Anda. Buka email itu dan klik linknya untuk membuat password baru.");
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    if (!name.trim()) { setErr("Nama wajib diisi."); setBusy(false); return; }
    if (!isGuru && !isWaliKelas && !isKepalaProgram) { setErr("Pilih minimal satu peran: Guru Mapel, Wali Kelas, atau Kepala Program."); setBusy(false); return; }
    if (isGuru && !subject.trim()) { setErr("Mata pelajaran wajib diisi."); setBusy(false); return; }
    if (isKepalaProgram && !kepalaProgramJurusanId) { setErr("Pilih jurusan yang akan Anda pantau."); setBusy(false); return; }

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
      id: userId, name: name.trim(), is_guru: isGuru, is_wali_kelas: isWaliKelas,
      is_kepala_program: isKepalaProgram,
      subject: isGuru ? subject.trim() : null,
      kepala_program_jurusan_id: isKepalaProgram ? kepalaProgramJurusanId : null,
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
          <div className="text-white font-bold text-2xl">R3 EDU</div>
          <div className="text-sm mt-1" style={{ color: "#93A0BE" }}>Guru Mapel · Wali Kelas · Kepala Program</div>
        </div>

        <div className="rounded-xl p-6" style={{ background: "white" }}>
          {mode !== "forgot" && (
            <div className="flex rounded-lg overflow-hidden mb-5" style={{ border: "1px solid #E7E9EE" }}>
              {["login", "signup"].map((m) => (
                <button key={m} onClick={() => { setMode(m); setErr(""); setInfo(""); }}
                  className="flex-1 py-2.5 text-sm font-bold"
                  style={{ background: mode === m ? NAVY : "white", color: mode === m ? "white" : MUTED }}>
                  {m === "login" ? "Masuk" : "Daftar Akun"}
                </button>
              ))}
            </div>
          )}

          {mode === "forgot" ? (
            <>
              <div className="text-sm font-bold mb-1" style={{ color: NAVY }}>Lupa Password</div>
              <div className="text-xs mb-4" style={{ color: MUTED }}>Masukkan email akun Anda, kami kirimkan link untuk membuat password baru.</div>
              <form onSubmit={handleForgotPassword} className="flex flex-col gap-3">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
                  className="text-sm px-3 py-2.5 rounded-lg" style={{ background: "#F4F5F7", color: NAVY }} required />
                {err && <div className="text-xs font-medium" style={{ color: "#D6455A" }}>{err}</div>}
                {info && <div className="text-xs font-medium" style={{ color: GREEN }}>{info}</div>}
                <button type="submit" disabled={busy}
                  className="mt-1 py-2.5 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2"
                  style={{ background: NAVY2 }}>
                  {busy && <Loader2 size={15} className="animate-spin" />}
                  Kirim Link Reset
                </button>
                <button type="button" onClick={() => { setMode("login"); setErr(""); setInfo(""); }}
                  className="text-xs font-bold underline text-center" style={{ color: MUTED }}>
                  Kembali ke Masuk
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="flex flex-col gap-3">
              {mode === "signup" && (
                <>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap"
                    className="text-sm px-3 py-2.5 rounded-lg" style={{ background: "#F4F5F7", color: NAVY }} required />
                  <div className="text-xs font-semibold" style={{ color: MUTED }}>Peran (boleh pilih lebih dari satu):</div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setIsGuru((v) => !v)}
                      className="flex-1 py-2 rounded-lg text-xs font-bold border"
                      style={{ background: isGuru ? ORANGE : "white", color: isGuru ? "white" : MUTED, borderColor: isGuru ? ORANGE : "#E7E9EE" }}>
                      {isGuru ? "✓ " : ""}Guru Mapel
                    </button>
                    <button type="button" onClick={() => setIsWaliKelas((v) => !v)}
                      className="flex-1 py-2 rounded-lg text-xs font-bold border"
                      style={{ background: isWaliKelas ? ORANGE : "white", color: isWaliKelas ? "white" : MUTED, borderColor: isWaliKelas ? ORANGE : "#E7E9EE" }}>
                      {isWaliKelas ? "✓ " : ""}Wali Kelas
                    </button>
                  </div>
                  <button type="button" onClick={() => setIsKepalaProgram((v) => !v)}
                    className="w-full py-2 rounded-lg text-xs font-bold border"
                    style={{ background: isKepalaProgram ? ORANGE : "white", color: isKepalaProgram ? "white" : MUTED, borderColor: isKepalaProgram ? ORANGE : "#E7E9EE" }}>
                    {isKepalaProgram ? "✓ " : ""}Kepala Program
                  </button>
                  {isGuru && (
                    <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Mata pelajaran, mis. PJOK"
                      className="text-sm px-3 py-2.5 rounded-lg" style={{ background: "#F4F5F7", color: NAVY }} required />
                  )}
                  {isKepalaProgram && (
                    <select value={kepalaProgramJurusanId} onChange={(e) => setKepalaProgramJurusanId(e.target.value)}
                      className="text-sm px-3 py-2.5 rounded-lg" style={{ background: "#F4F5F7", color: NAVY }} required>
                      <option value="">Pilih jurusan yang dipantau</option>
                      {jurusanList.map((j) => (
                        <option key={j.id} value={j.id}>{j.name}</option>
                      ))}
                    </select>
                  )}
                </>
              )}
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
                className="text-sm px-3 py-2.5 rounded-lg" style={{ background: "#F4F5F7", color: NAVY }} required />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min. 6 karakter)"
                className="text-sm px-3 py-2.5 rounded-lg" style={{ background: "#F4F5F7", color: NAVY }} minLength={6} required />

              {mode === "login" && (
                <button type="button" onClick={() => { setMode("forgot"); setErr(""); setInfo(""); }}
                  className="text-xs font-bold underline self-end" style={{ color: MUTED }}>
                  Lupa password?
                </button>
              )}

              {err && <div className="text-xs font-medium" style={{ color: "#D6455A" }}>{err}</div>}

              <button type="submit" disabled={busy}
                className="mt-1 py-2.5 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2"
                style={{ background: NAVY2 }}>
                {busy && <Loader2 size={15} className="animate-spin" />}
                {mode === "login" ? "Masuk" : "Buat Akun"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
