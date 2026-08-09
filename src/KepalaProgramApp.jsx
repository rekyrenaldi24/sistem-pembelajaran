import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
import {
  NAVY, NAVY2, BG, INK, MUTED, ATT_STATUSES, todayStr, PageHeader, Card, EmptyState,
} from "./shared.jsx";
import { CalendarCheck, PiggyBank, LogOut, Repeat } from "lucide-react";

const NAV = [
  { key: "absensi", label: "Rekap Absensi", icon: CalendarCheck },
  { key: "tabungan", label: "Rekap Tabungan", icon: PiggyBank },
];

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
        const { data: l } = await supabase.from("savings").select("student_id,type,amount").in("student_id", s.map((x) => x.id));
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
  const [tab, setTab] = useState("absensi");
  const [classes, setClasses] = useState([]);
  const [jurusanName, setJurusanName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!profile.kepala_program_jurusan_id) { setLoading(false); return; }
      const { data: j } = await supabase.from("jurusan").select("name").eq("id", profile.kepala_program_jurusan_id).maybeSingle();
      setJurusanName(j?.name || "");
      const { data: c } = await supabase.from("classes").select("*").eq("jurusan_id", profile.kepala_program_jurusan_id).order("name");
      setClasses(c || []);
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
        {tab === "absensi" && <AbsensiRekapTab classes={classes} />}
        {tab === "tabungan" && <TabunganRekapTab classes={classes} />}
      </main>
    </div>
  );
}
