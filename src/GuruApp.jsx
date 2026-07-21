import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "./supabaseClient.js";
import {
  NAVY, NAVY2, ORANGE, BG, INK, MUTED, GREEN, RED,
  ATT_STATUSES, POINT_CATEGORIES, todayStr, gradeLetter,
  computeFinalScore, exportToExcel,
  PageHeader, Card, EmptyState, ClassPicker, Toast,
} from "./shared.jsx";
import {
  LayoutDashboard, CalendarCheck, Award, ClipboardList, FileSpreadsheet,
  Users, LogOut, Plus, Trash2, Download, TrendingUp, TrendingDown, Settings2,
} from "lucide-react";

const NAV = [
  { key: "absensi", label: "Absensi", icon: CalendarCheck },
  { key: "poin", label: "Poin & Catatan", icon: Award },
  { key: "praktek", label: "Nilai Praktek Harian", icon: ClipboardList },
  { key: "ujian", label: "Ujian Akhir", icon: FileSpreadsheet },
  { key: "akhir", label: "Nilai Akhir", icon: LayoutDashboard },
  { key: "siswa", label: "Kelas & Siswa", icon: Users },
];

export default function GuruApp({ profile, onLogout }) {
  const [tab, setTab] = useState("absensi");
  const [classes, setClasses] = useState([]);
  const [activeClassId, setActiveClassId] = useState("");
  const [students, setStudents] = useState([]);
  const [toast, setToast] = useState("");

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const loadClasses = useCallback(async () => {
    const { data } = await supabase.from("classes").select("*").order("name");
    setClasses(data || []);
    if (data?.length && !activeClassId) setActiveClassId(data[0].id);
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
      <aside className="md:w-60 w-full shrink-0 flex md:flex-col" style={{ background: NAVY }}>
        <div className="hidden md:block px-6 pt-7 pb-5">
          <div className="text-white font-bold text-lg leading-tight">Sistem Pembelajaran</div>
          <div className="text-xs mt-0.5" style={{ color: "#93A0BE" }}>{profile.name} · Guru {profile.subject}</div>
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
        {tab === "absensi" && <AbsensiTab profile={profile} classes={classes} activeClassId={activeClassId} setActiveClassId={setActiveClassId} students={students} notify={notify} />}
        {tab === "poin" && <PoinTab profile={profile} classes={classes} activeClassId={activeClassId} setActiveClassId={setActiveClassId} students={students} notify={notify} />}
        {tab === "praktek" && <PraktekTab profile={profile} classes={classes} activeClassId={activeClassId} setActiveClassId={setActiveClassId} students={students} notify={notify} />}
        {tab === "ujian" && <UjianTab profile={profile} classes={classes} activeClassId={activeClassId} setActiveClassId={setActiveClassId} students={students} notify={notify} />}
        {tab === "akhir" && <NilaiAkhirTab profile={profile} classes={classes} activeClassId={activeClassId} setActiveClassId={setActiveClassId} students={students} activeClass={activeClass} notify={notify} />}
        {tab === "siswa" && <SiswaTab classes={classes} reloadClasses={loadClasses} activeClassId={activeClassId} setActiveClassId={setActiveClassId} students={students} setStudents={setStudents} notify={notify} />}
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
    setRecord((r) => ({ ...r, [studentId]: status }));
    const { error } = await supabase.from("attendance").upsert(
      { student_id: studentId, guru_id: profile.id, subject: profile.subject, date, status },
      { onConflict: "student_id,guru_id,subject,date" }
    );
    if (error) notify("Gagal menyimpan: " + error.message);
  };

  const markAll = async (status) => {
    const rows = students.map((s) => ({ student_id: s.id, guru_id: profile.id, subject: profile.subject, date, status }));
    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,guru_id,subject,date" });
    if (error) return notify("Gagal: " + error.message);
    const rec = {}; students.forEach((s) => { rec[s.id] = status; });
    setRecord(rec);
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
    const { error } = await supabase.from("points").insert({
      student_id: studentId, guru_id: profile.id, type, category, note: note.trim() || null, date: todayStr(),
    });
    if (error) return notify("Gagal: " + error.message);
    setNote(""); loadLog(); notify("Poin tersimpan.");
  };
  const removePoint = async (id) => {
    await supabase.from("points").delete().eq("id", id);
    loadLog();
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
function PraktekTab({ profile, classes, activeClassId, setActiveClassId, students, notify }) {
  const [date, setDate] = useState(todayStr());
  const [scores, setScores] = useState({});
  const [entries, setEntries] = useState([]);

  const loadEntries = useCallback(async () => {
    if (!students.length) { setEntries([]); return; }
    const { data } = await supabase.from("practice_scores").select("*").eq("guru_id", profile.id).eq("subject", profile.subject)
      .in("student_id", students.map((s) => s.id)).order("date", { ascending: false }).limit(100);
    setEntries(data || []);
  }, [students, profile.id, profile.subject]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const saveScore = async (studentId) => {
    const val = scores[studentId];
    if (val === undefined || val === "") return;
    const { error } = await supabase.from("practice_scores").insert({
      student_id: studentId, guru_id: profile.id, subject: profile.subject, date, score: Number(val),
    });
    if (error) return notify("Gagal: " + error.message);
    setScores((s) => ({ ...s, [studentId]: "" }));
    loadEntries(); notify("Nilai praktek tersimpan.");
  };
  const removeEntry = async (id) => { await supabase.from("practice_scores").delete().eq("id", id); loadEntries(); };

  const avgFor = (id) => {
    const vals = entries.filter((e) => e.student_id === id).map((e) => e.score);
    if (!vals.length) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  };
  const studentName = (id) => students.find((s) => s.id === id)?.name || "—";

  return (
    <div>
      <PageHeader eyebrow={`Mapel ${profile.subject}`} title="Nilai Praktek Harian" right={<ClassPicker classes={classes} value={activeClassId} onChange={setActiveClassId} />} />
      <Card className="mb-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-bold" style={{ color: INK }}>Input nilai tanggal:</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-sm px-3 py-2 rounded-lg font-semibold" style={{ background: BG, color: INK }} />
        </div>
        {students.length === 0 ? <EmptyState icon={Users} text="Belum ada siswa di kelas ini." /> : (
          <div className="flex flex-col divide-y" style={{ borderColor: "#EEF0F3" }}>
            {students.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2.5 gap-3">
                <div>
                  <div className="text-sm font-medium" style={{ color: INK }}>{s.name}</div>
                  <div className="text-xs" style={{ color: MUTED }}>Rata-rata sejauh ini: {avgFor(s.id) ?? "—"}</div>
                </div>
                <div className="flex gap-2">
                  <input type="number" min={0} max={100} placeholder="0-100" value={scores[s.id] ?? ""} onChange={(e) => setScores((sc) => ({ ...sc, [s.id]: e.target.value }))}
                    className="w-20 text-center text-sm px-2 py-1.5 rounded-md" style={{ background: BG, color: INK }} />
                  <button onClick={() => saveScore(s.id)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white" style={{ background: NAVY }}>Simpan</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card>
        <div className="text-sm font-bold mb-3" style={{ color: INK }}>Riwayat Entri</div>
        {entries.length === 0 ? <EmptyState icon={ClipboardList} text="Belum ada entri nilai praktek." /> : (
          <div className="flex flex-col divide-y max-h-[320px] overflow-y-auto" style={{ borderColor: "#EEF0F3" }}>
            {entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2 text-sm">
                <span style={{ color: INK }}>{studentName(e.student_id)} — {e.score}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: MUTED }}>{e.date}</span>
                  <button onClick={() => removeEntry(e.id)} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: BG }}><Trash2 size={11} color={MUTED} /></button>
                </div>
              </div>
            ))}
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
    const { error } = await supabase.from("final_exam_scores").upsert(
      { student_id: studentId, guru_id: profile.id, subject: profile.subject, score: v },
      { onConflict: "student_id,guru_id,subject" }
    );
    if (error) notify("Gagal: " + error.message);
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
    await supabase.from("grade_weights").upsert({ guru_id: profile.id, ...w }, { onConflict: "guru_id" });
    notify("Bobot tersimpan.");
  };

  const loadAll = useCallback(async () => {
    if (!students.length) { setAttendance([]); setPractice([]); setExams({}); setPoints([]); setLoading(false); return; }
    setLoading(true);
    const ids = students.map((s) => s.id);
    const [att, prac, exam, pts] = await Promise.all([
      supabase.from("attendance").select("student_id,status").eq("guru_id", profile.id).eq("subject", profile.subject).in("student_id", ids),
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
    const totalSesi = attRows.length;
    const tidakMasuk = izin + sakit + alpa;
    const attPct = totalSesi ? Math.round((hadir / totalSesi) * 100) : 0;
    const pracVals = practice.filter((p) => p.student_id === s.id).map((p) => p.score);
    const avgPrac = pracVals.length ? Math.round((pracVals.reduce((a, b) => a + b, 0) / pracVals.length) * 10) / 10 : 0;
    const exam = exams[s.id] || 0;
    const netPoints = points.filter((p) => p.student_id === s.id).reduce((sum, p) => sum + (p.type === "plus" ? 1 : -1), 0);
    const final = computeFinalScore({ attendancePct: attPct, avgPractice: avgPrac, examScore: exam, netPoints, weights });
    return { id: s.id, name: s.name, hadir, izin, sakit, alpa, totalSesi, tidakMasuk, attPct, avgPrac, exam, netPoints, final };
  }), [students, attendance, practice, exams, points, weights]);

  const handleExport = () => {
    const rekapAbsensi = rows.map((r) => ({
      Nama: r.name, Hadir: r.hadir, Izin: r.izin, Sakit: r.sakit, Alpa: r.alpa,
      "Total Tidak Masuk": r.tidakMasuk, "Total Pertemuan": r.totalSesi, "Kehadiran (%)": r.attPct,
    }));
    const rekapNilai = rows.map((r) => ({
      Nama: r.name, "Kehadiran (%)": r.attPct, "Rata Praktek Harian": r.avgPrac,
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
          Bobot saat ini: Absensi {weights.w_absensi}% · Praktek Harian {weights.w_praktek}% · Ujian Akhir {weights.w_ujian}% · Poin {weights.w_poin}%
        </div>
        {showSettings && (
          <div className="flex flex-wrap gap-3 mt-4 pt-4" style={{ borderTop: "1px solid #EEF0F3" }}>
            {[["w_absensi", "Absensi %"], ["w_praktek", "Praktek Harian %"], ["w_ujian", "Ujian Akhir %"], ["w_poin", "Poin %"]].map(([k, label]) => (
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
function SiswaTab({ classes, reloadClasses, activeClassId, setActiveClassId, students, setStudents, notify }) {
  const [newClass, setNewClass] = useState("");
  const [name, setName] = useState("");

  const addClass = async () => {
    const c = newClass.trim();
    if (!c) return;
    const { error } = await supabase.from("classes").insert({ name: c });
    if (error) return notify("Gagal: " + error.message);
    setNewClass(""); reloadClasses(); notify("Kelas ditambahkan.");
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
        <div className="text-sm font-bold mb-3" style={{ color: INK }}>Tambah Kelas</div>
        <div className="flex gap-2">
          <input value={newClass} onChange={(e) => setNewClass(e.target.value)} placeholder="Nama kelas, mis. 8C" className="text-sm px-3 py-2 rounded-lg flex-1 max-w-xs" style={{ background: BG, color: INK }} />
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
