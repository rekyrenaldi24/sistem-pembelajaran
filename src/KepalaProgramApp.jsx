import React, { useState, useEffect, useCallback } from "react";
import { supabase, createTempAuthClient } from "./supabaseClient.js";
import {
  NAVY, NAVY2, ORANGE, BG, INK, MUTED, ATT_STATUSES, todayStr, PageHeader, Card, EmptyState, Toast, exportToExcel, fetchAllRows,
} from "./shared.jsx";
import { CalendarCheck, PiggyBank, LogOut, Repeat, ListChecks, Plus, Trash2, FileDown, UserPlus, ArrowUpCircle, Archive } from "lucide-react";
import { genId } from "./offlineSync.js";

const NAV = [
  { key: "kelola_kelas", label: "Kelola Kelas", icon: ListChecks },
  { key: "absensi", label: "Rekap Absensi (Harian)", icon: CalendarCheck },
  { key: "rekap_total", label: "Rekap Total (Excel)", icon: FileDown },
  { key: "tabungan", label: "Rekap Tabungan", icon: PiggyBank },
];

function firstDayOfMonthStr() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

// ================= KELOLA KELAS (tambah/hapus kelas dalam jurusan ini) =================
function KelolaKelasTab({ profile, classes, notify, reloadClasses }) {
  const [newName, setNewName] = useState("");
  const [ownerNames, setOwnerNames] = useState({}); // { [owner_id]: name }
  const [creating, setCreating] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [assignMode, setAssignMode] = useState("baru"); // "baru" | "existing"
  const [waliName, setWaliName] = useState("");
  const [waliEmail, setWaliEmail] = useState("");
  const [waliPassword, setWaliPassword] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [existingWali, setExistingWali] = useState([]);
  const [selectedExistingId, setSelectedExistingId] = useState("");
  const [promotingId, setPromotingId] = useState(null);
  const [newClassName, setNewClassName] = useState("");
  const [newYearLabel, setNewYearLabel] = useState("");
  const [promoting, setPromoting] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const activeClasses = classes.filter((c) => !c.archived);
  const archivedClasses = classes.filter((c) => c.archived);
  const classNameById = Object.fromEntries(classes.map((c) => [c.id, c.name]));

  useEffect(() => {
    const ownerIds = [...new Set(classes.map((c) => c.owner_id).filter(Boolean))];
    if (ownerIds.length === 0) { setOwnerNames({}); return; }
    supabase.from("profiles").select("id,name").in("id", ownerIds).then(({ data }) => {
      const map = {};
      (data || []).forEach((p) => { map[p.id] = p.name; });
      setOwnerNames(map);
    });
  }, [classes]);

  useEffect(() => {
    supabase.from("profiles").select("id,name").eq("is_wali_kelas", true).order("name").then(({ data }) => setExistingWali(data || []));
  }, [classes]);

  const addClass = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    const row = { id: genId(), name, jurusan_id: profile.kepala_program_jurusan_id, owner_id: null };
    const { error } = await supabase.from("classes").insert(row);
    setCreating(false);
    if (error) return notify("Gagal: " + error.message);
    setNewName("");
    notify("Kelas ditambahkan.");
    reloadClasses();
  };

  const deleteClass = async (c) => {
    if (!confirm(`Hapus PERMANEN kelas "${c.name}"? Semua data siswa, absensi, dan nilai di kelas ini akan ikut terhapus permanen dan TIDAK BISA dikembalikan. Kalau kelas ini sudah lulus / sudah tidak dipakai lagi tapi datanya masih mau disimpan, pakai tombol "Arsipkan" saja, jangan Hapus.`)) return;
    const { error } = await supabase.from("classes").delete().eq("id", c.id);
    if (error) return notify("Gagal: " + error.message);
    notify("Kelas dihapus.");
    reloadClasses();
  };

  // ---------- Naik Tahun Ajaran (promosi kelas) ----------
  const openPromote = (c) => {
    setPromotingId(c.id);
    setAssigningId(null);
    setNewClassName("");
    setNewYearLabel("");
  };

  const submitPromote = async (c) => {
    const nm = newClassName.trim();
    if (!nm) return notify("Nama kelas baru wajib diisi, mis. \"11 DKV 1\".");
    if (!confirm(`Kelas "${c.name}" akan naik jadi "${nm}". Semua nama siswa, biodata, dan saldo tabungan akan dibawa otomatis ke kelas baru. Absensi/poin/nilai/catatan TIDAK dibawa (mulai rekap baru dari nol), tapi tetap tersimpan aman di arsip kelas "${c.name}". Lanjutkan?`)) return;
    setPromoting(true);
    const { error } = await supabase.rpc("promosikan_kelas", {
      p_old_class_id: c.id,
      p_new_class_name: nm,
      p_year_label: newYearLabel.trim() || null,
    });
    setPromoting(false);
    if (error) return notify("Gagal naik tahun ajaran: " + error.message);
    setPromotingId(null);
    notify(`Berhasil! Kelas "${c.name}" naik jadi "${nm}". Siswa, biodata & saldo tabungan sudah dibawa; absensi/nilai/catatan mulai baru.`);
    reloadClasses();
  };

  // ---------- Arsipkan tanpa naik kelas (mis. kelas 12 yang lulus) ----------
  const archiveClass = async (c) => {
    if (!confirm(`Arsipkan kelas "${c.name}"? Kelas ini akan disembunyikan dari daftar kelas aktif (cocok untuk kelas yang sudah lulus), tapi semua datanya (siswa, absensi, nilai, catatan, tabungan) tetap tersimpan aman dan bisa dilihat lagi lewat bagian Arsip. Ini BUKAN naik tahun ajaran — tidak ada kelas baru yang dibuat.`)) return;
    const { error } = await supabase.from("classes").update({ archived: true, archived_at: new Date().toISOString() }).eq("id", c.id);
    if (error) return notify("Gagal: " + error.message);
    notify(`Kelas "${c.name}" diarsipkan.`);
    reloadClasses();
  };

  const openAssign = (c) => {
    setAssigningId(c.id);
    setPromotingId(null);
    setAssignMode("baru");
    setWaliName(""); setWaliEmail(""); setWaliPassword("");
    setSelectedExistingId("");
  };

  const submitAssign = async (c) => {
    const nm = waliName.trim();
    const em = waliEmail.trim();
    if (!nm) return notify("Nama wali kelas wajib diisi.");
    if (!em || !em.includes("@")) return notify("Email tidak valid.");
    if (waliPassword.length < 6) return notify("Password minimal 6 karakter.");
    setAssigning(true);
    // Client sementara: supaya sesi login Kepala Program yang sedang aktif
    // tidak ikut tertimpa oleh sesi akun Wali Kelas yang baru dibuat.
    const temp = createTempAuthClient();
    const { data: signUpData, error: signUpErr } = await temp.auth.signUp({ email: em, password: waliPassword });
    if (signUpErr) { setAssigning(false); return notify("Gagal membuat akun: " + signUpErr.message); }
    const userId = signUpData?.user?.id;
    if (!userId) { setAssigning(false); return notify("Gagal membuat akun (tidak ada user id)."); }
    const { error: profileErr } = await temp.from("profiles").insert({
      id: userId, name: nm, is_guru: false, is_wali_kelas: true, is_kepala_program: false, is_siswa: false, approved: true,
    });
    await temp.auth.signOut();
    if (profileErr) { setAssigning(false); return notify("Akun dibuat tapi profil gagal disimpan: " + profileErr.message); }
    // Tugaskan akun baru ini sebagai pemilik kelas (pakai sesi Kepala Program sendiri).
    const { error: assignErr } = await supabase.from("classes").update({ owner_id: userId, wali_kelas_id: userId }).eq("id", c.id);
    setAssigning(false);
    if (assignErr) return notify("Akun dibuat tapi gagal ditugaskan ke kelas: " + assignErr.message);
    setAssigningId(null);
    notify(`Akun Wali Kelas untuk "${c.name}" berhasil dibuat & ditugaskan. Simpan email & password ini, lalu berikan ke walinya.`);
    reloadClasses();
  };

  const submitAssignExisting = async (c) => {
    if (!selectedExistingId) return notify("Pilih akun wali kelas dulu.");
    setAssigning(true);
    const { error } = await supabase.from("classes").update({ owner_id: selectedExistingId, wali_kelas_id: selectedExistingId }).eq("id", c.id);
    setAssigning(false);
    if (error) return notify("Gagal: " + error.message);
    setAssigningId(null);
    notify(`Kelas "${c.name}" berhasil ditugaskan.`);
    reloadClasses();
  };

  return (
    <div>
      <PageHeader eyebrow="Kepala Program" title="Kelola Kelas" />
      <Card className="mb-5">
        <div className="text-sm font-bold mb-1" style={{ color: INK }}>Tambah Kelas Baru</div>
        <div className="text-xs mb-3" style={{ color: MUTED }}>
          Kelas yang dibuat di sini otomatis masuk jurusan Anda. Wali kelas nanti tinggal MEMILIH kelas ini untuk diampu — tidak perlu bikin sendiri.
        </div>
        <div className="flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama kelas, mis. 12 DKV 1" className="text-sm px-3 py-2 rounded-lg flex-1 max-w-xs" style={{ background: BG, color: INK }} onKeyDown={(e) => e.key === "Enter" && addClass()} />
          <button onClick={addClass} disabled={creating} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5" style={{ background: NAVY, opacity: creating ? 0.6 : 1 }}><Plus size={14} /> Tambah</button>
        </div>
      </Card>
      <Card className="mb-5">
        <div className="text-sm font-bold mb-1" style={{ color: INK }}>Kelas Aktif di Jurusan Ini</div>
        <div className="text-xs mb-3" style={{ color: MUTED }}>
          Akun Wali Kelas dibuat &amp; ditugaskan dari sini — wali kelas tidak bisa bikin akun sendiri. Catat email &amp; password yang Anda buat, lalu berikan ke wali kelasnya.
          Kalau tahun ajaran baru dimulai, pakai tombol <b>Naik Tahun Ajaran</b> di tiap kelas (siswa, biodata &amp; saldo tabungan otomatis dibawa; absensi/nilai/catatan mulai baru).
        </div>
        {activeClasses.length === 0 ? (
          <EmptyState icon={ListChecks} text="Belum ada kelas aktif di jurusan ini." />
        ) : (
          <div className="flex flex-col divide-y" style={{ borderColor: "#EEF0F3" }}>
            {activeClasses.map((c) => (
              <div key={c.id} className="py-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-medium" style={{ color: INK }}>{c.name}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.owner_id ? (
                      <span className="text-xs font-semibold px-2 py-1 rounded-md" style={{ background: "#EAF7EF", color: "#2E8B57" }}>
                        Diampu · {ownerNames[c.owner_id] || "…"}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-1 rounded-md" style={{ background: "#FFF4EE", color: "#9A4A22" }}>Belum ada wali kelas</span>
                    )}
                    <button onClick={() => openAssign(c)} className="text-xs font-bold px-2.5 py-1.5 rounded-md text-white flex items-center gap-1" style={{ background: ORANGE }}>
                      <UserPlus size={13} /> {c.owner_id ? "Ganti" : "Buat Akun"}
                    </button>
                    <button onClick={() => openPromote(c)} className="text-xs font-bold px-2.5 py-1.5 rounded-md text-white flex items-center gap-1" style={{ background: NAVY }}>
                      <ArrowUpCircle size={13} /> Naik Tahun Ajaran
                    </button>
                    <button onClick={() => archiveClass(c)} title="Arsipkan (mis. kelas lulus)" className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "#EEF0F3" }}><Archive size={13} color={MUTED} /></button>
                    <button onClick={() => deleteClass(c)} title="Hapus permanen" className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "#FBEAEC" }}><Trash2 size={13} color="#C0392B" /></button>
                  </div>
                </div>
                {promotingId === c.id && (
                  <div className="mt-2.5 p-3 rounded-lg flex flex-col gap-2" style={{ background: BG }}>
                    <div className="text-xs font-semibold" style={{ color: MUTED }}>
                      Buat kelas baru untuk "{c.name}" naik tahun ajaran. Semua siswa, biodata, dan saldo tabungan di "{c.name}" akan disalin ke kelas baru ini; kelas "{c.name}" sendiri akan diarsipkan (datanya tetap tersimpan).
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <input value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder='Nama kelas baru, mis. "11 DKV 1"' className="text-sm px-3 py-2 rounded-lg flex-1 min-w-[180px]" style={{ background: "white", color: INK }} />
                      <input value={newYearLabel} onChange={(e) => setNewYearLabel(e.target.value)} placeholder='Label tahun ajaran (opsional), mis. "2026/2027"' className="text-sm px-3 py-2 rounded-lg flex-1 min-w-[220px]" style={{ background: "white", color: INK }} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => submitPromote(c)} disabled={promoting} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: NAVY, opacity: promoting ? 0.6 : 1 }}>
                        {promoting ? "Memproses…" : "Naikkan Kelas Ini"}
                      </button>
                      <button onClick={() => setPromotingId(null)} className="px-3.5 py-2 rounded-lg text-sm font-semibold" style={{ background: "white", color: MUTED }}>Batal</button>
                    </div>
                  </div>
                )}
                {assigningId === c.id && (
                  <div className="mt-2.5 p-3 rounded-lg flex flex-col gap-2" style={{ background: BG }}>
                    <div className="flex gap-2">
                      <button onClick={() => setAssignMode("baru")} className="text-xs font-bold px-3 py-1.5 rounded-md" style={{ background: assignMode === "baru" ? NAVY : "white", color: assignMode === "baru" ? "white" : MUTED }}>Buat Akun Baru</button>
                      <button onClick={() => setAssignMode("existing")} className="text-xs font-bold px-3 py-1.5 rounded-md" style={{ background: assignMode === "existing" ? NAVY : "white", color: assignMode === "existing" ? "white" : MUTED }}>Pilih Akun yang Sudah Ada</button>
                    </div>

                    {assignMode === "baru" ? (
                      <>
                        <div className="text-xs font-semibold" style={{ color: MUTED }}>
                          {c.owner_id ? `Buat akun BARU untuk menggantikan wali kelas "${c.name}" saat ini:` : `Buat akun Wali Kelas untuk "${c.name}":`}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <input value={waliName} onChange={(e) => setWaliName(e.target.value)} placeholder="Nama wali kelas" className="text-sm px-3 py-2 rounded-lg flex-1 min-w-[160px]" style={{ background: "white", color: INK }} />
                          <input value={waliEmail} onChange={(e) => setWaliEmail(e.target.value)} placeholder="Email untuk akun ini" className="text-sm px-3 py-2 rounded-lg flex-1 min-w-[200px]" style={{ background: "white", color: INK }} />
                          <input value={waliPassword} onChange={(e) => setWaliPassword(e.target.value)} placeholder="Password (min. 6 karakter)" className="text-sm px-3 py-2 rounded-lg min-w-[180px]" style={{ background: "white", color: INK }} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => submitAssign(c)} disabled={assigning} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: NAVY, opacity: assigning ? 0.6 : 1 }}>
                            {assigning ? "Memproses…" : "Buat & Tugaskan"}
                          </button>
                          <button onClick={() => setAssigningId(null)} className="px-3.5 py-2 rounded-lg text-sm font-semibold" style={{ background: "white", color: MUTED }}>Batal</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-xs font-semibold" style={{ color: MUTED }}>
                          Pilih akun Wali Kelas yang sudah pernah dibuat untuk ditugaskan ke "{c.name}":
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <select value={selectedExistingId} onChange={(e) => setSelectedExistingId(e.target.value)} className="text-sm px-3 py-2 rounded-lg flex-1 min-w-[220px]" style={{ background: "white", color: selectedExistingId ? INK : MUTED }}>
                            <option value="">— Pilih akun —</option>
                            {existingWali.map((w) => (
                              <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => submitAssignExisting(c)} disabled={assigning} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: NAVY, opacity: assigning ? 0.6 : 1 }}>
                            {assigning ? "Memproses…" : "Tugaskan"}
                          </button>
                          <button onClick={() => setAssigningId(null)} className="px-3.5 py-2 rounded-lg text-sm font-semibold" style={{ background: "white", color: MUTED }}>Batal</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <button onClick={() => setShowArchive((v) => !v)} className="w-full flex items-center justify-between text-left">
          <div>
            <div className="text-sm font-bold" style={{ color: INK }}>Arsip Tahun Ajaran Lalu ({archivedClasses.length})</div>
            <div className="text-xs mt-0.5" style={{ color: MUTED }}>Kelas yang sudah naik tahun ajaran atau sudah lulus. Read-only, datanya tetap tersimpan aman.</div>
          </div>
          <span style={{ color: MUTED, fontSize: 11 }}>{showArchive ? "▾ Tutup" : "▸ Lihat"}</span>
        </button>
        {showArchive && (
          archivedClasses.length === 0 ? (
            <div className="text-xs mt-3" style={{ color: MUTED }}>Belum ada kelas yang diarsipkan.</div>
          ) : (
            <div className="flex flex-col divide-y mt-3" style={{ borderColor: "#EEF0F3" }}>
              {archivedClasses.map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="text-sm font-medium" style={{ color: MUTED }}>{c.name}</span>
                    {c.year_label && <span className="text-xs ml-2" style={{ color: MUTED }}>({c.year_label})</span>}
                  </div>
                  <span className="text-xs" style={{ color: MUTED }}>
                    {c.promoted_to_class_id ? `→ naik jadi "${classNameById[c.promoted_to_class_id] || "…"}"` : "Diarsipkan"}
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </Card>
    </div>
  );
}

// ================= REKAP ABSENSI (semua kelas dalam satu jurusan) =================
function AbsensiRekapTab({ classes }) {
  const [date, setDate] = useState(todayStr());
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (classes.length === 0) { setStudents([]); setRecords([]); setLoading(false); return; }
      const classIds = classes.map((c) => c.id);
      const { data: s } = await supabase.from("students").select("id,name,class_id").in("class_id", classIds).order("name");
      setStudents(s || []);
      if (s && s.length) {
        const { data: r } = await supabase.from("homeroom_attendance").select("student_id,status").eq("date", date).in("student_id", s.map((x) => x.id));
        setRecords(r || []);
      } else setRecords([]);
      setLoading(false);
    })();
  }, [classes, date]);

  const statusOf = (studentId) => records.find((r) => r.student_id === studentId)?.status;

  const perClass = classes.map((c) => {
    const studs = students.filter((s) => s.class_id === c.id);
    const counts = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
    studs.forEach((s) => { const st = statusOf(s.id); if (st && counts[st] !== undefined) counts[st]++; });
    return { cls: c, studs, counts, filled: studs.filter((s) => statusOf(s.id)).length };
  });

  return (
    <div>
      <PageHeader eyebrow="Kepala Program · read-only" title="Rekap Absensi Kelas Harian" />
      <Card className="mb-5">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-sm px-3 py-2 rounded-lg font-semibold" style={{ background: BG, color: INK }} />
        <div className="text-xs mt-2" style={{ color: MUTED }}>Data ini diisi wali kelas / sekretaris masing-masing kelas, tidak bisa diubah di sini.</div>
      </Card>
      {loading ? (
        <div className="text-xs" style={{ color: MUTED }}>Memuat…</div>
      ) : classes.length === 0 ? (
        <EmptyState icon={CalendarCheck} text="Belum ada kelas di jurusan ini." />
      ) : (
        <div className="flex flex-col gap-3">
          {perClass.map(({ cls, studs, counts, filled }) => {
            const isOpen = !!expanded[cls.id];
            return (
              <Card key={cls.id} style={{ padding: 0 }}>
                <button onClick={() => setExpanded((e) => ({ ...e, [cls.id]: !e[cls.id] }))} className="w-full flex items-center justify-between px-5 py-3.5 text-left flex-wrap gap-1">
                  <div className="flex items-center gap-2">
                    <span style={{ color: MUTED, fontSize: 11, width: 12, display: "inline-block" }}>{isOpen ? "▾" : "▸"}</span>
                    <span className="font-bold text-sm" style={{ color: INK }}>{cls.name}</span>
                  </div>
                  <span className="text-xs" style={{ color: MUTED }}>{filled}/{studs.length} terisi · {counts.Hadir} Hadir · {counts.Izin} Izin · {counts.Sakit} Sakit · {counts.Alpa} Alpa</span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 flex flex-col divide-y" style={{ borderColor: "#EEF0F3" }}>
                    {studs.length === 0 ? <div className="text-xs py-2" style={{ color: MUTED }}>Belum ada siswa.</div> : studs.map((s) => {
                      const st = statusOf(s.id);
                      const meta = ATT_STATUSES.find((x) => x.key === st);
                      return (
                        <div key={s.id} className="flex items-center justify-between py-2">
                          <span className="text-sm" style={{ color: INK }}>{s.name}</span>
                          {st ? <span className="text-xs font-bold px-2 py-1 rounded-md" style={{ background: (meta?.color || MUTED) + "1A", color: meta?.color || MUTED }}>{st}</span> : <span className="text-xs" style={{ color: MUTED }}>—</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ================= REKAP TOTAL ABSENSI (rentang tanggal, per siswa, bisa unduh Excel) =================
function RekapTotalAbsensiTab({ classes, jurusanName }) {
  const [startDate, setStartDate] = useState(firstDayOfMonthStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (classes.length === 0) { setStudents([]); setRecords([]); setLoading(false); return; }
      const classIds = classes.map((c) => c.id);
      const { data: s } = await supabase.from("students").select("id,name,class_id").in("class_id", classIds).order("name");
      setStudents(s || []);
      if (s && s.length) {
        const { data: r } = await fetchAllRows(() =>
          supabase.from("homeroom_attendance").select("student_id,status,date")
            .gte("date", startDate).lte("date", endDate).in("student_id", s.map((x) => x.id))
        );
        setRecords(r || []);
      } else setRecords([]);
      setLoading(false);
    })();
  }, [classes, startDate, endDate]);

  const countsFor = (studentId) => {
    const c = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
    records.filter((r) => r.student_id === studentId).forEach((r) => { if (c[r.status] !== undefined) c[r.status]++; });
    return c;
  };

  const perClass = classes.map((c) => ({
    cls: c,
    studs: students.filter((s) => s.class_id === c.id),
  }));

  const downloadExcel = () => {
    const sheets = perClass.filter(({ studs }) => studs.length > 0).map(({ cls, studs }) => ({
      name: cls.name,
      rows: studs.map((s, i) => {
        const c = countsFor(s.id);
        return { No: i + 1, Nama: s.name, Hadir: c.Hadir, Izin: c.Izin, Sakit: c.Sakit, Alpa: c.Alpa };
      }),
    }));
    if (sheets.length === 0) return;
    exportToExcel(sheets, `Rekap_Absensi_${jurusanName || "Jurusan"}_${startDate}_sd_${endDate}.xlsx`);
  };

  return (
    <div>
      <PageHeader eyebrow="Kepala Program · read-only" title="Rekap Total Absensi (Rentang Tanggal)" right={
        <button onClick={downloadExcel} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: NAVY }}>
          <FileDown size={15} /> Unduh Excel
        </button>
      } />
      <Card className="mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: MUTED }}>Dari tanggal</div>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-sm px-3 py-2 rounded-lg font-semibold" style={{ background: BG, color: INK }} />
          </div>
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: MUTED }}>Sampai tanggal</div>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-sm px-3 py-2 rounded-lg font-semibold" style={{ background: BG, color: INK }} />
          </div>
        </div>
        <div className="text-xs mt-3" style={{ color: MUTED }}>Total kemunculan tiap status (Hadir/Izin/Sakit/Alpa) untuk setiap siswa selama rentang tanggal ini. Klik "Unduh Excel" untuk file lengkap, satu sheet per kelas.</div>
      </Card>
      {loading ? (
        <div className="text-xs" style={{ color: MUTED }}>Memuat…</div>
      ) : classes.length === 0 ? (
        <EmptyState icon={FileDown} text="Belum ada kelas di jurusan ini." />
      ) : (
        <div className="flex flex-col gap-5">
          {perClass.map(({ cls, studs }) => (
            <Card key={cls.id}>
              <div className="text-sm font-bold mb-3" style={{ color: INK }}>{cls.name}</div>
              {studs.length === 0 ? (
                <div className="text-xs" style={{ color: MUTED }}>Belum ada siswa.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #EEF0F3" }}>
                        <th className="text-left py-2 pr-3" style={{ color: MUTED, fontWeight: 600, fontSize: 12 }}>Nama</th>
                        <th className="text-center py-2 px-2" style={{ color: MUTED, fontWeight: 600, fontSize: 12 }}>Hadir</th>
                        <th className="text-center py-2 px-2" style={{ color: MUTED, fontWeight: 600, fontSize: 12 }}>Izin</th>
                        <th className="text-center py-2 px-2" style={{ color: MUTED, fontWeight: 600, fontSize: 12 }}>Sakit</th>
                        <th className="text-center py-2 px-2" style={{ color: MUTED, fontWeight: 600, fontSize: 12 }}>Alpa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studs.map((s) => {
                        const c = countsFor(s.id);
                        return (
                          <tr key={s.id} style={{ borderBottom: "1px solid #F5F6F8" }}>
                            <td className="py-2 pr-3" style={{ color: INK }}>{s.name}</td>
                            <td className="text-center py-2 px-2" style={{ color: INK }}>{c.Hadir}</td>
                            <td className="text-center py-2 px-2" style={{ color: INK }}>{c.Izin}</td>
                            <td className="text-center py-2 px-2" style={{ color: INK }}>{c.Sakit}</td>
                            <td className="text-center py-2 px-2" style={{ color: INK }}>{c.Alpa}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ================= REKAP TABUNGAN (semua kelas dalam satu jurusan) =================
function TabunganRekapTab({ classes }) {
  const [students, setStudents] = useState([]);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (classes.length === 0) { setStudents([]); setLog([]); setLoading(false); return; }
      const classIds = classes.map((c) => c.id);
      const { data: s } = await supabase.from("students").select("id,name,class_id").in("class_id", classIds).order("name");
      setStudents(s || []);
      if (s && s.length) {
        const { data: l } = await fetchAllRows(() =>
          supabase.from("savings").select("student_id,type,amount").in("student_id", s.map((x) => x.id))
        );
        setLog(l || []);
      } else setLog([]);
      setLoading(false);
    })();
  }, [classes]);

  const saldo = (id) => log.filter((l) => l.student_id === id).reduce((sum, l) => sum + (l.type === "setor" ? Number(l.amount) : -Number(l.amount)), 0);
  const rupiah = (n) => "Rp" + Number(n).toLocaleString("id-ID");

  const perClass = classes.map((c) => {
    const studs = students.filter((s) => s.class_id === c.id);
    const total = studs.reduce((sum, s) => sum + saldo(s.id), 0);
    return { cls: c, studs, total };
  });
  const grandTotal = perClass.reduce((sum, p) => sum + p.total, 0);

  return (
    <div>
      <PageHeader eyebrow="Kepala Program · read-only" title="Rekap Tabungan Siswa" />
      <Card className="mb-5">
        <div className="text-xs font-semibold mb-1" style={{ color: MUTED }}>Total Tabungan Seluruh Jurusan</div>
        <div className="text-2xl font-bold" style={{ color: NAVY }}>{rupiah(grandTotal)}</div>
      </Card>
      {loading ? (
        <div className="text-xs" style={{ color: MUTED }}>Memuat…</div>
      ) : classes.length === 0 ? (
        <EmptyState icon={PiggyBank} text="Belum ada kelas di jurusan ini." />
      ) : (
        <div className="flex flex-col gap-3">
          {perClass.map(({ cls, studs, total }) => {
            const isOpen = !!expanded[cls.id];
            return (
              <Card key={cls.id} style={{ padding: 0 }}>
                <button onClick={() => setExpanded((e) => ({ ...e, [cls.id]: !e[cls.id] }))} className="w-full flex items-center justify-between px-5 py-3.5 text-left">
                  <div className="flex items-center gap-2">
                    <span style={{ color: MUTED, fontSize: 11, width: 12, display: "inline-block" }}>{isOpen ? "▾" : "▸"}</span>
                    <span className="font-bold text-sm" style={{ color: INK }}>{cls.name}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: NAVY }}>{rupiah(total)}</span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 flex flex-col divide-y" style={{ borderColor: "#EEF0F3" }}>
                    {studs.length === 0 ? <div className="text-xs py-2" style={{ color: MUTED }}>Belum ada siswa.</div> : studs.map((s) => (
                      <div key={s.id} className="flex items-center justify-between py-2">
                        <span className="text-sm" style={{ color: INK }}>{s.name}</span>
                        <span className="text-sm font-semibold" style={{ color: NAVY }}>{rupiah(saldo(s.id))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function KepalaProgramApp({ profile, onLogout, onSwitchRole }) {
  const [tab, setTab] = useState("kelola_kelas");
  const [classes, setClasses] = useState([]);
  const [jurusanName, setJurusanName] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const reloadClasses = useCallback(async () => {
    if (!profile.kepala_program_jurusan_id) return;
    const { data: c } = await supabase.from("classes").select("*").eq("jurusan_id", profile.kepala_program_jurusan_id).order("name");
    setClasses(c || []);
  }, [profile.kepala_program_jurusan_id]);
  // Rekap (Absensi/Rekap Total/Tabungan) hanya pakai kelas AKTIF — kelas
  // yang sudah diarsipkan/naik tahun ajaran tidak ikut muncul di rekap ini.
  const activeClasses = classes.filter((c) => !c.archived);

  useEffect(() => {
    (async () => {
      if (!profile.kepala_program_jurusan_id) { setLoading(false); return; }
      const { data: j } = await supabase.from("jurusan").select("name").eq("id", profile.kepala_program_jurusan_id).maybeSingle();
      setJurusanName(j?.name || "");
      await reloadClasses();
      setLoading(false);
    })();
  }, [profile.kepala_program_jurusan_id]);

  if (!profile.kepala_program_jurusan_id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-6" style={{ background: BG }}>
        <div className="text-sm" style={{ color: MUTED }}>Akun ini belum dikaitkan ke jurusan manapun. Hubungi admin.</div>
        <button onClick={onLogout} className="text-xs font-bold underline" style={{ color: NAVY }}>Keluar</button>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm" style={{ background: BG, color: MUTED }}>Memuat…</div>;
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row" style={{ background: BG, fontFamily: "Arial, sans-serif" }}>
      <aside className="md:w-60 w-full shrink-0 flex flex-col" style={{ background: NAVY }}>
        <div className="flex md:block items-center justify-between px-4 md:px-6 py-3 md:pt-7 md:pb-5">
          <div>
            <div className="text-white font-bold text-base md:text-lg leading-tight">R3 EDU</div>
            <div className="hidden md:block text-xs mt-0.5" style={{ color: "#93A0BE" }}>Kepala Program · {jurusanName || "—"}</div>
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
        {tab === "kelola_kelas" && <KelolaKelasTab profile={profile} classes={classes} notify={notify} reloadClasses={reloadClasses} />}
        {tab === "absensi" && <AbsensiRekapTab classes={activeClasses} />}
        {tab === "rekap_total" && <RekapTotalAbsensiTab classes={activeClasses} jurusanName={jurusanName} />}
        {tab === "tabungan" && <TabunganRekapTab classes={activeClasses} />}
      </main>
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
