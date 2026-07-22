import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "./supabaseClient.js";
import {
  NAVY, NAVY2, ORANGE, BG, INK, MUTED, GREEN, RED, AMBER,
  ATT_STATUSES, todayStr, exportToExcel,
  PageHeader, Card, EmptyState, ClassPicker, Toast,
} from "./shared.jsx";
import {
  CalendarCheck, StickyNote, PiggyBank, Users, LogOut, Plus, Trash2, Download, Wallet, Pencil,
} from "lucide-react";

const NAV = [
  { key: "absensi", label: "Absensi Kelas", icon: CalendarCheck },
  { key: "catatan", label: "Catatan", icon: StickyNote },
  { key: "tabungan", label: "Tabungan", icon: PiggyBank },
  { key: "siswa", label: "Kelas & Siswa", icon: Users },
];

const SAVING_CATEGORIES = ["Tabungan Rutin", "Tabungan Wisata", "Tabungan Perpisahan", "Lainnya"];

export default function WaliKelasApp({ profile, onLogout }) {
  const [tab, setTab] = useState("absensi");
  const [classes, setClasses] = useState([]);
  const [activeClassId, setActiveClassId] = useState("");
  const [students, setStudents] = useState([]);
  const [toast, setToast] = useState("");

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const loadClasses = useCallback(async () => {
    const { data } = await supabase.from("classes").select("*").order("name");
    setClasses(data || []);
    const stillExists = data?.some((c) => c.id === activeClassId);
    if (!stillExists) {
      // otomatis pilih kelas yang wali_kelas_id-nya adalah dirinya, kalau ada
      const mine = data?.find((c) => c.wali_kelas_id === profile.id);
      setActiveClassId(mine ? mine.id : (data?.[0]?.id || ""));
    }
  }, [activeClassId, profile.id]);

  useEffect(() => { loadClasses(); }, []); // eslint-disable-line

  useEffect(() => {
    if (!activeClassId) { setStudents([]); return; }
    supabase.from("students").select("*").eq("class_id", activeClassId).order("name")
      .then(({ data }) => setStudents(data || []));
  }, [activeClassId]);

  const claimClass = async () => {
    if (!activeClassId) return;
    const { error } = await supabase.from("classes").update({ wali_kelas_id: profile.id }).eq("id", activeClassId);
    if (error) return notify("Gagal: " + error.message);
    loadClasses(); notify("Kelas ini sekarang di bawah perwalian Anda.");
  };

  const activeClass = classes.find((c) => c.id === activeClassId);

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row" style={{ background: BG, fontFamily: "Arial, sans-serif" }}>
      <aside className="md:w-60 w-full shrink-0 flex md:flex-col" style={{ background: NAVY }}>
        <div className="hidden md:block px-6 pt-7 pb-5">
          <div className="text-white font-bold text-lg leading-tight">Sistem Pembelajaran</div>
          <div className="text-xs mt-0.5" style={{ color: "#93A0BE" }}>{profile.name} · Wali Kelas</div>
        </div>
        <nav className="flex md:flex-col flex-1 md:px-3 md:py-2 overflow-x-auto md:overflow-visible">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = tab === n.key;
            return (
              <button key={n.key} onClick={() => setTab(n.key)}
                className="flex items-center gap-2.5 px-4 md:px-3 py-3 md:py-2.5 md:rounded-lg text-sm font-semibold shrink-0 md:mb-1"
                style={{ color: active ? "white" : "#A7B1C7", background: active ? NAVY2 : "transparent" }}>
                <Icon size={17} /><span>{n.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="hidden md:block mt-auto px-3 py-5">
          <button onClick={onLogout} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold w-full" style={{ color: "#A7B1C7" }}>
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-5 md:p-8">
        {activeClass && activeClass.wali_kelas_id !== profile.id && (
          <div className="mb-5 flex items-center justify-between flex-wrap gap-2 px-4 py-3 rounded-lg text-sm" style={{ background: "#FFF4EE", color: "#9A4A22" }}>
            <span>Kelas ini belum punya wali kelas resmi di sistem.</span>
            <button onClick={claimClass} className="font-bold underline">Jadikan saya wali kelas ini</button>
          </div>
        )}
        {tab === "absensi" && <AbsensiTab profile={profile} classes={classes} activeClassId={activeClassId} setActiveClassId={setActiveClassId} students={students} notify={notify} activeClass={activeClass} />}
        {tab === "catatan" && <CatatanTab profile={profile} classes={classes} activeClassId={activeClassId} setActiveClassId={setActiveClassId} students={students} notify={notify} />}
        {tab === "tabungan" && <TabunganTab profile={profile} classes={classes} activeClassId={activeClassId} setActiveClassId={setActiveClassId} students={students} notify={notify} activeClass={activeClass} />}
        {tab === "siswa" && <SiswaTab classes={classes} reloadClasses={loadClasses} activeClassId={activeClassId} setActiveClassId={setActiveClassId} students={students} setStudents={setStudents} notify={notify} />}
      </main>
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

// ================= ABSENSI KELAS =================
function AbsensiTab({ profile, classes, activeClassId, setActiveClassId, students, notify, activeClass }) {
  const [date, setDate] = useState(todayStr());
  const [record, setRecord] = useState({});
  const [allRecords, setAllRecords] = useState([]);
  const [loadingRecap, setLoadingRecap] = useState(true);

  useEffect(() => {
    if (!students.length) { setRecord({}); return; }
    supabase.from("homeroom_attendance").select("student_id,status").eq("wali_kelas_id", profile.id).eq("date", date)
      .in("student_id", students.map((s) => s.id))
      .then(({ data }) => {
        const rec = {}; (data || []).forEach((r) => { rec[r.student_id] = r.status; });
        setRecord(rec);
      });
  }, [activeClassId, date, students, profile.id]);

  const loadRecap = useCallback(async () => {
    if (!students.length) { setAllRecords([]); setLoadingRecap(false); return; }
    setLoadingRecap(true);
    const { data } = await supabase.from("homeroom_attendance").select("student_id,status").eq("wali_kelas_id", profile.id)
      .in("student_id", students.map((s) => s.id));
    setAllRecords(data || []);
    setLoadingRecap(false);
  }, [students, profile.id]);

  useEffect(() => { loadRecap(); }, [loadRecap, record]);

  const setStatus = async (studentId, status) => {
    setRecord((r) => ({ ...r, [studentId]: status }));
    const { error } = await supabase.from("homeroom_attendance").upsert(
      { student_id: studentId, wali_kelas_id: profile.id, date, status },
      { onConflict: "student_id,date" }
    );
    if (error) notify("Gagal: " + error.message);
    loadRecap();
  };
  const markAll = async (status) => {
    const rows = students.map((s) => ({ student_id: s.id, wali_kelas_id: profile.id, date, status }));
    const { error } = await supabase.from("homeroom_attendance").upsert(rows, { onConflict: "student_id,date" });
    if (error) return notify("Gagal: " + error.message);
    const rec = {}; students.forEach((s) => { rec[s.id] = status; });
    setRecord(rec);
    loadRecap();
  };

  const recapRows = useMemo(() => students.map((s) => {
    const rs = allRecords.filter((a) => a.student_id === s.id);
    const hadir = rs.filter((a) => a.status === "Hadir").length;
    const izin = rs.filter((a) => a.status === "Izin").length;
    const sakit = rs.filter((a) => a.status === "Sakit").length;
    const alpa = rs.filter((a) => a.status === "Alpa").length;
    const total = rs.length;
    const tidakMasuk = izin + sakit + alpa;
    const pct = total ? Math.round((hadir / total) * 100) : 0;
    return { id: s.id, name: s.name, hadir, izin, sakit, alpa, total, tidakMasuk, pct };
  }), [students, allRecords]);

  const handleExport = async () => {
    const nameOf = (id) => students.find((s) => s.id === id)?.name || "—";
    const rekapPerSiswa = recapRows.map((r) => ({
      Nama: r.name, Hadir: r.hadir, Izin: r.izin, Sakit: r.sakit, Alpa: r.alpa,
      "Total Tidak Masuk": r.tidakMasuk, "Total Pertemuan": r.total, "Kehadiran (%)": r.pct,
    }));
    const riwayat = allRecords.map((r) => ({ Nama: nameOf(r.student_id), Status: r.status }));
    exportToExcel(
      [{ name: "Rekap per Siswa", rows: rekapPerSiswa }, { name: "Riwayat Lengkap", rows: riwayat }],
      `Absensi_${activeClass?.name || ""}_${todayStr()}.xlsx`
    );
  };

  const summary = ATT_STATUSES.map((st) => ({ ...st, count: students.filter((s) => record[s.id] === st.key).length }));

  return (
    <div>
      <PageHeader eyebrow="Wali Kelas" title="Absensi Kelas" right={<ClassPicker classes={classes} value={activeClassId} onChange={setActiveClassId} />} />
      <Card className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-sm px-3 py-2 rounded-lg font-semibold" style={{ background: BG, color: INK }} />
          <div className="flex gap-2 flex-wrap items-center">
            {ATT_STATUSES.map((st) => (
              <button key={st.key} onClick={() => markAll(st.key)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: st.color + "1A", color: st.color }}>
                Tandai semua {st.key}
              </button>
            ))}
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: GREEN }}>
              <Download size={13} /> Unduh Excel
            </button>
          </div>
        </div>
        <div className="flex gap-4 mb-4 flex-wrap">
          {summary.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: MUTED }}>
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} /> {s.key}: {s.count}
            </div>
          ))}
        </div>
        {students.length === 0 ? <EmptyState icon={Users} text="Belum ada siswa di kelas ini." /> : (
          <div className="flex flex-col divide-y" style={{ borderColor: "#EEF0F3" }}>
            {students.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2.5 gap-3 flex-wrap">
                <span className="text-sm font-medium" style={{ color: INK }}>{s.name}</span>
                <div className="flex gap-1.5">
                  {ATT_STATUSES.map((st) => {
                    const active = record[s.id] === st.key;
                    return (
                      <button key={st.key} onClick={() => setStatus(s.id, st.key)}
                        className="px-2.5 py-1.5 rounded-md text-xs font-semibold border"
                        style={{ background: active ? st.color : "white", color: active ? "white" : st.color, borderColor: st.color }}>
                        {st.key}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card style={{ padding: 0 }}>
        <div className="px-5 pt-4 pb-2 text-sm font-bold" style={{ color: INK }}>Rekap Absensi Keseluruhan</div>
        {students.length === 0 ? <div className="px-5 pb-5"><EmptyState icon={CalendarCheck} text="Belum ada siswa di kelas ini." /></div> : loadingRecap ? (
          <div className="px-5 pb-5 text-sm" style={{ color: MUTED }}>Memuat…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: MUTED }}>
                  <th className="text-left font-semibold px-5 py-2.5 whitespace-nowrap">Siswa</th>
                  <th className="text-center font-semibold px-3 py-2.5 whitespace-nowrap">Hadir</th>
                  <th className="text-center font-semibold px-3 py-2.5 whitespace-nowrap">Izin</th>
                  <th className="text-center font-semibold px-3 py-2.5 whitespace-nowrap">Sakit</th>
                  <th className="text-center font-semibold px-3 py-2.5 whitespace-nowrap">Alpa</th>
                  <th className="text-center font-semibold px-3 py-2.5 whitespace-nowrap">Total Tidak Masuk</th>
                  <th className="text-center font-semibold px-3 py-2.5 whitespace-nowrap">Total Pertemuan</th>
                  <th className="text-center font-semibold px-3 py-2.5 whitespace-nowrap">% Kehadiran</th>
                </tr>
              </thead>
              <tbody>
                {recapRows.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? "white" : BG }}>
                    <td className="px-5 py-2 font-medium" style={{ color: INK }}>{r.name}</td>
                    <td className="text-center px-3 py-2" style={{ color: GREEN, fontWeight: 700 }}>{r.hadir}</td>
                    <td className="text-center px-3 py-2" style={{ color: "#B8760F" }}>{r.izin}</td>
                    <td className="text-center px-3 py-2" style={{ color: "#3E5C94" }}>{r.sakit}</td>
                    <td className="text-center px-3 py-2" style={{ color: RED, fontWeight: 700 }}>{r.alpa}</td>
                    <td className="text-center px-3 py-2" style={{ color: MUTED }}>{r.tidakMasuk}</td>
                    <td className="text-center px-3 py-2" style={{ color: MUTED }}>{r.total}</td>
                    <td className="text-center px-3 py-2 font-bold" style={{ color: INK }}>{r.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ================= CATATAN =================
function CatatanTab({ profile, classes, activeClassId, setActiveClassId, students, notify }) {
  const [studentId, setStudentId] = useState("");
  const [content, setContent] = useState("");
  const [eventDate, setEventDate] = useState(todayStr());
  const [notes, setNotes] = useState([]);

  useEffect(() => { setStudentId(students[0]?.id || ""); }, [students]);

  const loadNotes = useCallback(async () => {
    if (!students.length) { setNotes([]); return; }
    const { data } = await supabase.from("notes").select("*").eq("wali_kelas_id", profile.id)
      .in("student_id", students.map((s) => s.id)).order("date", { ascending: false }).limit(100);
    setNotes(data || []);
  }, [students, profile.id]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const addNote = async () => {
    if (!studentId || !content.trim()) return;
    const { error } = await supabase.from("notes").insert({ student_id: studentId, wali_kelas_id: profile.id, content: content.trim(), date: eventDate });
    if (error) return notify("Gagal: " + error.message);
    setContent(""); loadNotes(); notify("Catatan tersimpan.");
  };
  const removeNote = async (id) => { await supabase.from("notes").delete().eq("id", id); loadNotes(); };
  const studentName = (id) => students.find((s) => s.id === id)?.name || "—";

  return (
    <div>
      <PageHeader eyebrow="Wali Kelas" title="Catatan Siswa" right={<ClassPicker classes={classes} value={activeClassId} onChange={setActiveClassId} />} />
      <Card className="mb-5">
        <div className="text-sm font-bold mb-3" style={{ color: INK }}>Tambah Catatan</div>
        <div className="flex flex-wrap gap-2">
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="text-sm px-3 py-2 rounded-lg min-w-[160px]" style={{ background: BG, color: INK }}>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="text-sm px-3 py-2 rounded-lg font-semibold" style={{ background: BG, color: INK }} title="Tanggal kejadian" />
          <input value={content} onChange={(e) => setContent(e.target.value)} placeholder="Isi catatan…" className="text-sm px-3 py-2 rounded-lg flex-1 min-w-[220px]" style={{ background: BG, color: INK }} onKeyDown={(e) => e.key === "Enter" && addNote()} />
          <button onClick={addNote} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5" style={{ background: NAVY }}><Plus size={14} /> Simpan</button>
        </div>
      </Card>
      <Card>
        <div className="text-sm font-bold mb-3" style={{ color: INK }}>Riwayat Catatan</div>
        {notes.length === 0 ? <EmptyState icon={StickyNote} text="Belum ada catatan." /> : (
          <div className="flex flex-col divide-y" style={{ borderColor: "#EEF0F3" }}>
            {notes.map((n) => (
              <div key={n.id} className="flex items-start justify-between py-3 gap-3">
                <div>
                  <div className="text-sm font-semibold" style={{ color: INK }}>{studentName(n.student_id)}</div>
                  <div className="text-sm mt-0.5" style={{ color: MUTED }}>{n.content}</div>
                  <div className="text-xs mt-1" style={{ color: "#B7BFCC" }}>{n.date}</div>
                </div>
                <button onClick={() => removeNote(n.id)} className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: BG }}><Trash2 size={12} color={MUTED} /></button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ================= TABUNGAN =================
function TabunganTab({ profile, classes, activeClassId, setActiveClassId, students, notify, activeClass }) {
  const [studentId, setStudentId] = useState("");
  const [type, setType] = useState("setor");
  const [category, setCategory] = useState(SAVING_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [log, setLog] = useState([]);
  const [gridMonth, setGridMonth] = useState(todayStr().slice(0, 7)); // "YYYY-MM"
  const [expanded, setExpanded] = useState({}); // { [studentId]: true/false }

  useEffect(() => { setStudentId(students[0]?.id || ""); }, [students]);

  const loadLog = useCallback(async () => {
    if (!students.length) { setLog([]); return; }
    const { data } = await supabase.from("savings").select("*").eq("wali_kelas_id", profile.id)
      .in("student_id", students.map((s) => s.id)).order("date", { ascending: true }).limit(1000);
    setLog(data || []);
  }, [students, profile.id]);

  useEffect(() => { loadLog(); }, [loadLog]);

  const addEntry = async () => {
    if (!studentId || !amount) return;
    const { error } = await supabase.from("savings").insert({
      student_id: studentId, wali_kelas_id: profile.id, type, category, amount: Number(amount), note: note.trim() || null, date: todayStr(),
    });
    if (error) return notify("Gagal: " + error.message);
    setAmount(""); setNote(""); loadLog(); notify("Transaksi tersimpan.");
  };
  const removeEntry = async (id) => { await supabase.from("savings").delete().eq("id", id); loadLog(); };
  const toggleExpand = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const saldo = (id) => log.filter((s) => s.student_id === id).reduce((sum, s) => sum + (s.type === "setor" ? Number(s.amount) : -Number(s.amount)), 0);
  const studentName = (id) => students.find((s) => s.id === id)?.name || "—";
  const rupiah = (n) => "Rp" + Number(n).toLocaleString("id-ID");

  const totalKelas = useMemo(() => students.reduce((sum, s) => sum + saldo(s.id), 0), [students, log]);
  const totalSetor = useMemo(() => log.filter((s) => s.type === "setor").reduce((sum, s) => sum + Number(s.amount), 0), [log]);
  const totalTarik = useMemo(() => log.filter((s) => s.type === "tarik").reduce((sum, s) => sum + Number(s.amount), 0), [log]);

  const daysInMonth = useMemo(() => {
    const [y, m] = gridMonth.split("-").map(Number);
    return new Date(y, m, 0).getDate();
  }, [gridMonth]);
  const dayList = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);
  const paidSet = useMemo(() => {
    const set = new Set();
    log.forEach((l) => {
      if (l.type === "setor" && l.date.startsWith(gridMonth)) {
        const day = Number(l.date.slice(8, 10));
        set.add(`${l.student_id}|${day}`);
      }
    });
    return set;
  }, [log, gridMonth]);

  const handleExport = () => {
    const rows = log.map((s) => ({
      Nama: studentName(s.student_id), Tanggal: s.date, Jenis: s.type === "setor" ? "Setor" : "Tarik",
      Kategori: s.category, Jumlah: s.amount, Catatan: s.note || "",
    }));
    const saldoRows = students.map((s) => ({ Nama: s.name, "Saldo Saat Ini": saldo(s.id) }));
    saldoRows.push({ Nama: "TOTAL KELAS", "Saldo Saat Ini": totalKelas });
    const gridRows = students.map((s, i) => {
      const row = { NO: i + 1, "NAMA SISWA": s.name };
      dayList.forEach((d) => { row[d] = paidSet.has(`${s.id}|${d}`) ? "✓" : ""; });
      return row;
    });
    exportToExcel(
      [
        { name: "Saldo Tabungan", rows: saldoRows },
        { name: `Grid ${gridMonth}`, rows: gridRows },
        { name: "Riwayat Transaksi", rows },
      ],
      `Tabungan_${activeClass?.name || ""}_${todayStr()}.xlsx`
    );
  };

  return (
    <div>
      <PageHeader eyebrow="Wali Kelas" title="Tabungan Siswa" right={<ClassPicker classes={classes} value={activeClassId} onChange={setActiveClassId} />} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <Card>
          <div className="text-xs font-semibold mb-1" style={{ color: MUTED }}>Total Tabungan Kelas Terkumpul</div>
          <div className="text-2xl font-bold" style={{ color: NAVY }}>{rupiah(totalKelas)}</div>
        </Card>
        <Card>
          <div className="text-xs font-semibold mb-1" style={{ color: MUTED }}>Total Setor Keseluruhan</div>
          <div className="text-2xl font-bold" style={{ color: GREEN }}>{rupiah(totalSetor)}</div>
        </Card>
        <Card>
          <div className="text-xs font-semibold mb-1" style={{ color: MUTED }}>Total Tarik Keseluruhan</div>
          <div className="text-2xl font-bold" style={{ color: RED }}>{rupiah(totalTarik)}</div>
        </Card>
      </div>

      <Card className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold" style={{ color: INK }}>Catat Transaksi</div>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: GREEN }}><Download size={13} /> Unduh Excel</button>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="text-sm px-3 py-2 rounded-lg min-w-[160px]" style={{ background: BG, color: INK }}>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #E7E9EE" }}>
            {["setor", "tarik"].map((t) => (
              <button key={t} onClick={() => setType(t)} className="px-3 py-2 text-xs font-bold" style={{ background: type === t ? (t === "setor" ? GREEN : RED) : "white", color: type === t ? "white" : MUTED }}>
                {t === "setor" ? "Setor" : "Tarik"}
              </button>
            ))}
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="text-sm px-3 py-2 rounded-lg" style={{ background: BG, color: INK }}>
            {SAVING_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Jumlah (Rp)" className="text-sm px-3 py-2 rounded-lg w-32" style={{ background: BG, color: INK }} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan (opsional)" className="text-sm px-3 py-2 rounded-lg flex-1 min-w-[150px]" style={{ background: BG, color: INK }} />
          <button onClick={addEntry} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5" style={{ background: NAVY }}><Plus size={14} /> Simpan</button>
        </div>
      </Card>

      <Card className="mb-5" style={{ padding: 0 }}>
        <div className="px-5 pt-4 pb-3 flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm font-bold" style={{ color: INK }}>Grid Setoran Bulanan</div>
          <input type="month" value={gridMonth} onChange={(e) => setGridMonth(e.target.value)}
            className="text-sm px-3 py-2 rounded-lg font-semibold" style={{ background: BG, color: INK }} />
        </div>
        {students.length === 0 ? <div className="px-5 pb-5"><EmptyState icon={PiggyBank} text="Belum ada siswa." /></div> : (
          <div className="overflow-x-auto pb-2">
            <table className="text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th className="text-center font-semibold px-2 py-2 sticky left-0" style={{ background: BG, color: MUTED, minWidth: 34 }}>No</th>
                  <th className="text-left font-semibold px-3 py-2 sticky left-0" style={{ background: BG, color: MUTED, minWidth: 150, left: 34 }}>Nama Siswa</th>
                  {dayList.map((d) => (
                    <th key={d} className="text-center font-semibold px-1.5 py-2" style={{ color: MUTED, minWidth: 26 }}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id} style={{ background: i % 2 === 0 ? "white" : BG }}>
                    <td className="text-center px-2 py-1.5 sticky left-0" style={{ background: i % 2 === 0 ? "white" : BG, color: MUTED }}>{i + 1}</td>
                    <td className="text-left px-3 py-1.5 sticky left-0 whitespace-nowrap" style={{ background: i % 2 === 0 ? "white" : BG, color: INK, left: 34 }}>{s.name}</td>
                    {dayList.map((d) => (
                      <td key={d} className="text-center px-1.5 py-1.5" style={{ color: GREEN, fontWeight: 700, borderLeft: "1px solid #EEF0F3" }}>
                        {paidSet.has(`${s.id}|${d}`) ? "✓" : ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card style={{ padding: 0 }}>
        <div className="px-5 pt-4 pb-2 text-sm font-bold" style={{ color: INK }}>Riwayat Pembayaran per Siswa</div>
        <div className="px-5 pb-1 text-xs" style={{ color: MUTED }}>Klik nama siswa untuk lihat riwayat lengkap.</div>
        {students.length === 0 ? <div className="px-5 pb-5"><EmptyState icon={PiggyBank} text="Belum ada siswa." /></div> : (
          <div className="flex flex-col divide-y" style={{ borderColor: "#EEF0F3" }}>
            {students.map((s) => {
              const rows = log.filter((l) => l.student_id === s.id);
              const isOpen = !!expanded[s.id];
              return (
                <div key={s.id}>
                  <button onClick={() => toggleExpand(s.id)} className="w-full flex items-center justify-between px-5 py-3 text-left">
                    <div className="flex items-center gap-2">
                      <span style={{ color: MUTED, fontSize: 11, width: 12, display: "inline-block" }}>{isOpen ? "▾" : "▸"}</span>
                      <span className="text-sm font-semibold" style={{ color: INK }}>{s.name}</span>
                      <span className="text-xs" style={{ color: MUTED }}>({rows.length} transaksi)</span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: NAVY }}>{rupiah(saldo(s.id))}</span>
                  </button>
                  {isOpen && (
                    rows.length === 0 ? (
                      <div className="px-5 pb-4 text-xs" style={{ color: MUTED }}>Belum ada transaksi.</div>
                    ) : (
                      <div className="overflow-x-auto pb-3">
                        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ color: MUTED }}>
                              <th className="text-left font-semibold px-5 py-2 whitespace-nowrap">Tanggal</th>
                              <th className="text-left font-semibold px-3 py-2 whitespace-nowrap">Jenis</th>
                              <th className="text-left font-semibold px-3 py-2 whitespace-nowrap">Kategori</th>
                              <th className="text-left font-semibold px-3 py-2 whitespace-nowrap">Catatan</th>
                              <th className="text-right font-semibold px-3 py-2 whitespace-nowrap">Jumlah</th>
                              <th className="px-3 py-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r, i) => (
                              <tr key={r.id} style={{ background: i % 2 === 0 ? "white" : BG }}>
                                <td className="px-5 py-2" style={{ color: INK }}>{r.date}</td>
                                <td className="px-3 py-2" style={{ color: r.type === "setor" ? GREEN : RED, fontWeight: 600 }}>{r.type === "setor" ? "Setor" : "Tarik"}</td>
                                <td className="px-3 py-2" style={{ color: MUTED }}>{r.category}</td>
                                <td className="px-3 py-2" style={{ color: MUTED }}>{r.note || "—"}</td>
                                <td className="text-right px-3 py-2 font-semibold" style={{ color: r.type === "setor" ? GREEN : RED }}>
                                  {r.type === "setor" ? "+" : "-"}{rupiah(r.amount)}
                                </td>
                                <td className="text-right px-3 py-2">
                                  <button onClick={() => removeEntry(r.id)} className="w-6 h-6 rounded-md flex items-center justify-center ml-auto" style={{ background: BG }}><Trash2 size={11} color={MUTED} /></button>
                                </td>
                              </tr>
                            ))}
                            <tr style={{ background: NAVY + "0D" }}>
                              <td colSpan={4} className="px-5 py-2.5 font-bold text-right" style={{ color: NAVY }}>Total Tabungan</td>
                              <td className="text-right px-3 py-2.5 font-bold" style={{ color: NAVY }} colSpan={2}>{rupiah(saldo(s.id))}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )
                  )}
                </div>
              );
            })}
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-sm font-bold" style={{ color: INK }}>Total Kelas</span>
              <span className="text-sm font-bold" style={{ color: NAVY }}>{rupiah(totalKelas)}</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ================= KELAS & SISWA =================
function SiswaTab({ classes, reloadClasses, activeClassId, setActiveClassId, students, setStudents, notify }) {
  const [newClass, setNewClass] = useState("");
  const [name, setName] = useState("");
  const [editingClassId, setEditingClassId] = useState(null);
  const [editingClassName, setEditingClassName] = useState("");

  const addClass = async () => {
    const c = newClass.trim();
    if (!c) return;
    const { error } = await supabase.from("classes").insert({ name: c });
    if (error) return notify("Gagal: " + error.message);
    setNewClass(""); reloadClasses(); notify("Kelas ditambahkan.");
  };

  const startEditClass = (c) => { setEditingClassId(c.id); setEditingClassName(c.name); };
  const saveEditClass = async () => {
    const nm = editingClassName.trim();
    if (!nm) return;
    const { error } = await supabase.from("classes").update({ name: nm }).eq("id", editingClassId);
    if (error) return notify("Gagal: " + error.message);
    setEditingClassId(null); reloadClasses(); notify("Nama kelas diperbarui.");
  };
  const deleteClass = async (c) => {
    if (!confirm(`Hapus kelas "${c.name}"? Semua data siswa, absensi, catatan, dan tabungan di kelas ini akan ikut terhapus permanen.`)) return;
    const { error } = await supabase.from("classes").delete().eq("id", c.id);
    if (error) return notify("Gagal: " + error.message);
    reloadClasses(); notify("Kelas dihapus.");
  };

  const addStudent = async () => {
    if (!name.trim() || !activeClassId) return;
    const { data, error } = await supabase.from("students").insert({ name: name.trim(), class_id: activeClassId }).select().single();
    if (error) return notify("Gagal: " + error.message);
    setStudents((prev) => [...prev, data]); setName("");
  };
  const removeStudent = async (id) => {
    await supabase.from("students").delete().eq("id", id);
    setStudents((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div>
      <PageHeader eyebrow="Data Bersama Sekolah" title="Kelas & Siswa" />
      <Card className="mb-5">
        <div className="text-sm font-bold mb-3" style={{ color: INK }}>Kelas</div>
        <div className="flex flex-col divide-y mb-4" style={{ borderColor: "#EEF0F3" }}>
          {classes.length === 0 && <div className="text-xs py-2" style={{ color: MUTED }}>Belum ada kelas.</div>}
          {classes.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2.5 gap-2">
              {editingClassId === c.id ? (
                <>
                  <input value={editingClassName} onChange={(e) => setEditingClassName(e.target.value)}
                    className="text-sm px-2.5 py-1.5 rounded-md flex-1" style={{ background: BG, color: INK }}
                    onKeyDown={(e) => e.key === "Enter" && saveEditClass()} autoFocus />
                  <button onClick={saveEditClass} className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "#EAF7EF" }}>✓</button>
                  <button onClick={() => setEditingClassId(null)} className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: BG }}>✕</button>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium" style={{ color: INK }}>{c.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => startEditClass(c)} className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: BG }}><Pencil size={13} color={MUTED} /></button>
                    <button onClick={() => deleteClass(c)} className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "#FBEAEC" }}><Trash2 size={13} color={RED} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newClass} onChange={(e) => setNewClass(e.target.value)} placeholder="Nama kelas, mis. 8C" className="text-sm px-3 py-2 rounded-lg flex-1 max-w-xs" style={{ background: BG, color: INK }} onKeyDown={(e) => e.key === "Enter" && addClass()} />
          <button onClick={addClass} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5" style={{ background: NAVY }}><Plus size={14} /> Tambah</button>
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-sm font-bold" style={{ color: INK }}>Siswa</div>
          <ClassPicker classes={classes} value={activeClassId} onChange={setActiveClassId} />
        </div>
        <div className="flex gap-2 mb-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama siswa baru" className="text-sm px-3 py-2 rounded-lg flex-1" style={{ background: BG, color: INK }} onKeyDown={(e) => e.key === "Enter" && addStudent()} />
          <button onClick={addStudent} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5" style={{ background: ORANGE }}><Plus size={14} /> Tambah</button>
        </div>
        {students.length === 0 ? <EmptyState icon={Users} text="Belum ada siswa di kelas ini." /> : (
          <div className="flex flex-col divide-y" style={{ borderColor: "#EEF0F3" }}>
            {students.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2.5">
                <span className="text-sm" style={{ color: INK }}>{s.name}</span>
                <button onClick={() => removeStudent(s.id)} className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "#FBEAEC" }}><Trash2 size={13} color={RED} /></button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
