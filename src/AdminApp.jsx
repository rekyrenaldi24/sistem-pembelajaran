import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "./supabaseClient.js";
import {
  NAVY, NAVY2, ORANGE, BG, INK, MUTED, GREEN, RED, AMBER, todayStr,
  PageHeader, Card, EmptyState, Toast, fetchAllRows,
} from "./shared.jsx";
import TambahSiswaPanel from "./TambahSiswaPanel.jsx";
import { AbsensiRekapTab, TabunganRekapTab } from "./KepalaProgramApp.jsx";
import { describeDetail, TABLE_LABELS, ACTION_LABEL, ACTION_ICON, ACTION_COLOR } from "./AuditLog.jsx";
import {
  LayoutDashboard, UserCheck, ListChecks, Users, CalendarCheck, PiggyBank, History, LogOut, Repeat, Plus,
} from "lucide-react";

const NAV = [
  { key: "ringkasan", label: "Pantau Hari Ini", icon: LayoutDashboard },
  { key: "akun", label: "Persetujuan Akun", icon: UserCheck },
  { key: "kelas", label: "Jurusan & Kelas", icon: ListChecks },
  { key: "siswa", label: "Tambah Siswa", icon: Users },
  { key: "absensi", label: "Rekap Absensi", icon: CalendarCheck },
  { key: "tabungan", label: "Rekap Tabungan", icon: PiggyBank },
  { key: "aktivitas", label: "Aktivitas Terbaru", icon: History },
];

// Kelompokkan kelas per jurusan, urut abjad.
function groupByJurusan(classes, jurusan) {
  const nameOf = (id) => jurusan.find((j) => j.id === id)?.name || "Belum ada jurusan";
  const map = {};
  classes.forEach((c) => {
    const k = nameOf(c.jurusan_id);
    if (!map[k]) map[k] = [];
    map[k].push(c);
  });
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
}

const roleBadges = (p) => [
  p.is_admin && "Admin",
  (p.is_guru || p.role === "guru") && `Guru${p.subject ? " · " + p.subject : ""}`,
  (p.is_wali_kelas || p.role === "wali_kelas") && "Wali Kelas",
  p.is_kepala_program && "Kepala Program",
  p.is_siswa && "Sekretaris Kelas",
].filter(Boolean);

