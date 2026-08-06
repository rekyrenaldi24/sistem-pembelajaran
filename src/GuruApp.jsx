import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "./supabaseClient.js";
import {
  NAVY, NAVY2, ORANGE, BG, INK, MUTED, GREEN, RED,
  ATT_STATUSES, POINT_CATEGORIES, todayStr, gradeLetter,
  computeFinalScore, exportToExcel, downloadStudentTemplate, parseStudentsExcel,
  PageHeader, Card, EmptyState, ClassPicker, Toast, OfflineBanner, useOfflineStatus,
} from "./shared.jsx";
import { offlineWrite, genId } from "./offlineSync.js";
import {
  LayoutDashboard, CalendarCheck, Award, ClipboardList, FileSpreadsheet,
  Users, LogOut, Plus, Trash2, Download, TrendingUp, TrendingDown, Settings2, Pencil, Repeat, FileDown, Upload, History, Activity,
} from "lucide-react";
import AuditLogTab from "./AuditLog.jsx";
import {
  scoreLari60, scoreGantung, scoreSitup, scoreLoncat, scoreLariJauh,
  classifyTotal, totalToScale100, gantungLabel, lariJauhLabel, mmssToDetik, detikToMMSS,
} from "./tkji.js";
import {
  beepVO2max, classifyVO2max, customScore,
} from "./otherTests.js";

const NAV = [
  { key: "absensi", label: "Absensi", icon: CalendarCheck },
  { key: "poin", label: "Poin & Catatan", icon: Award },
  { key: "praktek", label: "Nilai Harian", icon: ClipboardList },
  { key: "kebugaran", label: "Tes Kebugaran", icon: Activity },
  { key: "ujian", label: "Ujian Akhir", icon: FileSpreadsheet },
  { key: "akhir", label: "Nilai Akhir", icon: LayoutDashboard },
  { key: "siswa", label: "Kelas & Siswa", icon: Users },
  { key: "riwayat", label: "Riwayat Aktivitas", icon: History },
];

export default function GuruApp({ profile, onLogout, onSwitchRole }) {
  const [tab, setTab] = useState("absensi");
  const [classes, setClasses] = useState([]);
  const [activeClassId, setActiveClassId] = useState("");
  const [students, setStudents] = useState([]);
  const [toast, setToast] = useState("");

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };
  const { pending, offline, syncNow } = useOfflineStatus(notify);

  const loadClasses = useCallback(async () => {
    const { data } = await supabase.from("classes").select("*").order("name");
    setClasses(data || []);
    const stillExists = data?.some((c) => c.id === activeClassId);
    if (!stillExists) setActiveClassId(data?.[0]?.id || "");
  }, [activeClassId]);

  useEffect(() => { loadClasses(); }, []); // eslint-disable-line

  useEffect(() => {
    if (!activeClassId) { setStudents([]); return; }
    supabase.from("students").select("*").eq("class_id", activeClassId).order("name")
      .then(({ data }) => setStudents(data || []));
  }, [activeClassId]);

  const activeClass = classes.find((c) => c.id === activeClassId);

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row" style={{ background: BG, fontFamily: "Arial, sans-serif" }}>
      <aside className="md:w-60 w-full shrink-0 flex flex-col" style={{ background: NAVY }}>
        <div className="flex md:block items-center justify-between px-4 md:px-6 py-3 md:pt-7 md:pb-5">
          <div>
            <div className="text-white font-bold text-base md:text-lg leading-tight">R3 EDU</div>
            <div className="hidden md:block text-xs mt-0.5" style={{ color: "#93A0BE" }}>{profile.name} · Guru {profile.subject}</div>
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
        <OfflineBanner offline={offline} pending={pending} onSyncNow={syncNow} />
        {tab === "absensi" && <AbsensiTab profile={profile} classes={classes} activeClassId={activeClassId} setActiveClassId={setActiveClassId} students={students} notify={notify} />}
        {tab === "poin" && <PoinTab profile={profile} classes={classes} activeClassId={activeClassId} setActiveClassId={setActiveClassId} students={students} notify={notify} />}
        {tab === "praktek" && <PraktekTab profile={profile} classes={classes} activeClassId={activeClassId} setActiveClassId={setActiveClassId} students={students} notify={notify} />}
        {tab === "kebugaran" && <TkjiTab profile={profile} classes={classes} activeClassId={activeClassId} setActiveClassId={setActiveClassId} students={students} notify={notify} />}
        {tab === "ujian" && <UjianTab profile={profile} classes={classes} activeClassId={activeClassId} setActiveClassId={setActiveClassId} students={students} notify={notify} />}
        {tab === "akhir" && <NilaiAkhirTab profile={profile} classes={classes} activeClassId={activeClassId} setActiveClassId={setActiveClassId} students={students} activeClass={activeClass} notify={notify} />}
        {tab === "siswa" && <SiswaTab profile={profile} classes={classes} setClasses={setClasses} reloadClasses={loadClasses} activeClassId={activeClassId} setActiveClassId={setActiveClassId} students={students} setStudents={setStudents} notify={notify} />}
        {tab === "riwayat" && <AuditLogTab profile={profile} />}
      </main>
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

