import React from "react";
import * as XLSX from "xlsx";

// ---------- Brand tokens ----------
export const NAVY = "#16233F";
export const NAVY2 = "#1F3358";
export const ORANGE = "#FF6A39";
export const BG = "#F4F5F7";
export const INK = "#16233F";
export const MUTED = "#6B7280";
export const GREEN = "#2E9E5B";
export const RED = "#D6455A";
export const AMBER = "#FFA26B";

export const ATT_STATUSES = [
  { key: "Hadir", color: GREEN },
  { key: "Izin", color: AMBER },
  { key: "Sakit", color: "#3E5C94" },
  { key: "Alpa", color: RED },
];

export const POINT_CATEGORIES = {
  plus: ["Membantu", "Sportif", "Aktif"],
  minus: ["Terlambat", "Mengganggu"],
};

export const todayStr = () => new Date().toISOString().slice(0, 10);

export function gradeLetter(v) {
  if (v >= 90) return "A";
  if (v >= 80) return "B";
  if (v >= 70) return "C";
  return "D";
}

// nilai poin dipetakan ke skala 0-100 (netral = 60, tiap poin bersih ±4, dibatasi 0-100)
export function pointsToScore(netPoints) {
  return Math.max(0, Math.min(100, 60 + netPoints * 4));
}

export function computeFinalScore({ attendancePct, avgPractice, examScore, netPoints, weights }) {
  const kh = attendancePct ?? 0;
  const pr = avgPractice ?? 0;
  const uj = examScore ?? 0;
  const po = pointsToScore(netPoints || 0);
  const wSum = weights.w_absensi + weights.w_praktek + weights.w_ujian + weights.w_poin || 1;
  const raw =
    kh * weights.w_absensi + pr * weights.w_praktek + uj * weights.w_ujian + po * weights.w_poin;
  return Math.round((raw / wSum) * 10) / 10;
}

export function exportToExcel(sheets, fileName) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  XLSX.writeFile(wb, fileName);
}

// ---------- Shared UI ----------
export function PageHeader({ eyebrow, title, right }) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
      <div>
        <div className="text-xs font-bold tracking-widest mb-1" style={{ color: ORANGE }}>
          {eyebrow?.toUpperCase()}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: INK }}>{title}</h1>
      </div>
      {right}
    </div>
  );
}

export function Card({ children, style, className = "" }) {
  return (
    <div
      className={`rounded-xl p-5 ${className}`}
      style={{ background: "white", boxShadow: "0 1px 3px rgba(22,35,63,0.08)", ...style }}
    >
      {children}
    </div>
  );
}

export function EmptyState({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center" style={{ color: MUTED }}>
      {Icon && <Icon size={26} className="mb-3" style={{ color: "#C7CEDC" }} />}
      <div className="text-sm">{text}</div>
    </div>
  );
}

export function ClassPicker({ classes, value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm font-semibold px-4 py-2.5 rounded-lg border-0 cursor-pointer"
      style={{ background: "white", color: INK, boxShadow: "0 1px 2px rgba(22,35,63,0.12)" }}
    >
      {classes.map((c) => (
        <option key={c.id} value={c.id}>Kelas {c.name}</option>
      ))}
    </select>
  );
}

export function Toast({ message, type = "info", onClose }) {
  if (!message) return null;
  const bg = type === "error" ? RED : type === "success" ? GREEN : NAVY;
  return (
    <div
      className="fixed bottom-5 right-5 px-4 py-3 rounded-lg text-sm font-semibold text-white shadow-lg z-50 cursor-pointer"
      style={{ background: bg }}
      onClick={onClose}
    >
      {message}
    </div>
  );
}