// ================= PANTAU HARI INI =================
function RingkasanTab({ jurusan, classes }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const [prof, studs, att] = await Promise.all([
        fetchAllRows(() => supabase.from("profiles").select("id,name,approved").order("id")),
        fetchAllRows(() => supabase.from("students").select("id,class_id").order("id")),
        fetchAllRows(() => supabase.from("homeroom_attendance").select("student_id,status").eq("date", todayStr()).order("student_id")),
      ]);
      setData({ prof: prof.data || [], studs: studs.data || [], att: att.data || [] });
    })();
  }, []);

  const active = useMemo(() => classes.filter((c) => !c.archived), [classes]);

  const view = useMemo(() => {
    if (!data) return null;
    const profMap = {};
    data.prof.forEach((p) => { profMap[p.id] = p.name; });
    const classOfStudent = {};
    data.studs.forEach((s) => { classOfStudent[s.id] = s.class_id; });
    const perClass = {};
    active.forEach((c) => { perClass[c.id] = { siswa: 0, filled: 0, counts: { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 } }; });
    data.studs.forEach((s) => { if (perClass[s.class_id]) perClass[s.class_id].siswa += 1; });
    data.att.forEach((a) => {
      const cid = classOfStudent[a.student_id];
      if (perClass[cid]) {
        perClass[cid].filled += 1;
        if (perClass[cid].counts[a.status] !== undefined) perClass[cid].counts[a.status] += 1;
      }
    });
    const totalSiswa = Object.values(perClass).reduce((sum, p) => sum + p.siswa, 0);
    const kelasBelumIsi = active.filter((c) => perClass[c.id].siswa > 0 && perClass[c.id].filled === 0).length;
    return {
      profMap, perClass, totalSiswa, kelasBelumIsi,
      totalAkun: data.prof.length,
      pending: data.prof.filter((p) => !p.approved).length,
    };
  }, [data, active]);

  if (!view) return <div className="text-sm" style={{ color: MUTED }}>Memuat…</div>;

  const stats = [
    { label: "Akun terdaftar", value: view.totalAkun },
    { label: "Menunggu persetujuan", value: view.pending, warn: view.pending > 0 },
    { label: "Jurusan", value: jurusan.length },
    { label: "Kelas aktif", value: active.length },
    { label: "Siswa", value: view.totalSiswa },
    { label: "Kelas belum absen hari ini", value: view.kelasBelumIsi, warn: view.kelasBelumIsi > 0 },
  ];

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Pantau Hari Ini" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <div className="text-2xl font-bold" style={{ color: s.warn ? AMBER : INK }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: MUTED }}>{s.label}</div>
          </Card>
        ))}
      </div>
      <div className="flex flex-col gap-4">
        {groupByJurusan(active, jurusan).map(([jname, list]) => (
          <Card key={jname}>
            <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: ORANGE }}>{jname}</div>
            <div className="flex flex-col divide-y" style={{ borderColor: "#EEF0F3" }}>
              {list.map((c) => {
                const p = view.perClass[c.id];
                const wali = c.owner_id ? (view.profMap[c.owner_id] || "—") : "Belum ada wali kelas";
                return (
                  <div key={c.id} className="py-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold" style={{ color: INK }}>{c.name}</div>
                      <div className="text-xs" style={{ color: c.owner_id ? MUTED : AMBER }}>{wali} · {p.siswa} siswa</div>
                    </div>
                    <div className="text-xs font-semibold" style={{ color: p.filled === 0 ? AMBER : MUTED }}>
                      {p.filled === 0
                        ? "Absen hari ini belum diisi"
                        : `${p.counts.Hadir} Hadir · ${p.counts.Izin} Izin · ${p.counts.Sakit} Sakit · ${p.counts.Alpa} Alpa`}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
        {active.length === 0 && <Card><EmptyState icon={ListChecks} text="Belum ada kelas. Buat di menu Jurusan & Kelas." /></Card>}
      </div>
    </div>
  );
}

// ================= PERSETUJUAN AKUN =================
function AkunTab({ profile, notify }) {
  const [accounts, setAccounts] = useState(null);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    const { data } = await fetchAllRows(() => supabase.from("profiles").select("*").order("created_at", { ascending: false }).order("id"));
    setAccounts(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const setApproved = async (acc, value) => {
    setBusyId(acc.id);
    const { error } = await supabase.from("profiles").update({ approved: value }).eq("id", acc.id);
    setBusyId("");
    if (error) return notify("Gagal mengubah: " + error.message);
    setAccounts((prev) => prev.map((a) => (a.id === acc.id ? { ...a, approved: value } : a)));
    notify(value ? `${acc.name} disetujui.` : `${acc.name} dinonaktifkan.`);
  };

  if (!accounts) return <div className="text-sm" style={{ color: MUTED }}>Memuat…</div>;

  const match = (a) => !q.trim() || (a.name || "").toLowerCase().includes(q.trim().toLowerCase());
  const pending = accounts.filter((a) => !a.approved && match(a));
  const active = accounts.filter((a) => a.approved && match(a));

  const Row = ({ a, action }) => (
    <div className="py-2.5 flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="text-sm font-semibold" style={{ color: INK }}>{a.name}</div>
        <div className="flex flex-wrap gap-1 mt-1">
          {roleBadges(a).length === 0 && <span className="text-xs" style={{ color: MUTED }}>Belum ada peran</span>}
          {roleBadges(a).map((b) => (
            <span key={b} className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: BG, color: INK }}>{b}</span>
          ))}
        </div>
        {a.created_at && (
          <div className="text-xs mt-1" style={{ color: "#B7BFCC" }}>
            Daftar {new Date(a.created_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}
          </div>
        )}
      </div>
      {action}
    </div>
  );

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Persetujuan Akun" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama…" className="text-sm px-3 py-2 rounded-lg w-full md:w-72 mb-4" style={{ background: "white", color: INK }} />
      <Card className="mb-5">
        <div className="text-sm font-bold mb-1" style={{ color: INK }}>Menunggu Persetujuan ({pending.length})</div>
        {pending.length === 0 ? <div className="text-xs py-2" style={{ color: MUTED }}>Tidak ada akun yang menunggu.</div> : (
          <div className="flex flex-col divide-y" style={{ borderColor: "#EEF0F3" }}>
            {pending.map((a) => (
              <Row key={a.id} a={a} action={
                <button onClick={() => setApproved(a, true)} disabled={busyId === a.id}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold text-white" style={{ background: GREEN, opacity: busyId === a.id ? 0.6 : 1 }}>
                  Setujui
                </button>
              } />
            ))}
          </div>
        )}
      </Card>
      <Card>
        <div className="text-sm font-bold mb-1" style={{ color: INK }}>Akun Aktif ({active.length})</div>
        <div className="flex flex-col divide-y" style={{ borderColor: "#EEF0F3" }}>
          {active.map((a) => (
            <Row key={a.id} a={a} action={
              a.id === profile.id ? <span className="text-xs" style={{ color: MUTED }}>Akun Anda</span> : (
                <button onClick={() => { if (window.confirm(`Nonaktifkan akun ${a.name}? Orangnya tidak akan bisa masuk sampai disetujui lagi.`)) setApproved(a, false); }}
                  disabled={busyId === a.id} className="px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: BG, color: RED }}>
                  Nonaktifkan
                </button>
              )
            } />
          ))}
        </div>
      </Card>
    </div>
  );
}

// ================= JURUSAN & KELAS =================
function JurusanKelasTab({ jurusan, classes, notify, reload }) {
  const [newJurusan, setNewJurusan] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [newClassJurusan, setNewClassJurusan] = useState("");
  const [busy, setBusy] = useState(false);

  const addJurusan = async () => {
    const n = newJurusan.trim();
    if (!n) return notify("Nama jurusan wajib diisi.");
    setBusy(true);
    const { error } = await supabase.from("jurusan").insert({ name: n });
    setBusy(false);
    if (error) return notify(error.message.includes("duplicate") ? "Jurusan itu sudah ada." : "Gagal menambah jurusan: " + error.message);
    setNewJurusan("");
    notify("Jurusan ditambahkan.");
    reload();
  };

  const addClass = async () => {
    const n = newClassName.trim();
    if (!n) return notify("Nama kelas wajib diisi.");
    if (!newClassJurusan) return notify("Pilih jurusan dulu.");
    setBusy(true);
    const { error } = await supabase.from("classes").insert({ name: n, jurusan_id: newClassJurusan });
    setBusy(false);
    if (error) return notify(error.message.includes("duplicate") ? "Nama kelas itu sudah dipakai, pakai nama lain." : "Gagal menambah kelas: " + error.message);
    setNewClassName("");
    notify("Kelas ditambahkan.");
    reload();
  };

  const input = "text-sm px-3 py-2 rounded-lg";
  const grouped = groupByJurusan(classes, jurusan);
  const emptyJurusan = jurusan.filter((j) => !classes.some((c) => c.jurusan_id === j.id));

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Jurusan & Kelas" />
      <Card className="mb-5">
        <div className="text-sm font-bold mb-2" style={{ color: INK }}>Tambah Jurusan</div>
        <div className="flex gap-2 flex-wrap">
          <input value={newJurusan} onChange={(e) => setNewJurusan(e.target.value)} placeholder="Nama jurusan, mis. Teknik Otomotif" className={input + " flex-1 min-w-[180px]"} style={{ background: BG, color: INK }} onKeyDown={(e) => e.key === "Enter" && addJurusan()} />
          <button onClick={addJurusan} disabled={busy} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5" style={{ background: ORANGE, opacity: busy ? 0.6 : 1 }}><Plus size={14} /> Tambah</button>
        </div>
      </Card>
      <Card className="mb-5">
        <div className="text-sm font-bold mb-2" style={{ color: INK }}>Tambah Kelas</div>
        <div className="flex gap-2 flex-wrap">
          <select value={newClassJurusan} onChange={(e) => setNewClassJurusan(e.target.value)} className={input} style={{ background: BG, color: INK }}>
            <option value="">Pilih jurusan</option>
            {jurusan.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
          <input value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="Nama kelas, mis. XI DKV 3" className={input + " flex-1 min-w-[160px]"} style={{ background: BG, color: INK }} onKeyDown={(e) => e.key === "Enter" && addClass()} />
          <button onClick={addClass} disabled={busy} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5" style={{ background: ORANGE, opacity: busy ? 0.6 : 1 }}><Plus size={14} /> Tambah</button>
        </div>
        <div className="text-xs mt-2" style={{ color: MUTED }}>
          Kelas baru belum punya wali kelas. Wali kelasnya bisa ditugaskan oleh Kepala Program jurusan itu.
        </div>
      </Card>
      <div className="flex flex-col gap-4">
        {grouped.map(([jname, list]) => (
          <Card key={jname}>
            <div className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: ORANGE }}>{jname} · {list.length} kelas</div>
            <div className="flex flex-col divide-y" style={{ borderColor: "#EEF0F3" }}>
              {list.map((c) => (
                <div key={c.id} className="py-2 flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: INK }}>{c.name}</span>
                  {c.archived && <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: BG, color: MUTED }}>Arsip</span>}
                </div>
              ))}
            </div>
          </Card>
        ))}
        {emptyJurusan.length > 0 && (
          <div className="text-xs" style={{ color: MUTED }}>Jurusan yang belum punya kelas: {emptyJurusan.map((j) => j.name).join(", ")}.</div>
        )}
      </div>
    </div>
  );
}

