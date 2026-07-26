import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
import { INK, MUTED, GREEN, RED, PageHeader, Card, EmptyState } from "./shared.jsx";
import { History, Plus, Pencil, Trash2 } from "lucide-react";

const TABLE_LABELS = {
  attendance: "Absensi Mapel",
  points: "Poin & Catatan",
  practice_scores: "Nilai Harian",
  final_exam_scores: "Ujian Akhir",
  grade_weights: "Bobot Nilai Akhir",
  notes: "Catatan Wali Kelas",
  homeroom_attendance: "Absensi Kelas",
  savings: "Tabungan",
  students: "Data Siswa",
  classes: "Data Kelas",
};

const ACTION_LABEL = { INSERT: "menambahkan", UPDATE: "mengubah", DELETE: "menghapus" };
const ACTION_ICON = { INSERT: Plus, UPDATE: Pencil, DELETE: Trash2 };
const ACTION_COLOR = { INSERT: GREEN, UPDATE: "#B8760F", DELETE: RED };

function describeDetail(tableName, data, studentMap) {
  if (!data) return "";
  const parts = [];
  if (data.student_id && studentMap[data.student_id]) parts.push(`Siswa: ${studentMap[data.student_id]}`);
  switch (tableName) {
    case "attendance":
    case "homeroom_attendance":
      if (data.status) parts.push(`Status: ${data.status}`);
      if (data.date) parts.push(`Tanggal: ${data.date}`);
      break;
    case "points":
      if (data.type) parts.push(data.type === "plus" ? "Poin +" : "Poin −");
      if (data.category) parts.push(data.category);
      break;
    case "practice_scores":
      if (data.score !== undefined && data.score !== null) parts.push(`Nilai: ${data.score}`);
      if (data.note) parts.push(`Materi: ${data.note}`);
      break;
    case "final_exam_scores":
      if (data.score !== undefined && data.score !== null) parts.push(`Nilai: ${data.score}`);
      if (data.subject) parts.push(`Mapel: ${data.subject}`);
      break;
    case "notes":
      if (data.content) parts.push(`"${data.content}"`);
      break;
    case "savings":
      if (data.type) parts.push(data.type === "setor" ? "Setor" : "Tarik");
      if (data.amount !== undefined) parts.push(`Rp${Number(data.amount).toLocaleString("id-ID")}`);
      break;
    case "students":
      if (data.name) parts.push(`Nama: ${data.name}`);
      if (data.gender) parts.push(data.gender === "L" ? "Laki-laki" : "Perempuan");
      break;
    case "classes":
      if (data.name) parts.push(`Kelas: ${data.name}`);
      break;
    case "grade_weights":
      parts.push(`Absensi ${data.w_absensi}% · Praktek ${data.w_praktek}% · Ujian ${data.w_ujian}% · Poin ${data.w_poin}%`);
      break;
    default:
      break;
  }
  return parts.join(" · ");
}

export default function AuditLogTab({ profile }) {
  const [logs, setLogs] = useState([]);
  const [studentMap, setStudentMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: logData }, { data: studentData }] = await Promise.all([
        supabase.from("audit_log").select("*").eq("actor_id", profile.id).order("changed_at", { ascending: false }).limit(300),
        supabase.from("students").select("id,name"),
      ]);
      setLogs(logData || []);
      const map = {};
      (studentData || []).forEach((s) => { map[s.id] = s.name; });
      setStudentMap(map);
      setLoading(false);
    })();
  }, [profile.id]);

  return (
    <div>
      <PageHeader eyebrow="Jejak Audit" title="Riwayat Aktivitas" />
      <div className="text-xs mb-4" style={{ color: MUTED }}>
        Catatan otomatis setiap kali Anda menambah, mengubah, atau menghapus data — mulai dari kapan fitur ini dipasang.
      </div>
      <Card style={{ padding: 0 }}>
        {loading ? (
          <div className="p-5 text-sm" style={{ color: MUTED }}>Memuat…</div>
        ) : logs.length === 0 ? (
          <EmptyState icon={History} text="Belum ada aktivitas tercatat." />
        ) : (
          <div className="flex flex-col divide-y max-h-[70vh] overflow-y-auto" style={{ borderColor: "#EEF0F3" }}>
            {logs.map((log) => {
              const Icon = ACTION_ICON[log.action] || History;
              const color = ACTION_COLOR[log.action] || MUTED;
              const data = log.new_data || log.old_data;
              const detail = describeDetail(log.table_name, data, studentMap);
              const tableLabel = TABLE_LABELS[log.table_name] || log.table_name;
              return (
                <div key={log.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: color + "1A" }}>
                    <Icon size={14} color={color} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm" style={{ color: INK }}>
                      Anda <b>{ACTION_LABEL[log.action] || log.action}</b> data {tableLabel}
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