// ================= ABSENSI =================
function AbsensiTab({ profile, classes, activeClassId, setActiveClassId, students, notify }) {
  const [date, setDate] = useState(todayStr());
  const [record, setRecord] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeClassId) return;
    setLoading(true);
    supabase.from("attendance").select("student_id,status")
      .eq("guru_id", profile.id).eq("subject", profile.subject).eq("date", date)
      .in("student_id", students.map((s) => s.id).length ? students.map((s) => s.id) : ["00000000-0000-0000-0000-000000000000"])
      .then(({ data }) => {
        const rec = {};
        (data || []).forEach((r) => { rec[r.student_id] = r.status; });
        setRecord(rec);
        setLoading(false);
      });
  }, [activeClassId, date, students, profile.id, profile.subject]);

  const setStatus = async (studentId, status) => {
    const isUndo = record[studentId] === status;
    if (isUndo) {
      setRecord((r) => { const next = { ...r }; delete next[studentId]; return next; });
      const { error, offline } = await offlineWrite("attendance", "delete", null, {
        match: { student_id: studentId, guru_id: profile.id, subject: profile.subject, date },
      });
      if (error) notify("Gagal: " + error.message);
      else if (offline) notify("Tersimpan offline, akan disinkron otomatis.");
      return;
    }
    setRecord((r) => ({ ...r, [studentId]: status }));
    const { error, offline } = await offlineWrite(
      "attendance", "upsert",
      { student_id: studentId, guru_id: profile.id, subject: profile.subject, date, status },
      { onConflict: "student_id,guru_id,subject,date" }
    );
    if (error) notify("Gagal menyimpan: " + error.message);
    else if (offline) notify("Tersimpan offline, akan disinkron otomatis.");
  };

  const markAll = async (status) => {
    const rows = students.map((s) => ({ student_id: s.id, guru_id: profile.id, subject: profile.subject, date, status }));
    const { error, offline } = await offlineWrite("attendance", "upsert", rows, { onConflict: "student_id,guru_id,subject,date" });
    if (error) return notify("Gagal: " + error.message);
    const rec = {}; students.forEach((s) => { rec[s.id] = status; });
    setRecord(rec);
    if (offline) notify("Tersimpan offline, akan disinkron otomatis.");
  };

  const clearAll = async () => {
    if (!confirm(`Hapus semua tanda absensi tanggal ${date} untuk kelas ini?`)) return;
    const { error, offline } = await offlineWrite("attendance", "delete", null, {
      match: { guru_id: profile.id, subject: profile.subject, date },
      inFilter: { column: "student_id", values: students.map((s) => s.id) },
    });
    if (error) return notify("Gagal: " + error.message);
    setRecord({});
    notify(offline ? "Tersimpan offline, akan disinkron otomatis." : "Semua tanda absensi tanggal itu sudah dihapus.");
  };

  const summary = ATT_STATUSES.map((st) => ({ ...st, count: students.filter((s) => record[s.id] === st.key).length }));

  return (
    <div>
      <PageHeader eyebrow={`Mapel ${profile.subject}`} title="Absensi" right={<ClassPicker classes={classes} value={activeClassId} onChange={setActiveClassId} />} />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-sm px-3 py-2 rounded-lg font-semibold" style={{ background: BG, color: INK }} />
          <div className="flex gap-2 flex-wrap">
            {ATT_STATUSES.map((st) => (
              <button key={st.key} onClick={() => markAll(st.key)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: st.color + "1A", color: st.color }}>
                Tandai semua {st.key}
              </button>
            ))}
            <button onClick={clearAll} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "#EEF0F3", color: MUTED }}>
              Hapus Semua Tanda
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
        {students.length === 0 ? <EmptyState icon={Users} text="Belum ada siswa di kelas ini. Tambahkan lewat tab Kelas & Siswa." /> : (
          <div className="flex flex-col divide-y" style={{ borderColor: "#EEF0F3" }}>
            {students.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between py-2.5 gap-3 flex-wrap">
                <span className="text-sm font-medium" style={{ color: INK }}>
                  <span style={{ color: MUTED, fontWeight: 600 }}>{i + 1}.</span> {s.name}
                </span>
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
    </div>
  );
}

// ================= POIN & CATATAN =================
function PoinTab({ profile, classes, activeClassId, setActiveClassId, students, notify }) {
  const [studentId, setStudentId] = useState("");
  const [type, setType] = useState("plus");
  const [category, setCategory] = useState(POINT_CATEGORIES.plus[0]);
  const [note, setNote] = useState("");
  const [log, setLog] = useState([]);

  useEffect(() => { setStudentId(students[0]?.id || ""); }, [students]);

  const loadLog = useCallback(async () => {
    if (!students.length) { setLog([]); return; }
    const { data } = await supabase.from("points").select("*").eq("guru_id", profile.id)
      .in("student_id", students.map((s) => s.id)).order("date", { ascending: false }).limit(50);
    setLog(data || []);
  }, [students, profile.id]);

  useEffect(() => { loadLog(); }, [loadLog]);

  const addPoint = async () => {
    if (!studentId) return;
    const row = { id: genId(), student_id: studentId, guru_id: profile.id, type, category, note: note.trim() || null, date: todayStr() };
    const { error, offline } = await offlineWrite("points", "insert", row);
    if (error) return notify("Gagal: " + error.message);
    setLog((l) => [row, ...l]);
    setNote("");
    notify(offline ? "Tersimpan offline, akan disinkron otomatis." : "Poin tersimpan.");
  };
  const removePoint = async (id) => {
    setLog((l) => l.filter((p) => p.id !== id));
    await offlineWrite("points", "delete", null, { match: { id } });
  };

  const balance = (id) => log.filter((p) => p.student_id === id).reduce((s, p) => s + (p.type === "plus" ? 1 : -1), 0);
  const studentName = (id) => students.find((s) => s.id === id)?.name || "—";
  const leaderboard = [...students].sort((a, b) => balance(b.id) - balance(a.id));

  return (
    <div>
      <PageHeader eyebrow={`Mapel ${profile.subject}`} title="Poin & Catatan" right={<ClassPicker classes={classes} value={activeClassId} onChange={setActiveClassId} />} />
      <Card className="mb-5">
        <div className="text-sm font-bold mb-3" style={{ color: INK }}>Catat Poin Baru</div>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="text-sm px-3 py-2 rounded-lg min-w-[160px]" style={{ background: BG, color: INK }}>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #E7E9EE" }}>
            {["plus", "minus"].map((t) => (
              <button key={t} onClick={() => { setType(t); setCategory(POINT_CATEGORIES[t][0]); }}
                className="px-3 py-2 text-xs font-bold flex items-center gap-1.5"
                style={{ background: type === t ? (t === "plus" ? GREEN : RED) : "white", color: type === t ? "white" : MUTED }}>
                {t === "plus" ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {t === "plus" ? "Tambah" : "Kurang"}
              </button>
            ))}
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="text-sm px-3 py-2 rounded-lg" style={{ background: BG, color: INK }}>
            {POINT_CATEGORIES[type].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan (opsional)" className="text-sm px-3 py-2 rounded-lg flex-1 min-w-[150px]" style={{ background: BG, color: INK }} />
          <button onClick={addPoint} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5" style={{ background: NAVY }}>
            <Plus size={14} /> Simpan
          </button>
        </div>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <div className="text-sm font-bold mb-3" style={{ color: INK }}>Papan Poin</div>
          {leaderboard.length === 0 ? <EmptyState icon={Award} text="Belum ada siswa." /> : (
            <div className="flex flex-col divide-y" style={{ borderColor: "#EEF0F3" }}>
              {leaderboard.map((s, i) => {
                const bal = balance(s.id);
                return (
                  <div key={s.id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2.5"><span className="text-xs font-bold w-5" style={{ color: "#C7CEDC" }}>{i + 1}</span><span className="text-sm font-medium" style={{ color: INK }}>{s.name}</span></div>
                    <span className="text-sm font-bold px-2 py-0.5 rounded-full" style={{ color: bal > 0 ? GREEN : bal < 0 ? RED : MUTED, background: bal > 0 ? "#EAF7EF" : bal < 0 ? "#FBEAEC" : BG }}>{bal > 0 ? `+${bal}` : bal}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        <Card>
          <div className="text-sm font-bold mb-3" style={{ color: INK }}>Riwayat & Catatan</div>
          {log.length === 0 ? <EmptyState icon={ClipboardList} text="Belum ada riwayat." /> : (
            <div className="flex flex-col divide-y max-h-[360px] overflow-y-auto" style={{ borderColor: "#EEF0F3" }}>
              {log.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {p.type === "plus" ? <TrendingUp size={14} color={GREEN} className="shrink-0" /> : <TrendingDown size={14} color={RED} className="shrink-0" />}
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: INK }}>{studentName(p.student_id)} · {p.category}</div>
                      <div className="text-xs" style={{ color: MUTED }}>{p.date}{p.note ? ` · ${p.note}` : ""}</div>
                    </div>
                  </div>
                  <button onClick={() => removePoint(p.id)} className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: BG }}><Trash2 size={12} color={MUTED} /></button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ================= NILAI PRAKTEK HARIAN =================
// ================= TES KEBUGARAN (TKJI) =================
// ================= TES KEBUGARAN — wrapper pemilih mode =================
function TkjiTab({ profile, classes, activeClassId, setActiveClassId, students, notify }) {
  const [mode, setMode] = useState("tkji"); // "tkji" | "beep" | "bebas"
  const modes = [
    { key: "tkji", label: "TKJI (Resmi)" },
    { key: "beep", label: "Beep Test (MFT)" },
    { key: "bebas", label: "Tes Bebas" },
  ];
  return (
    <div>
      <PageHeader eyebrow="Guru Mapel" title="Tes Kebugaran" right={<ClassPicker classes={classes} value={activeClassId} onChange={setActiveClassId} />} />
      <div className="flex gap-2 mb-5 flex-wrap">
        {modes.map((m) => (
          <button key={m.key} onClick={() => setMode(m.key)}
            className="text-xs font-bold px-3 py-1.5 rounded-full"
            style={{ background: mode === m.key ? NAVY : "#EEF0F3", color: mode === m.key ? "#fff" : MUTED }}>
            {m.label}
          </button>
        ))}
      </div>
      {mode === "tkji" && <TkjiMode profile={profile} classes={classes} activeClassId={activeClassId} setActiveClassId={setActiveClassId} students={students} notify={notify} />}
      {mode === "beep" && <BeepTestMode profile={profile} classes={classes} activeClassId={activeClassId} setActiveClassId={setActiveClassId} students={students} notify={notify} />}
      {mode === "bebas" && <TesBebasMode profile={profile} classes={classes} activeClassId={activeClassId} setActiveClassId={setActiveClassId} students={students} notify={notify} />}
    </div>
  );
}

function TkjiMode({ profile, classes, activeClassId, setActiveClassId, students, notify }) {
  const [studentId, setStudentId] = useState("");
  const [draftMap, setDraftMap] = useState({});
  const emptyForm = { lari60: "", gantung: "", situp: "", loncat: "", lariMenit: "", lariDetik: "" };
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);

  useEffect(() => { setStudentId(students[0]?.id || ""); }, [students]);

  const loadDrafts = useCallback(async () => {
    if (!students.length) { setDraftMap({}); return; }
    const { data } = await supabase.from("fitness_tests").select("*").in("student_id", students.map((s) => s.id));
    const map = {};
    (data || []).forEach((d) => { map[d.student_id] = d; });
    setDraftMap(map);
  }, [students]);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  useEffect(() => {
    const d = draftMap[studentId];
    if (!d) { setForm(emptyForm); return; }
    const mmss = detikToMMSS(d.lari_jauh_detik);
    setForm({
      lari60: d.lari60_detik ?? "",
      gantung: d.gantung_raw ?? "",
      situp: d.situp_reps ?? "",
      loncat: d.loncat_cm ?? "",
      lariMenit: mmss.menit,
      lariDetik: mmss.detik,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, draftMap]);

  const student = students.find((s) => s.id === studentId);
  const gender = student?.gender || "L";

  const saveDraft = async (nextForm) => {
    if (!studentId) return;
    const lariJauhDetik = (nextForm.lariMenit === "" && nextForm.lariDetik === "") ? null : mmssToDetik(nextForm.lariMenit, nextForm.lariDetik);
    const row = {
      student_id: studentId,
      guru_id: profile.id,
      lari60_detik: nextForm.lari60 === "" ? null : Number(nextForm.lari60),
      gantung_raw: nextForm.gantung === "" ? null : Number(nextForm.gantung),
      situp_reps: nextForm.situp === "" ? null : Number(nextForm.situp),
      loncat_cm: nextForm.loncat === "" ? null : Number(nextForm.loncat),
      lari_jauh_detik: lariJauhDetik,
      updated_at: new Date().toISOString(),
    };
    await offlineWrite("fitness_tests", "upsert", row, { onConflict: "student_id" });
    setDraftMap((m) => ({ ...m, [studentId]: row }));
  };

  const s1 = scoreLari60(form.lari60, gender);
  const s2 = scoreGantung(form.gantung, gender);
  const s3 = scoreSitup(form.situp, gender);
  const s4 = scoreLoncat(form.loncat, gender);
  const lariJauhDetikForm = (form.lariMenit === "" && form.lariDetik === "") ? "" : mmssToDetik(form.lariMenit, form.lariDetik);
  const s5 = scoreLariJauh(lariJauhDetikForm, gender);
  const allScores = [s1, s2, s3, s4, s5];
  const complete = allScores.every((x) => x !== null);
  const total = complete ? allScores.reduce((a, b) => a + b, 0) : null;
  const category = complete ? classifyTotal(total) : null;

  const countComplete = (id) => {
    const d = draftMap[id];
    if (!d) return 0;
    return [d.lari60_detik, d.gantung_raw, d.situp_reps, d.loncat_cm, d.lari_jauh_detik].filter((x) => x !== null && x !== undefined).length;
  };

  const sendToNilaiPraktik = async () => {
    if (!complete || !studentId) return;
    setSending(true);
    const mmssLabel = `${form.lariMenit || 0}'${String(form.lariDetik || 0).padStart(2, "0")}"`;
    const note = `Tes Kebugaran (TKJI): Lari 60m ${form.lari60}dtk (nilai ${s1}), ${gantungLabel(gender)} ${form.gantung} (nilai ${s2}), Baring Duduk ${form.situp}x (nilai ${s3}), Loncat Tegak ${form.loncat}cm (nilai ${s4}), ${lariJauhLabel(gender)} ${mmssLabel} (nilai ${s5}). Total ${total} = ${category}.`;
    const row = { id: genId(), student_id: studentId, guru_id: profile.id, subject: profile.subject, date: todayStr(), score: totalToScale100(total), note };
    const { error, offline } = await offlineWrite("practice_scores", "insert", row);
    if (error) { setSending(false); return notify("Gagal: " + error.message); }
    await offlineWrite("fitness_tests", "delete", null, { match: { student_id: studentId } });
    setDraftMap((m) => { const next = { ...m }; delete next[studentId]; return next; });
    setForm(emptyForm);
    setSending(false);
    notify(offline ? "Tersimpan offline, akan disinkron & masuk ke Nilai Harian otomatis." : `Hasil TKJI (${category}) sudah masuk ke Nilai Harian.`);
  };

  const NumField = ({ label, value, onChange, onBlur, scoreVal, placeholder }) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-semibold" style={{ color: MUTED }}>{label}</label>
        {scoreVal !== null && <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: NAVY }}>Nilai {scoreVal}</span>}
      </div>
      <input type="number" value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder}
        className="text-sm px-3 py-2 rounded-lg w-full" style={{ background: BG, color: INK }} />
    </div>
  );

  return (
    <div>
      <div className="text-xs mb-4" style={{ color: MUTED }}>
        Norma TKJI usia 16-19 tahun. Isi angka mentah tiap item (boleh di hari berbeda-beda) — nilai & kategori
        dihitung otomatis. Kalau ke-5 item sudah lengkap, klik "Kirim ke Nilai Harian" untuk mengubahnya jadi satu
        nilai praktik dan mengosongkan draft ini lagi untuk putaran tes berikutnya.
      </div>
      {students.length === 0 ? (
        <Card><EmptyState icon={Users} text="Belum ada siswa di kelas ini." /></Card>
      ) : (
        <div className="flex flex-col md:flex-row gap-5">
          <Card className="md:w-64 shrink-0" style={{ padding: 0 }}>
            <div className="px-4 pt-4 pb-2 text-sm font-bold" style={{ color: INK }}>Daftar Siswa</div>
            <div className="flex flex-col divide-y max-h-[70vh] overflow-y-auto" style={{ borderColor: "#EEF0F3" }}>
              {students.map((s) => (
                <button key={s.id} onClick={() => setStudentId(s.id)}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between gap-2">
                  <span style={{ color: INK, fontWeight: studentId === s.id ? 700 : 500 }}>{s.name}</span>
                  <span className="text-xs shrink-0" style={{ color: countComplete(s.id) === 5 ? GREEN : MUTED }}>{countComplete(s.id)}/5</span>
                </button>
              ))}
            </div>
          </Card>
          <Card className="flex-1">
            <div className="text-sm font-bold mb-1" style={{ color: INK }}>{student?.name || "—"}</div>
            <div className="text-xs mb-4" style={{ color: MUTED }}>Jenis kelamin: {gender === "L" ? "Laki-laki" : "Perempuan"}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumField label="Lari 60 Meter (detik)" value={form.lari60} scoreVal={s1} placeholder="mis. 8.5"
                onChange={(e) => setForm((f) => ({ ...f, lari60: e.target.value }))}
                onBlur={() => saveDraft(form)} />
              <NumField label={gantungLabel(gender)} value={form.gantung} scoreVal={s2} placeholder="mis. 12"
                onChange={(e) => setForm((f) => ({ ...f, gantung: e.target.value }))}
                onBlur={() => saveDraft(form)} />
              <NumField label="Baring Duduk 60 Detik (kali)" value={form.situp} scoreVal={s3} placeholder="mis. 25"
                onChange={(e) => setForm((f) => ({ ...f, situp: e.target.value }))}
                onBlur={() => saveDraft(form)} />
              <NumField label="Loncat Tegak (cm)" value={form.loncat} scoreVal={s4} placeholder="mis. 55"
                onChange={(e) => setForm((f) => ({ ...f, loncat: e.target.value }))}
                onBlur={() => saveDraft(form)} />
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold" style={{ color: MUTED }}>{lariJauhLabel(gender)} (menit : detik)</label>
                  {s5 !== null && <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: NAVY }}>Nilai {s5}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" value={form.lariMenit} placeholder="mnt"
                    onChange={(e) => setForm((f) => ({ ...f, lariMenit: e.target.value }))}
                    onBlur={() => saveDraft(form)}
                    className="text-sm px-3 py-2 rounded-lg w-full" style={{ background: BG, color: INK }} />
                  <span style={{ color: MUTED }}>:</span>
                  <input type="number" value={form.lariDetik} placeholder="dtk"
                    onChange={(e) => setForm((f) => ({ ...f, lariDetik: e.target.value }))}
                    onBlur={() => saveDraft(form)}
                    className="text-sm px-3 py-2 rounded-lg w-full" style={{ background: BG, color: INK }} />
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-lg p-4 flex items-center justify-between gap-3 flex-wrap" style={{ background: complete ? "#E8F6EE" : BG }}>
              <div>
                {complete ? (
                  <div className="text-sm font-bold" style={{ color: INK }}>Total {total} — Kategori: {category}</div>
                ) : (
                  <div className="text-xs" style={{ color: MUTED }}>Lengkapi ke-5 item dulu untuk melihat kategori & mengirim ke Nilai Harian.</div>
                )}
              </div>
              <button onClick={sendToNilaiPraktik} disabled={!complete || sending}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white shrink-0"
                style={{ background: NAVY, opacity: (!complete || sending) ? 0.5 : 1 }}>
                {sending ? "Mengirim…" : "Kirim ke Nilai Harian"}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ================= BEEP TEST (MFT) =================
function BeepTestMode({ profile, students, notify }) {
  const [studentId, setStudentId] = useState("");
  const [level, setLevel] = useState("");
  const [shuttle, setShuttle] = useState("");
  const [age, setAge] = useState("");
  const [sending, setSending] = useState(false);
  const [worst, setWorst] = useState(() => {
    try { return localStorage.getItem("r3edu_beep_worst") || "20"; } catch { return "20"; }
  });
  const [best, setBest] = useState(() => {
    try { return localStorage.getItem("r3edu_beep_best") || "65"; } catch { return "65"; }
  });

  useEffect(() => { setStudentId(students[0]?.id || ""); }, [students]);
  useEffect(() => { try { localStorage.setItem("r3edu_beep_worst", worst); } catch { /* abaikan */ } }, [worst]);
  useEffect(() => { try { localStorage.setItem("r3edu_beep_best", best); } catch { /* abaikan */ } }, [best]);

  const student = students.find((s) => s.id === studentId);
  const gender = student?.gender || "L";
  const vo2 = beepVO2max(level, shuttle, age);
  const category = classifyVO2max(vo2, gender);
  const scaledScore = vo2 != null ? customScore(vo2, worst, best) : null;

  const send = async () => {
    if (!studentId || vo2 == null || scaledScore == null) return;
    setSending(true);
    const note = `Beep Test/MFT: Level ${level} Shuttle ${shuttle}, usia ${age} th. Estimasi VO2max ${vo2} ml/kg/menit — Kategori: ${category}. Skala nilai: VO2max ${worst}=0, ${best}=100. (Estimasi rumus umum, bukan standar baku — mohon dicek ulang.)`;
    const row = { id: genId(), student_id: studentId, guru_id: profile.id, subject: profile.subject, date: todayStr(), score: scaledScore, note };
    const { error, offline } = await offlineWrite("practice_scores", "insert", row);
    setSending(false);
    if (error) return notify("Gagal: " + error.message);
    setLevel(""); setShuttle("");
    notify(offline ? "Tersimpan offline, akan disinkron & masuk ke Nilai Harian otomatis." : `Hasil Beep Test (${category}) sudah masuk ke Nilai Harian.`);
  };

  return (
    <div>
      <div className="rounded-lg px-4 py-3 mb-4 text-xs" style={{ background: "#FFF4E5", color: "#8A5300" }}>
        ⚠️ Estimasi VO2max di sini pakai rumus umum (Léger dkk.), <b>bukan</b> tabel standar baku resmi seperti
        TKJI. Cocokkan dulu dengan pedoman sekolah/pengawas Anda sebelum dipakai untuk nilai rapor.
      </div>
      <Card className="mb-5">
        <div className="text-sm font-bold mb-3" style={{ color: INK }}>Atur Skala Nilai</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>VO2max untuk Nilai 0</label>
            <input type="number" value={worst} onChange={(e) => setWorst(e.target.value)}
              className="text-sm px-3 py-2 rounded-lg w-full" style={{ background: BG, color: INK }} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>VO2max untuk Nilai 100</label>
            <input type="number" value={best} onChange={(e) => setBest(e.target.value)}
              className="text-sm px-3 py-2 rounded-lg w-full" style={{ background: BG, color: INK }} />
          </div>
        </div>
        <div className="text-xs mt-2" style={{ color: MUTED }}>
          Angka ini diingat otomatis untuk pemakaian berikutnya. Boleh dibedakan per kelas/gender kalau perlu, tinggal diubah sebelum isi hasil.
        </div>
      </Card>
      {students.length === 0 ? (
        <Card><EmptyState icon={Users} text="Belum ada siswa di kelas ini." /></Card>
      ) : (
        <div className="flex flex-col md:flex-row gap-5">
          <Card className="md:w-64 shrink-0" style={{ padding: 0 }}>
            <div className="px-4 pt-4 pb-2 text-sm font-bold" style={{ color: INK }}>Daftar Siswa</div>
            <div className="flex flex-col divide-y max-h-[70vh] overflow-y-auto" style={{ borderColor: "#EEF0F3" }}>
              {students.map((s) => (
                <button key={s.id} onClick={() => setStudentId(s.id)}
                  className="w-full text-left px-4 py-2.5 text-sm">
                  <span style={{ color: INK, fontWeight: studentId === s.id ? 700 : 500 }}>{s.name}</span>
                </button>
              ))}
            </div>
          </Card>
          <Card className="flex-1">
            <div className="text-sm font-bold mb-4" style={{ color: INK }}>{student?.name || "—"}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>Level Tercapai</label>
                <input type="number" value={level} onChange={(e) => setLevel(e.target.value)} placeholder="mis. 7"
                  className="text-sm px-3 py-2 rounded-lg w-full" style={{ background: BG, color: INK }} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>Shuttle ke-</label>
                <input type="number" value={shuttle} onChange={(e) => setShuttle(e.target.value)} placeholder="mis. 4"
                  className="text-sm px-3 py-2 rounded-lg w-full" style={{ background: BG, color: INK }} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>Usia (tahun)</label>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="mis. 17"
                  className="text-sm px-3 py-2 rounded-lg w-full" style={{ background: BG, color: INK }} />
              </div>
            </div>
            <div className="mt-5 rounded-lg p-4 flex items-center justify-between gap-3 flex-wrap" style={{ background: vo2 != null ? "#E8F6EE" : BG }}>
              <div>
                {vo2 != null ? (
                  <div className="text-sm font-bold" style={{ color: INK }}>
                    Estimasi VO2max {vo2} ml/kg/menit — Kategori: {category} — Nilai: {scaledScore ?? "—"}
                  </div>
                ) : (
                  <div className="text-xs" style={{ color: MUTED }}>Isi Level dan Usia dulu.</div>
                )}
              </div>
              <button onClick={send} disabled={vo2 == null || scaledScore == null || sending}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white shrink-0"
                style={{ background: NAVY, opacity: (vo2 == null || scaledScore == null || sending) ? 0.5 : 1 }}>
                {sending ? "Mengirim…" : "Kirim ke Nilai Harian"}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ================= TES BEBAS =================
function TesBebasMode({ profile, students, notify }) {
  const [presets, setPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem("r3edu_tes_bebas_presets") || "[]"); } catch { return []; }
  });
  const [testName, setTestName] = useState("");
  const [unit, setUnit] = useState("");
  const [worst, setWorst] = useState("");
  const [best, setBest] = useState("");
  const [studentId, setStudentId] = useState("");
  const [raw, setRaw] = useState("");
  const [manualScore, setManualScore] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => { setStudentId(students[0]?.id || ""); }, [students]);

  const student = students.find((s) => s.id === studentId);
  const autoScore = customScore(raw, worst, best);
  const finalScore = manualScore !== "" ? Number(manualScore) : autoScore;

  const savePreset = () => {
    if (!testName.trim()) return;
    const next = [{ name: testName.trim(), unit: unit.trim(), worst, best }, ...presets.filter((p) => p.name !== testName.trim())].slice(0, 10);
    setPresets(next);
    try { localStorage.setItem("r3edu_tes_bebas_presets", JSON.stringify(next)); } catch { /* abaikan */ }
  };

  const loadPreset = (p) => {
    setTestName(p.name); setUnit(p.unit); setWorst(p.worst); setBest(p.best);
  };

  const send = async () => {
    if (!studentId || !testName.trim() || finalScore == null) return;
    setSending(true);
    savePreset();
    const note = `Tes Bebas — ${testName.trim()}: ${raw}${unit ? " " + unit : ""}${manualScore !== "" ? " (nilai diisi manual)" : ` (nilai 0 = ${worst}, nilai 100 = ${best})`}.`;
    const row = { id: genId(), student_id: studentId, guru_id: profile.id, subject: profile.subject, date: todayStr(), score: Math.max(0, Math.min(100, finalScore)), note };
    const { error, offline } = await offlineWrite("practice_scores", "insert", row);
    setSending(false);
    if (error) return notify("Gagal: " + error.message);
    setRaw(""); setManualScore("");
    notify(offline ? "Tersimpan offline, akan disinkron & masuk ke Nilai Harian otomatis." : "Hasil tes sudah masuk ke Nilai Harian.");
  };

  return (
    <div>
      <Card className="mb-5">
        <div className="text-sm font-bold mb-3" style={{ color: INK }}>1. Atur Tes</div>
        {presets.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-3">
            {presets.map((p) => (
              <button key={p.name} onClick={() => loadPreset(p)}
                className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "#EEF0F3", color: INK }}>
                {p.name}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>Nama Tes</label>
            <input value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="mis. Wall Sit"
              className="text-sm px-3 py-2 rounded-lg w-full" style={{ background: BG, color: INK }} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>Satuan</label>
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="mis. detik"
              className="text-sm px-3 py-2 rounded-lg w-full" style={{ background: BG, color: INK }} />
          </div>
          <div />
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>Nilai 0 di angka</label>
            <input type="number" value={worst} onChange={(e) => setWorst(e.target.value)} placeholder="mis. 10"
              className="text-sm px-3 py-2 rounded-lg w-full" style={{ background: BG, color: INK }} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>Nilai 100 di angka</label>
            <input type="number" value={best} onChange={(e) => setBest(e.target.value)} placeholder="mis. 90"
              className="text-sm px-3 py-2 rounded-lg w-full" style={{ background: BG, color: INK }} />
          </div>
        </div>
        <div className="text-xs mt-2" style={{ color: MUTED }}>
          Tidak wajib diisi kalau mau isi nilai manual saja. Arah (makin besar/makin kecil makin baik) otomatis
          mengikuti mana yang lebih besar di antara "Nilai 0" dan "Nilai 100".
        </div>
      </Card>

      {students.length === 0 ? (
        <Card><EmptyState icon={Users} text="Belum ada siswa di kelas ini." /></Card>
      ) : (
        <div className="flex flex-col md:flex-row gap-5">
          <Card className="md:w-64 shrink-0" style={{ padding: 0 }}>
            <div className="px-4 pt-4 pb-2 text-sm font-bold" style={{ color: INK }}>Daftar Siswa</div>
            <div className="flex flex-col divide-y max-h-[70vh] overflow-y-auto" style={{ borderColor: "#EEF0F3" }}>
              {students.map((s) => (
                <button key={s.id} onClick={() => setStudentId(s.id)} className="w-full text-left px-4 py-2.5 text-sm">
                  <span style={{ color: INK, fontWeight: studentId === s.id ? 700 : 500 }}>{s.name}</span>
                </button>
              ))}
            </div>
          </Card>
          <Card className="flex-1">
            <div className="text-sm font-bold mb-4" style={{ color: INK }}>2. Isi Hasil — {student?.name || "—"}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>Hasil Mentah {unit && `(${unit})`}</label>
                <input type="number" value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="mis. 45"
                  className="text-sm px-3 py-2 rounded-lg w-full" style={{ background: BG, color: INK }} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>
                  Nilai (0-100) {autoScore != null && manualScore === "" && "— otomatis"}
                </label>
                <input type="number" value={manualScore !== "" ? manualScore : (autoScore ?? "")} onChange={(e) => setManualScore(e.target.value)}
                  placeholder="Bisa diubah manual"
                  className="text-sm px-3 py-2 rounded-lg w-full" style={{ background: BG, color: INK }} />
              </div>
            </div>
            <button onClick={send} disabled={!testName.trim() || finalScore == null || sending}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: NAVY, opacity: (!testName.trim() || finalScore == null || sending) ? 0.5 : 1 }}>
              {sending ? "Mengirim…" : "Kirim ke Nilai Harian"}
            </button>
          </Card>
        </div>
      )}
    </div>
  );
}

function PraktekTab({ profile, classes, activeClassId, setActiveClassId, students, notify }) {
  const [date, setDate] = useState(todayStr());
  const [materi, setMateri] = useState("");
  const [scores, setScores] = useState({});
  const [entries, setEntries] = useState([]);
  const [expandedTugas, setExpandedTugas] = useState({});

  const loadEntries = useCallback(async () => {
    if (!students.length) { setEntries([]); return; }
    const { data } = await supabase.from("practice_scores").select("*").eq("guru_id", profile.id).eq("subject", profile.subject)
      .in("student_id", students.map((s) => s.id)).order("date", { ascending: false }).limit(300);
    setEntries(data || []);
  }, [students, profile.id, profile.subject]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const saveScore = async (studentId) => {
    const val = scores[studentId];
    if (val === undefined || val === "") return;
    const row = {
      id: genId(), student_id: studentId, guru_id: profile.id, subject: profile.subject, date, score: Number(val),
      note: materi.trim() || null,
    };
    const { error, offline } = await offlineWrite("practice_scores", "insert", row);
    if (error) return notify("Gagal: " + error.message);
    setEntries((e) => [row, ...e]);
    setScores((s) => ({ ...s, [studentId]: "" }));
    notify(offline ? "Tersimpan offline, akan disinkron otomatis." : "Nilai tersimpan.");
  };
  const removeEntry = async (id) => {
    setEntries((e) => e.filter((x) => x.id !== id));
    await offlineWrite("practice_scores", "delete", null, { match: { id } });
  };

  const avgFor = (id) => {
    const vals = entries.filter((e) => e.student_id === id).map((e) => e.score);
    if (!vals.length) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  };
  const studentName = (id) => students.find((s) => s.id === id)?.name || "—";

  // siapa saja yang sudah/belum mengumpulkan untuk sesi tanggal + nama tugas yang sedang diisi
  const currentTugasEntries = entries.filter((e) => e.date === date && (e.note || "") === materi.trim());
  const submittedIds = new Set(currentTugasEntries.map((e) => e.student_id));
  const belumForCurrent = students.filter((s) => !submittedIds.has(s.id));

  // kelompokkan riwayat jadi daftar tugas (per tanggal + nama tugas)
  const tugasList = useMemo(() => {
    const map = new Map();
    entries.forEach((e) => {
      const key = `${e.date}|${e.note || ""}`;
      if (!map.has(key)) map.set(key, { date: e.date, materi: e.note || "(tanpa nama tugas)", entries: [] });
      map.get(key).entries.push(e);
    });
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [entries]);

  return (
    <div>
      <PageHeader eyebrow={`Mapel ${profile.subject}`} title="Nilai Harian" right={<ClassPicker classes={classes} value={activeClassId} onChange={setActiveClassId} />} />
      <Card className="mb-5">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-sm font-bold" style={{ color: INK }}>Tanggal:</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-sm px-3 py-2 rounded-lg font-semibold" style={{ background: BG, color: INK }} />
          <span className="text-sm font-bold ml-2" style={{ color: INK }}>Nama Tugas:</span>
          <input value={materi} onChange={(e) => setMateri(e.target.value)} placeholder="mis. Tugas Bab 3, Lari 100m"
            className="text-sm px-3 py-2 rounded-lg flex-1 min-w-[220px]" style={{ background: BG, color: INK }} />
        </div>
        {students.length > 0 && (
          <div className="mb-4 text-xs px-3 py-2 rounded-lg" style={{ background: belumForCurrent.length ? "#FFF4EE" : "#EAF7EF", color: belumForCurrent.length ? "#9A4A22" : GREEN }}>
            {belumForCurrent.length === 0
              ? "Semua siswa sudah punya nilai untuk tugas & tanggal ini."
              : `Belum mengumpulkan (${belumForCurrent.length}): ${belumForCurrent.map((s) => s.name).join(", ")}`}
          </div>
        )}
        {students.length === 0 ? <EmptyState icon={Users} text="Belum ada siswa di kelas ini." /> : (
          <div className="flex flex-col divide-y" style={{ borderColor: "#EEF0F3" }}>
            {students.map((s) => {
              const already = submittedIds.has(s.id);
              return (
                <div key={s.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div>
                    <div className="text-sm font-medium flex items-center gap-1.5" style={{ color: INK }}>
                      {s.name}
                      {already && <span className="text-xs font-bold" style={{ color: GREEN }}>✓ sudah</span>}
                    </div>
                    <div className="text-xs" style={{ color: MUTED }}>Rata-rata sejauh ini: {avgFor(s.id) ?? "—"}</div>
                  </div>
                  <div className="flex gap-2">
                    <input type="number" min={0} max={100} placeholder="0-100" value={scores[s.id] ?? ""} onChange={(e) => setScores((sc) => ({ ...sc, [s.id]: e.target.value }))}
                      className="w-20 text-center text-sm px-2 py-1.5 rounded-md" style={{ background: BG, color: INK }} />
                    <button onClick={() => saveScore(s.id)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white" style={{ background: NAVY }}>Simpan</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card style={{ padding: 0 }}>
        <div className="px-5 pt-4 pb-2 text-sm font-bold" style={{ color: INK }}>Daftar Tugas</div>
        <div className="px-5 pb-1 text-xs" style={{ color: MUTED }}>Klik salah satu tugas untuk lihat siapa saja yang belum mengumpulkan.</div>
        {tugasList.length === 0 ? <div className="px-5 pb-5"><EmptyState icon={ClipboardList} text="Belum ada tugas/nilai yang dicatat." /></div> : (
          <div className="flex flex-col divide-y" style={{ borderColor: "#EEF0F3" }}>
            {tugasList.map((t, idx) => {
              const key = `${t.date}|${t.materi}`;
              const isOpen = !!expandedTugas[key];
              const submitted = new Set(t.entries.map((e) => e.student_id));
              const missing = students.filter((s) => !submitted.has(s.id));
              return (
                <div key={key + idx}>
                  <button onClick={() => setExpandedTugas((e) => ({ ...e, [key]: !e[key] }))}
                    className="w-full flex items-center justify-between px-5 py-3 text-left">
                    <div className="flex items-center gap-2 min-w-0">
                      <span style={{ color: MUTED, fontSize: 11, width: 12, display: "inline-block" }}>{isOpen ? "▾" : "▸"}</span>
                      <span className="text-sm font-semibold truncate" style={{ color: INK }}>{t.materi}</span>
                      <span className="text-xs shrink-0" style={{ color: MUTED }}>{t.date}</span>
                    </div>
                    <span className="text-xs font-semibold shrink-0" style={{ color: missing.length ? "#9A4A22" : GREEN }}>
                      {t.entries.length}/{students.length} mengumpulkan
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4">
                      {missing.length > 0 && (
                        <div className="text-xs mb-2 px-3 py-2 rounded-lg" style={{ background: "#FFF4EE", color: "#9A4A22" }}>
                          Belum mengumpulkan: {missing.map((s) => s.name).join(", ")}
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        {t.entries.map((e) => (
                          <div key={e.id} className="flex items-center justify-between text-sm py-1">
                            <span style={{ color: INK }}>{studentName(e.student_id)} — <b>{e.score}</b></span>
                            <button onClick={() => removeEntry(e.id)} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: BG }}><Trash2 size={11} color={MUTED} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ================= UJIAN AKHIR =================
function UjianTab({ profile, classes, activeClassId, setActiveClassId, students, notify }) {
  const [scores, setScores] = useState({});

  const load = useCallback(async () => {
    if (!students.length) { setScores({}); return; }
    const { data } = await supabase.from("final_exam_scores").select("*").eq("guru_id", profile.id).eq("subject", profile.subject)
      .in("student_id", students.map((s) => s.id));
    const map = {};
    (data || []).forEach((r) => { map[r.student_id] = r.score; });
    setScores(map);
  }, [students, profile.id, profile.subject]);

  useEffect(() => { load(); }, [load]);

  const updateScore = async (studentId, value) => {
    const v = value === "" ? "" : Math.max(0, Math.min(100, Number(value)));
    setScores((s) => ({ ...s, [studentId]: v }));
    if (v === "") return;
    const { error, offline } = await offlineWrite(
      "final_exam_scores", "upsert",
      { student_id: studentId, guru_id: profile.id, subject: profile.subject, score: v },
      { onConflict: "student_id,guru_id,subject" }
    );
    if (error) notify("Gagal: " + error.message);
    else if (offline) notify("Tersimpan offline, akan disinkron otomatis.");
  };

  return (
    <div>
      <PageHeader eyebrow={`Mapel ${profile.subject}`} title="Ujian Akhir" right={<ClassPicker classes={classes} value={activeClassId} onChange={setActiveClassId} />} />
      <Card style={{ padding: 0 }}>
        {students.length === 0 ? <EmptyState icon={FileSpreadsheet} text="Belum ada siswa di kelas ini." /> : (
          <div className="flex flex-col divide-y" style={{ borderColor: "#EEF0F3" }}>
            {students.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between py-2.5 px-5" style={{ background: i % 2 === 0 ? "white" : BG }}>
                <span className="text-sm font-medium" style={{ color: INK }}>{s.name}</span>
                <input type="number" min={0} max={100} value={scores[s.id] ?? ""} onChange={(e) => updateScore(s.id, e.target.value)}
                  placeholder="0-100" className="w-20 text-center text-sm px-2 py-1.5 rounded-md" style={{ background: "white", boxShadow: "inset 0 0 0 1px #E7E9EE", color: INK }} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ================= NILAI AKHIR =================
function NilaiAkhirTab({ profile, classes, activeClassId, setActiveClassId, students, activeClass, notify }) {
  const [weights, setWeights] = useState({ w_absensi: 20, w_praktek: 40, w_ujian: 30, w_poin: 10 });
  const [showSettings, setShowSettings] = useState(false);
  const [expandedAtt, setExpandedAtt] = useState({});
  const [attendance, setAttendance] = useState([]);
  const [practice, setPractice] = useState([]);
  const [exams, setExams] = useState({});
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("grade_weights").select("*").eq("guru_id", profile.id).single()
      .then(({ data }) => { if (data) setWeights(data); });
  }, [profile.id]);

  const saveWeights = async (w) => {
    setWeights(w);
    const { offline } = await offlineWrite("grade_weights", "upsert", { guru_id: profile.id, ...w }, { onConflict: "guru_id" });
    notify(offline ? "Tersimpan offline, akan disinkron otomatis." : "Bobot tersimpan.");
  };

  const loadAll = useCallback(async () => {
    if (!students.length) { setAttendance([]); setPractice([]); setExams({}); setPoints([]); setLoading(false); return; }
    setLoading(true);
    const ids = students.map((s) => s.id);
    const [att, prac, exam, pts] = await Promise.all([
      supabase.from("attendance").select("student_id,status,date").eq("guru_id", profile.id).eq("subject", profile.subject).in("student_id", ids),
      supabase.from("practice_scores").select("student_id,score").eq("guru_id", profile.id).eq("subject", profile.subject).in("student_id", ids),
      supabase.from("final_exam_scores").select("student_id,score").eq("guru_id", profile.id).eq("subject", profile.subject).in("student_id", ids),
      supabase.from("points").select("student_id,type").eq("guru_id", profile.id).in("student_id", ids),
    ]);
    setAttendance(att.data || []); setPractice(prac.data || []); setPoints(pts.data || []);
    const exMap = {}; (exam.data || []).forEach((r) => { exMap[r.student_id] = r.score; });
    setExams(exMap);
    setLoading(false);
  }, [students, profile.id, profile.subject]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const rows = useMemo(() => students.map((s) => {
    const attRows = attendance.filter((a) => a.student_id === s.id);
    const hadir = attRows.filter((a) => a.status === "Hadir").length;
    const izin = attRows.filter((a) => a.status === "Izin").length;
    const sakit = attRows.filter((a) => a.status === "Sakit").length;
    const alpa = attRows.filter((a) => a.status === "Alpa").length;
    const izinDates = attRows.filter((a) => a.status === "Izin").map((a) => a.date).sort();
    const sakitDates = attRows.filter((a) => a.status === "Sakit").map((a) => a.date).sort();
    const alpaDates = attRows.filter((a) => a.status === "Alpa").map((a) => a.date).sort();
    const hadirDates = attRows.filter((a) => a.status === "Hadir").map((a) => a.date).sort();
    const totalSesi = attRows.length;
    const tidakMasuk = izin + sakit + alpa;
    const attPct = totalSesi ? Math.round((hadir / totalSesi) * 100) : 0;
    const pracVals = practice.filter((p) => p.student_id === s.id).map((p) => p.score);
    const avgPrac = pracVals.length ? Math.round((pracVals.reduce((a, b) => a + b, 0) / pracVals.length) * 10) / 10 : 0;
    const exam = exams[s.id] || 0;
    const netPoints = points.filter((p) => p.student_id === s.id).reduce((sum, p) => sum + (p.type === "plus" ? 1 : -1), 0);
    const final = computeFinalScore({ attendancePct: attPct, avgPractice: avgPrac, examScore: exam, netPoints, weights });
    return { id: s.id, name: s.name, hadir, izin, sakit, alpa, hadirDates, izinDates, sakitDates, alpaDates, totalSesi, tidakMasuk, attPct, avgPrac, exam, netPoints, final };
  }), [students, attendance, practice, exams, points, weights]);

  const handleExport = () => {
    const rekapAbsensi = rows.map((r) => ({
      Nama: r.name, Hadir: r.hadir, Izin: r.izin, Sakit: r.sakit, Alpa: r.alpa,
      "Total Tidak Masuk": r.tidakMasuk, "Total Pertemuan": r.totalSesi, "Kehadiran (%)": r.attPct,
      "Tanggal Izin": r.izinDates.join(", ") || "-",
      "Tanggal Sakit": r.sakitDates.join(", ") || "-",
      "Tanggal Alpa": r.alpaDates.join(", ") || "-",
    }));
    const rekapNilai = rows.map((r) => ({
      Nama: r.name, "Kehadiran (%)": r.attPct, "Rata Nilai Harian": r.avgPrac,
      "Ujian Akhir": r.exam, "Poin Bersih": r.netPoints, "Nilai Akhir": r.final, Predikat: gradeLetter(r.final),
    }));
    exportToExcel(
      [{ name: "Rekap Absensi", rows: rekapAbsensi }, { name: "Nilai Akhir", rows: rekapNilai }],
      `Nilai_${profile.subject}_${activeClass?.name || ""}_${todayStr()}.xlsx`
    );
  };

  return (
    <div>
      <PageHeader eyebrow={`Mapel ${profile.subject}`} title="Nilai Akhir" right={<ClassPicker classes={classes} value={activeClassId} onChange={setActiveClassId} />} />

      <Card className="mb-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <button onClick={() => setShowSettings((v) => !v)} className="flex items-center gap-1.5 text-xs font-bold" style={{ color: NAVY }}>
            <Settings2 size={14} /> Atur Bobot Penilaian
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: GREEN }}>
            <Download size={14} /> Unduh Excel
          </button>
        </div>
        <div className="text-xs" style={{ color: MUTED }}>
          Bobot saat ini: Absensi {weights.w_absensi}% · Nilai Harian {weights.w_praktek}% · Ujian Akhir {weights.w_ujian}% · Poin {weights.w_poin}%
        </div>
        {showSettings && (
          <div className="flex flex-wrap gap-3 mt-4 pt-4" style={{ borderTop: "1px solid #EEF0F3" }}>
            {[["w_absensi", "Absensi %"], ["w_praktek", "Nilai Harian %"], ["w_ujian", "Ujian Akhir %"], ["w_poin", "Poin %"]].map(([k, label]) => (
              <div key={k}>
                <div className="text-xs mb-1" style={{ color: MUTED }}>{label}</div>
                <input type="number" min={0} max={100} value={weights[k]}
                  onChange={(e) => setWeights((w) => ({ ...w, [k]: Number(e.target.value) }))}
                  className="w-24 text-center text-sm px-2 py-1.5 rounded-md" style={{ background: BG, color: INK }} />
              </div>
            ))}
            <button onClick={() => saveWeights(weights)} className="self-end px-3.5 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: NAVY }}>Simpan Bobot</button>
          </div>
        )}
      </Card>

      <Card className="mb-5" style={{ padding: 0 }}>
        <div className="px-5 pt-4 pb-2 text-sm font-bold" style={{ color: INK }}>Rekap Absensi</div>
        {students.length === 0 ? <div className="px-5 pb-5"><EmptyState icon={CalendarCheck} text="Belum ada siswa di kelas ini." /></div> : loading ? (
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
                {rows.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? "white" : BG }}>
                    <td className="px-5 py-2 font-medium" style={{ color: INK }}>{r.name}</td>
                    <td className="text-center px-3 py-2" style={{ color: GREEN, fontWeight: 700 }}>{r.hadir}</td>
                    <td className="text-center px-3 py-2" style={{ color: "#B8760F" }}>{r.izin}</td>
                    <td className="text-center px-3 py-2" style={{ color: "#3E5C94" }}>{r.sakit}</td>
                    <td className="text-center px-3 py-2" style={{ color: RED, fontWeight: 700 }}>{r.alpa}</td>
                    <td className="text-center px-3 py-2" style={{ color: MUTED }}>{r.tidakMasuk}</td>
                    <td className="text-center px-3 py-2" style={{ color: MUTED }}>{r.totalSesi}</td>
                    <td className="text-center px-3 py-2 font-bold" style={{ color: INK }}>{r.attPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mb-5" style={{ padding: 0 }}>
        <div className="px-5 pt-4 pb-2 text-sm font-bold" style={{ color: INK }}>Riwayat Absensi per Siswa</div>
        <div className="px-5 pb-1 text-xs" style={{ color: MUTED }}>Klik nama siswa untuk lihat rincian tanggalnya.</div>
        {students.length === 0 ? <div className="px-5 pb-5"><EmptyState icon={CalendarCheck} text="Belum ada siswa di kelas ini." /></div> : loading ? (
          <div className="px-5 pb-5 text-sm" style={{ color: MUTED }}>Memuat…</div>
        ) : (
          <div className="flex flex-col divide-y" style={{ borderColor: "#EEF0F3" }}>
            {rows.map((r) => {
              const isOpen = !!expandedAtt[r.id];
              return (
                <div key={r.id}>
                  <button onClick={() => setExpandedAtt((e) => ({ ...e, [r.id]: !e[r.id] }))}
                    className="w-full flex items-center justify-between px-5 py-3 text-left">
                    <div className="flex items-center gap-2">
                      <span style={{ color: MUTED, fontSize: 11, width: 12, display: "inline-block" }}>{isOpen ? "▾" : "▸"}</span>
                      <span className="text-sm font-semibold" style={{ color: INK }}>{r.name}</span>
                    </div>
                    <span className="text-xs" style={{ color: MUTED }}>{r.hadir} Hadir · {r.izin} Izin · {r.sakit} Sakit · {r.alpa} Alpa</span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 flex flex-col gap-1.5">
                      {r.totalSesi === 0 ? (
                        <div className="text-xs" style={{ color: MUTED }}>Belum ada data absensi.</div>
                      ) : (
                        <>
                          <div className="text-xs" style={{ color: GREEN }}><b>Hadir</b> ({r.hadir}): {r.hadirDates.join(", ") || "-"}</div>
                          <div className="text-xs" style={{ color: "#B8760F" }}><b>Izin</b> ({r.izin}): {r.izinDates.join(", ") || "-"}</div>
                          <div className="text-xs" style={{ color: "#3E5C94" }}><b>Sakit</b> ({r.sakit}): {r.sakitDates.join(", ") || "-"}</div>
                          <div className="text-xs" style={{ color: RED }}><b>Alpa</b> ({r.alpa}): {r.alpaDates.join(", ") || "-"}</div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card style={{ padding: 0 }}>
        {students.length === 0 ? <EmptyState icon={LayoutDashboard} text="Belum ada siswa di kelas ini." /> : loading ? (
          <div className="p-5 text-sm" style={{ color: MUTED }}>Memuat…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: MUTED }}>
                  <th className="text-left font-semibold px-5 py-2.5 whitespace-nowrap">Siswa</th>
                  <th className="text-center font-semibold px-3 py-2.5 whitespace-nowrap">Kehadiran</th>
                  <th className="text-center font-semibold px-3 py-2.5 whitespace-nowrap">Rata Praktek</th>
                  <th className="text-center font-semibold px-3 py-2.5 whitespace-nowrap">Ujian Akhir</th>
                  <th className="text-center font-semibold px-3 py-2.5 whitespace-nowrap">Poin Bersih</th>
                  <th className="text-center font-semibold px-3 py-2.5 whitespace-nowrap">Nilai Akhir</th>
                  <th className="text-center font-semibold px-3 py-2.5 whitespace-nowrap">Predikat</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? "white" : BG }}>
                    <td className="px-5 py-2 font-medium" style={{ color: INK }}>{r.name}</td>
                    <td className="text-center px-3 py-2" style={{ color: MUTED }}>{r.attPct}%</td>
                    <td className="text-center px-3 py-2" style={{ color: MUTED }}>{r.avgPrac}</td>
                    <td className="text-center px-3 py-2" style={{ color: MUTED }}>{r.exam}</td>
                    <td className="text-center px-3 py-2" style={{ color: r.netPoints > 0 ? GREEN : r.netPoints < 0 ? RED : MUTED }}>{r.netPoints > 0 ? `+${r.netPoints}` : r.netPoints}</td>
                    <td className="text-center px-3 py-2 font-bold" style={{ color: INK }}>{r.final}</td>
                    <td className="text-center px-3 py-2"><span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: NAVY + "14", color: NAVY }}>{gradeLetter(r.final)}</span></td>
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

// ================= KELAS & SISWA =================
function SiswaTab({ profile, classes, setClasses, reloadClasses, activeClassId, setActiveClassId, students, setStudents, notify }) {
  const [newClass, setNewClass] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState("L");
  const [editingClassId, setEditingClassId] = useState(null);
  const [editingClassName, setEditingClassName] = useState("");

  const addClass = async () => {
    const c = newClass.trim();
    if (!c) return;
    const row = { id: genId(), name: c, owner_id: profile.id };
    const { error, offline } = await offlineWrite("classes", "insert", row);
    if (error) return notify("Gagal: " + error.message);
    setClasses((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
    if (!activeClassId) setActiveClassId(row.id);
    setNewClass("");
    notify(offline ? "Kelas tersimpan offline, akan disinkron otomatis." : "Kelas ditambahkan.");
  };

  const startEditClass = (c) => { setEditingClassId(c.id); setEditingClassName(c.name); };
  const saveEditClass = async () => {
    const nm = editingClassName.trim();
    if (!nm) return;
    const { error, offline } = await offlineWrite("classes", "update", { name: nm }, { match: { id: editingClassId } });
    if (error) return notify("Gagal: " + error.message);
    setClasses((prev) => prev.map((c) => c.id === editingClassId ? { ...c, name: nm } : c));
    setEditingClassId(null);
    notify(offline ? "Tersimpan offline, akan disinkron otomatis." : "Nama kelas diperbarui.");
  };
  const deleteClass = async (c) => {
    if (!confirm(`Hapus kelas "${c.name}"? Semua data siswa, absensi, dan nilai di kelas ini akan ikut terhapus permanen.`)) return;
    const { error, offline } = await offlineWrite("classes", "delete", null, { match: { id: c.id } });
    if (error) return notify("Gagal: " + error.message);
    setClasses((prev) => prev.filter((x) => x.id !== c.id));
    notify(offline ? "Tersimpan offline, akan disinkron otomatis." : "Kelas dihapus.");
  };

  const addStudent = async () => {
    if (!name.trim() || !activeClassId) return;
    const row = { id: genId(), name: name.trim(), class_id: activeClassId, gender };
    const { error, offline } = await offlineWrite("students", "insert", row);
    if (error) return notify("Gagal: " + error.message);
    setStudents((prev) => [...prev, row]);
    setName("");
    if (offline) notify("Siswa tersimpan offline, akan disinkron otomatis.");
  };
  const removeStudent = async (id) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    await offlineWrite("students", "delete", null, { match: { id } });
  };
  const toggleGender = async (s) => {
    const next = s.gender === "L" ? "P" : "L";
    setStudents((prev) => prev.map((x) => x.id === s.id ? { ...x, gender: next } : x));
    const { error } = await offlineWrite("students", "update", { gender: next }, { match: { id: s.id } });
    if (error) notify("Gagal: " + error.message);
  };

  const [importing, setImporting] = useState(false);
  const fileInputRef = React.useRef(null);
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !activeClassId) return;
    setImporting(true);
    try {
      const rows = await parseStudentsExcel(file);
      if (rows.length === 0) { notify("Tidak ada data siswa yang terbaca di file itu."); setImporting(false); return; }
      const toInsert = rows.map((r) => ({ id: genId(), name: r.name, gender: r.gender, class_id: activeClassId }));
      const { error, offline } = await offlineWrite("students", "insert", toInsert);
      if (error) { notify("Gagal impor: " + error.message); setImporting(false); return; }
      setStudents((prev) => [...prev, ...toInsert]);
      const missingGender = rows.filter((r) => !r.gender).length;
      notify(`${toInsert.length} siswa ${offline ? "tersimpan offline (akan disinkron otomatis)" : "berhasil diimpor"}.` + (missingGender ? ` (${missingGender} tanpa jenis kelamin, isi manual)` : ""));
    } catch (err) {
      notify("Gagal membaca file: " + err.message);
    }
    setImporting(false);
  };

  return (
    <div>
      <PageHeader eyebrow="Data Anda Sendiri" title="Kelas & Siswa" />
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
        <div className="flex flex-wrap gap-2 mb-4 pb-4" style={{ borderBottom: "1px solid #EEF0F3" }}>
          <button onClick={downloadStudentTemplate} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: BG, color: INK }}>
            <FileDown size={14} /> Unduh Template Excel
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={!activeClassId || importing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: ORANGE, opacity: (!activeClassId || importing) ? 0.6 : 1 }}>
            <Upload size={14} /> {importing ? "Mengimpor…" : "Upload Excel Siswa"}
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportFile} className="hidden" />
          <span className="text-xs self-center" style={{ color: MUTED }}>Isi kolom Nama & Jenis Kelamin (L/P) di template, lalu upload lagi ke sini.</span>
        </div>
        <div className="flex gap-2 mb-4 flex-wrap">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama siswa baru" className="text-sm px-3 py-2 rounded-lg flex-1 min-w-[160px]" style={{ background: BG, color: INK }} onKeyDown={(e) => e.key === "Enter" && addStudent()} />
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #E7E9EE" }}>
            {["L", "P"].map((g) => (
              <button key={g} type="button" onClick={() => setGender(g)}
                className="px-3 py-2 text-xs font-bold" style={{ background: gender === g ? ORANGE : "white", color: gender === g ? "white" : MUTED }}>
                {g}
              </button>
            ))}
          </div>
          <button onClick={addStudent} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5" style={{ background: ORANGE }}><Plus size={14} /> Tambah</button>
        </div>
        {students.length === 0 ? <EmptyState icon={Users} text="Belum ada siswa di kelas ini." /> : (
          <div className="flex flex-col divide-y" style={{ borderColor: "#EEF0F3" }}>
            {students.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2.5">
                <span className="text-sm" style={{ color: INK }}>{s.name}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleGender(s)} className="text-xs font-bold px-2 py-1 rounded-md"
                    style={{ background: s.gender === "P" ? "#FBEAF2" : "#EAF1FB", color: s.gender === "P" ? "#C23B78" : "#2B5FB8" }}
                    title="Klik untuk ubah">
                    {s.gender || "?"}
                  </button>
                  <button onClick={() => removeStudent(s.id)} className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "#FBEAEC" }}><Trash2 size={13} color={RED} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