// ================= TAMBAH SISWA (kelas manapun) =================
function SiswaAdminTab({ jurusan, classes, notify }) {
  const active = useMemo(() => classes.filter((c) => !c.archived), [classes]);
  const grouped = useMemo(() => groupByJurusan(active, jurusan), [active, jurusan]);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState([]);

  useEffect(() => {
    if (!active.some((c) => c.id === classId)) setClassId(grouped[0]?.[1]?.[0]?.id || "");
  }, [active]); // eslint-disable-line

  const loadStudents = useCallback(async () => {
    if (!classId) { setStudents([]); return; }
    const { data } = await supabase.from("students").select("*").eq("class_id", classId).order("name");
    setStudents(data || []);
  }, [classId]);
  useEffect(() => { loadStudents(); }, [loadStudents]);

  if (active.length === 0) {
    return (
      <div>
        <PageHeader eyebrow="Admin" title="Tambah Siswa" />
        <Card><EmptyState icon={Users} text="Belum ada kelas. Buat kelas dulu di menu Jurusan & Kelas." /></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Tambah Siswa" right={
        <select value={classId} onChange={(e) => setClassId(e.target.value)}
          className="text-sm font-semibold px-4 py-2.5 rounded-lg border-0 cursor-pointer" style={{ background: "white", color: INK, boxShadow: "0 1px 2px rgba(22,35,63,0.12)" }}>
          {grouped.map(([jname, list]) => (
            <optgroup key={jname} label={jname}>
              {list.map((c) => <option key={c.id} value={c.id}>Kelas {c.name}</option>)}
            </optgroup>
          ))}
        </select>
      } />
      <Card>
        <div className="text-sm font-bold mb-1" style={{ color: INK }}>Siswa — Kelas {active.find((c) => c.id === classId)?.name}</div>
        <div className="text-xs mb-3" style={{ color: MUTED }}>
          Tambahkan satu-satu, atau sekaligus lewat Excel. Mengubah atau menghapus siswa dilakukan oleh wali kelasnya.
        </div>
        <TambahSiswaPanel classId={classId} notify={notify} onAdded={loadStudents} />
        {students.length === 0 ? <EmptyState icon={Users} text="Belum ada siswa di kelas ini." /> : (
          <div className="flex flex-col divide-y" style={{ borderColor: "#EEF0F3" }}>
            {students.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between py-2.5">
                <span className="text-sm" style={{ color: INK }}><span style={{ color: MUTED, fontWeight: 600 }}>{i + 1}.</span> {s.name}</span>
                <span className="text-xs font-bold px-2 py-1 rounded-md"
                  style={{ background: s.gender === "P" ? "#FBEAF2" : "#EAF1FB", color: s.gender === "P" ? "#C23B78" : "#2B5FB8" }}>{s.gender || "?"}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ================= REKAP (absensi / tabungan) PER JURUSAN =================
// Memakai tampilan rekap Kepala Program, tapi admin bebas memilih jurusan.
// Sengaja per jurusan (bukan semua sekaligus) supaya tetap cepat.
function RekapPerJurusan({ jurusan, classes, kind }) {
  const [jurusanId, setJurusanId] = useState("");
  useEffect(() => { if (!jurusanId && jurusan.length) setJurusanId(jurusan[0].id); }, [jurusan]); // eslint-disable-line
  const list = useMemo(() => classes.filter((c) => !c.archived && c.jurusan_id === jurusanId), [classes, jurusanId]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>Jurusan</span>
        <select value={jurusanId} onChange={(e) => setJurusanId(e.target.value)}
          className="text-sm font-semibold px-4 py-2 rounded-lg border-0 cursor-pointer" style={{ background: "white", color: INK, boxShadow: "0 1px 2px rgba(22,35,63,0.12)" }}>
          {jurusan.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
        </select>
      </div>
      {kind === "absensi" ? <AbsensiRekapTab classes={list} eyebrow="Admin · read-only" /> : <TabunganRekapTab classes={list} eyebrow="Admin · read-only" />}
    </div>
  );
}

// ================= AKTIVITAS TERBARU (semua pengguna) =================
function AktivitasTab() {
  const [logs, setLogs] = useState(null);
  const [actorMap, setActorMap] = useState({});
  const [studentMap, setStudentMap] = useState({});

  useEffect(() => {
    (async () => {
      const [{ data: l }, p, s] = await Promise.all([
        supabase.from("audit_log").select("*").order("changed_at", { ascending: false }).limit(200),
        fetchAllRows(() => supabase.from("profiles").select("id,name").order("id")),
        fetchAllRows(() => supabase.from("students").select("id,name").order("id")),
      ]);
      const am = {}; (p.data || []).forEach((x) => { am[x.id] = x.name; });
      const sm = {}; (s.data || []).forEach((x) => { sm[x.id] = x.name; });
      setActorMap(am); setStudentMap(sm); setLogs(l || []);
    })();
  }, []);

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Aktivitas Terbaru" />
      <div className="text-xs mb-4" style={{ color: MUTED }}>200 aktivitas terakhir dari semua pengguna: siapa menambah, mengubah, atau menghapus data apa.</div>
      <Card style={{ padding: 0 }}>
        {!logs ? <div className="p-5 text-sm" style={{ color: MUTED }}>Memuat…</div> : logs.length === 0 ? (
          <EmptyState icon={History} text="Belum ada aktivitas tercatat." />
        ) : (
          <div className="flex flex-col divide-y max-h-[75vh] overflow-y-auto" style={{ borderColor: "#EEF0F3" }}>
            {logs.map((log) => {
              const Icon = ACTION_ICON[log.action] || History;
              const color = ACTION_COLOR[log.action] || MUTED;
              const detail = describeDetail(log.table_name, log.new_data || log.old_data, studentMap);
              return (
                <div key={log.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: color + "1A" }}>
                    <Icon size={14} color={color} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm" style={{ color: INK }}>
                      <b>{log.actor_id ? (actorMap[log.actor_id] || "Pengguna") : "Sistem"}</b> {ACTION_LABEL[log.action] || log.action} data {TABLE_LABELS[log.table_name] || log.table_name}
                    </div>
                    {detail && <div className="text-xs mt-0.5" style={{ color: MUTED }}>{detail}</div>}
                    <div className="text-xs mt-1" style={{ color: "#B7BFCC" }}>
                      {new Date(log.changed_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ================= KERANGKA UTAMA =================
export default function AdminApp({ profile, onLogout, onSwitchRole }) {
  const [tab, setTab] = useState("ringkasan");
  const [jurusan, setJurusan] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const reload = useCallback(async () => {
    const [{ data: j }, c] = await Promise.all([
      supabase.from("jurusan").select("id,name").order("name"),
      fetchAllRows(() => supabase.from("classes").select("*").order("name").order("id")),
    ]);
    setJurusan(j || []);
    setClasses(c.data || []);
    setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm" style={{ background: BG, color: MUTED }}>Memuat…</div>;
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row" style={{ background: BG, fontFamily: "Arial, sans-serif" }}>
      <aside className="md:w-60 w-full shrink-0 flex flex-col" style={{ background: NAVY }}>
        <div className="flex md:block items-center justify-between px-4 md:px-6 py-3 md:pt-7 md:pb-5">
          <div>
            <div className="text-white font-bold text-base md:text-lg leading-tight">R3 EDU</div>
            <div className="hidden md:block text-xs mt-0.5" style={{ color: "#93A0BE" }}>Admin · {profile.name}</div>
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
            const activeTab = tab === n.key;
            return (
              <button key={n.key} onClick={() => setTab(n.key)}
                className="flex items-center gap-2.5 px-4 md:px-3 py-3 md:py-2.5 md:rounded-lg text-sm font-semibold shrink-0 md:mb-1 whitespace-nowrap"
                style={{ color: activeTab ? "white" : "#A7B1C7", background: activeTab ? NAVY2 : "transparent" }}>
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
        {tab === "ringkasan" && <RingkasanTab jurusan={jurusan} classes={classes} />}
        {tab === "akun" && <AkunTab profile={profile} notify={notify} />}
        {tab === "kelas" && <JurusanKelasTab jurusan={jurusan} classes={classes} notify={notify} reload={reload} />}
        {tab === "siswa" && <SiswaAdminTab jurusan={jurusan} classes={classes} notify={notify} />}
        {tab === "absensi" && <RekapPerJurusan jurusan={jurusan} classes={classes} kind="absensi" />}
        {tab === "tabungan" && <RekapPerJurusan jurusan={jurusan} classes={classes} kind="tabungan" />}
        {tab === "aktivitas" && <AktivitasTab />}
      </main>
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
