import React, { useState } from "react";
import { supabase } from "./supabaseClient.js";
import { NAVY, NAVY2, MUTED, GREEN } from "./shared.jsx";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (password.length < 6) { setErr("Password minimal 6 karakter."); return; }
    if (password !== confirm) { setErr("Konfirmasi password tidak sama."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setDone(true);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-5" style={{ background: NAVY, fontFamily: "Arial, sans-serif" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-7">
          <div className="text-white font-bold text-2xl">R3 EDU</div>
          <div className="text-sm mt-1" style={{ color: "#93A0BE" }}>Buat Password Baru</div>
        </div>

        <div className="rounded-xl p-6" style={{ background: "white" }}>
          {done ? (
            <div className="flex flex-col items-center text-center gap-3 py-2">
              <CheckCircle2 size={36} color={GREEN} />
              <div className="text-sm font-bold" style={{ color: NAVY }}>Password berhasil diubah</div>
              <div className="text-xs" style={{ color: MUTED }}>Silakan lanjutkan menggunakan aplikasi dengan password baru Anda.</div>
              <button onClick={onDone} className="mt-2 w-full py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: NAVY2 }}>
                Lanjutkan
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="text-xs mb-1" style={{ color: MUTED }}>Masukkan password baru untuk akun Anda.</div>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password baru (min. 6 karakter)"
                className="text-sm px-3 py-2.5 rounded-lg" style={{ background: "#F4F5F7", color: NAVY }} minLength={6} required />
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Ulangi password baru"
                className="text-sm px-3 py-2.5 rounded-lg" style={{ background: "#F4F5F7", color: NAVY }} minLength={6} required />
              {err && <div className="text-xs font-medium" style={{ color: "#D6455A" }}>{err}</div>}
              <button type="submit" disabled={busy}
                className="mt-1 py-2.5 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2" style={{ background: NAVY2 }}>
                {busy && <Loader2 size={15} className="animate-spin" />}
                Simpan Password Baru
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
