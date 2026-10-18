import React, { useState, useRef } from "react";
import { supabase } from "./supabaseClient.js";
import { BG, INK, MUTED, ORANGE, downloadStudentTemplate, parseStudentsExcel } from "./shared.jsx";
import { Plus, FileDown, Upload } from "lucide-react";

// Panel untuk MENAMBAH siswa ke satu kelas: ketik satu-satu, atau upload
// Excel sekaligus. Dipakai oleh Guru Mapel dan Kepala Program. Hanya
// menambah — tidak mengubah/menghapus siswa yang sudah ada.
const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

export default function TambahSiswaPanel({ classId, notify, onAdded }) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState("L");
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const existingNames = async () => {
    const { data } = await supabase.from("students").select("name").eq("class_id", classId);
    return new Set((data || []).map((r) => norm(r.name)));
  };

  const addOne = async () => {
    const n = name.trim();
    if (!classId) return notify("Pilih kelas dulu.");
    if (!n) return notify("Nama siswa wajib diisi.");
    setBusy(true);
    const exist = await existingNames();
    if (exist.has(norm(n))) {
      setBusy(false);
      return notify("Nama itu sudah ada di kelas ini.");
    }
    const { error } = await supabase.from("students").insert({ name: n, class_id: classId, gender });
    setBusy(false);
    if (error) return notify("Gagal menambah siswa: " + error.message);
    setName("");
    notify("Siswa ditambahkan.");
    onAdded?.();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !classId) return;
    setImporting(true);
    try {
      const rows = await parseStudentsExcel(file);
      if (rows.length === 0) { notify("Tidak ada data siswa yang terbaca di file itu."); setImporting(false); return; }
      const exist = await existingNames();
      const seen = new Set();
      const toInsert = [];
      let skipped = 0;
      rows.forEach((r) => {
        const k = norm(r.name);
        if (exist.has(k) || seen.has(k)) { skipped += 1; return; }
        seen.add(k);
        toInsert.push({ name: r.name, gender: r.gender, class_id: classId });
      });
      if (toInsert.length === 0) {
        notify(`Semua ${skipped} nama di file sudah ada di kelas ini, tidak ada yang ditambahkan.`);
        setImporting(false);
        return;
      }
      for (let i = 0; i < toInsert.length; i += 200) {
        const { error } = await supabase.from("students").insert(toInsert.slice(i, i + 200));
        if (error) { notify("Gagal impor: " + error.message); setImporting(false); onAdded?.(); return; }
      }
      const noGender = toInsert.filter((r) => !r.gender).length;
      notify(
        `${toInsert.length} siswa berhasil ditambahkan.` +
        (skipped ? ` ${skipped} dilewati (nama sudah ada).` : "") +
        (noGender ? ` ${noGender} belum ada jenis kelamin.` : "")
      );
      onAdded?.();
    } catch (err) {
      notify("Gagal membaca file: " + err.message);
    }
    setImporting(false);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 pb-4" style={{ borderBottom: "1px solid #EEF0F3" }}>
        <button onClick={downloadStudentTemplate} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: BG, color: INK }}>
          <FileDown size={14} /> Unduh Template Excel
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={!classId || importing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: ORANGE, opacity: (!classId || importing) ? 0.6 : 1 }}>
          <Upload size={14} /> {importing ? "Mengimpor…" : "Upload Excel Siswa"}
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
        <span className="text-xs self-center" style={{ color: MUTED }}>Isi kolom Nama &amp; Jenis Kelamin (L/P) di template, lalu upload di sini. Nama yang sudah ada tidak akan dobel.</span>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Atau ketik satu nama siswa baru"
          className="text-sm px-3 py-2 rounded-lg flex-1 min-w-[160px]" style={{ background: BG, color: INK }}
          onKeyDown={(e) => e.key === "Enter" && addOne()} />
        <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #E7E9EE" }}>
          {["L", "P"].map((g) => (
            <button key={g} type="button" onClick={() => setGender(g)}
              className="px-3 py-2 text-xs font-bold" style={{ background: gender === g ? ORANGE : "white", color: gender === g ? "white" : MUTED }}>
              {g}
            </button>
          ))}
        </div>
        <button onClick={addOne} disabled={busy} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5" style={{ background: ORANGE, opacity: busy ? 0.6 : 1 }}>
          <Plus size={14} /> Tambah
        </button>
      </div>
    </div>
  );
}
