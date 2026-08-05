import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
import { NAVY, ORANGE, BG, INK, MUTED, GREEN, RED } from "./shared.jsx";
import { CheckCircle2, Loader2 } from "lucide-react";

// Halaman ini SENGAJA tidak butuh login — dibuka siswa lewat link yang
// dibagikan wali kelas (mis. https://.../?isi_biodata=<id kelas>).
// Kiriman dari sini masuk ke "kotak surat" (tabel biodata_submissions)
// yang otomatis diterapkan ke Biodata Siswa oleh server (lihat migrasi
// add_biodata_public_form.sql) — jadi begitu disubmit, wali kelas tidak
// perlu melakukan apa-apa lagi.
export default function BiodataFormPublic({ classId }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [address, setAddress] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [familyBackground, setFamilyBackground] = useState("");
  const [economicNotes, setEconomicNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("biodata_form_students").select("*").eq("class_id", classId).order("name");
      if (error) { setLoadError(true); setLoading(false); return; }
      setStudents(data || []);
      setLoading(false);
    })();
  }, [classId]);

  const submit = async () => {
    setError("");
    if (!studentId) return setError("Pilih nama kamu dulu.");
    setSubmitting(true);
    const { error } = await supabase.from("biodata_submissions").insert({
      student_id: studentId,
      address: address.trim() || null,
      parent_phone: parentPhone.trim() || null,
      family_background: familyBackground.trim() || null,
      economic_notes: economicNotes.trim() || null,
    });
    setSubmitting(false);
    if (error) return setError("Gagal mengirim: " + error.message);
    setDone(true);
  };

  const inputCls = "text-sm px-3 py-2.5 rounded-lg w-full";
  const inputStyle = { background: BG, color: INK };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <Loader2 className="animate-spin" size={22} style={{ color: MUTED }} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 text-center px-6" style={{ background: BG }}>
        <div className="text-sm font-bold" style={{ color: RED }}>Link tidak valid atau bermasalah.</div>
        <div className="text-xs" style={{ color: MUTED }}>Minta wali kelas mengirim ulang link-nya.</div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-6" style={{ background: BG }}>
        <CheckCircle2 size={40} style={{ color: GREEN }} />
        <div className="text-base font-bold" style={{ color: INK }}>Terima kasih!</div>
        <div className="text-sm max-w-xs" style={{ color: MUTED }}>Data kamu sudah terkirim ke wali kelas.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: BG }}>
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="text-lg font-bold" style={{ color: NAVY }}>R3 EDU</div>
          <div className="text-sm mt-1" style={{ color: MUTED }}>Formulir Biodata Siswa</div>
        </div>

        <div className="rounded-xl p-5" style={{ background: "#fff" }}>
          <div className="text-xs mb-4" style={{ color: MUTED }}>
            Isi sesuai kondisi kamu yang sebenarnya. Data ini hanya bisa dilihat oleh wali kelasmu.
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>Nama Kamu</label>
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inputCls} style={inputStyle}>
                <option value="">— Pilih nama —</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>Alamat Rumah</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Alamat rumah"
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>Nomor WA Orang Tua/Wali</label>
              <input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="mis. 081234567890"
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>Kondisi Keluarga</label>
              <textarea value={familyBackground} onChange={(e) => setFamilyBackground(e.target.value)} rows={3}
                placeholder="mis. tinggal bersama siapa, pekerjaan orang tua, dsb." className={inputCls + " resize-y"} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>Kondisi Ekonomi Keluarga</label>
              <textarea value={economicNotes} onChange={(e) => setEconomicNotes(e.target.value)} rows={2}
                placeholder="mis. penerima KIP/PIP, dsb." className={inputCls + " resize-y"} style={inputStyle} />
            </div>
            {error && <div className="text-xs" style={{ color: RED }}>{error}</div>}
            <button onClick={submit} disabled={submitting}
              className="mt-1 w-full px-4 py-3 rounded-lg text-sm font-semibold text-white"
              style={{ background: NAVY, opacity: submitting ? 0.6 : 1 }}>
              {submitting ? "Mengirim…" : "Kirim"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
