"use client";

/**
 * 휴가 신청 듀얼 캘린더 (flexv2 §D #07~09 verbatim UX)
 * - 이번달·다음달 2개월 표시
 * - 시작일 클릭 → 종료일 클릭 → 범위. 같은 날 두 번 = 하루
 * - 주말·공휴일 회색 표시
 */

import { useState } from "react";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parse(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function MonthGrid({
  year, month, startDate, endDate, holidays, today, onPick,
}: {
  year: number;
  month: number; // 0-based
  startDate: string;
  endDate: string;
  holidays: Set<string>;
  today: string;
  onPick: (iso: string) => void;
}) {
  const first = new Date(year, month, 1);
  const lead = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ flex: 1 }}>
      <div style={{ textAlign: "center", fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>
        {year}년 {month + 1}월
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {WEEK.map((w, i) => (
          <div key={w} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: i === 0 ? "#dc2626" : i === 6 ? "#2563eb" : "var(--fg-subtle)", padding: "2px 0" }}>{w}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const iso = ymd(new Date(year, month, d));
          const dow = new Date(year, month, d).getDay();
          const isPast = iso < today;
          const isHoliday = holidays.has(iso);
          const inRange = startDate && endDate && iso >= startDate && iso <= endDate;
          const isStart = iso === startDate;
          const isEnd = iso === endDate;
          const isEdge = isStart || isEnd;
          return (
            <button
              key={iso}
              type="button"
              disabled={isPast}
              onClick={() => onPick(iso)}
              style={{
                aspectRatio: "1", border: "none", borderRadius: isEdge ? 8 : inRange ? 0 : 8,
                cursor: isPast ? "default" : "pointer", fontSize: 12.5, fontWeight: isEdge ? 700 : 500,
                background: isEdge ? "var(--primary)" : inRange ? "var(--primary-soft)" : "transparent",
                color: isPast ? "var(--fg-subtle)" : isEdge ? "white"
                  : isHoliday || dow === 0 ? "#dc2626" : dow === 6 ? "#2563eb" : "var(--fg)",
                opacity: isPast ? 0.4 : 1,
                position: "relative",
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DualCalendar({
  startDate, endDate, holidays, onChange,
}: {
  startDate: string;
  endDate: string;
  holidays: Set<string>;
  onChange: (start: string, end: string) => void;
}) {
  const todayDate = new Date();
  const today = ymd(todayDate);
  // 표시 기준월 (시작일 또는 오늘)
  const base = startDate ? parse(startDate) : todayDate;
  const [offset, setOffset] = useState(0);
  const [selecting, setSelecting] = useState<"start" | "end">("end");

  const baseY = base.getFullYear();
  const baseM = base.getMonth() + offset;
  const left = new Date(baseY, baseM, 1);
  const right = new Date(baseY, baseM + 1, 1);

  function handlePick(iso: string) {
    if (selecting === "start" || !startDate) {
      onChange(iso, iso);
      setSelecting("end");
      return;
    }
    // selecting end
    if (iso < startDate) {
      // 시작일보다 이전 클릭 → 새 시작
      onChange(iso, iso);
      setSelecting("end");
    } else {
      onChange(startDate, iso);
      setSelecting("start");
    }
  }

  return (
    <div>
      {/* 월 네비게이션 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button type="button" onClick={() => setOffset((o) => o - 1)}
          style={navBtn}>‹</button>
        <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>시작일을 클릭한 뒤 종료일을 클릭하세요</span>
        <button type="button" onClick={() => setOffset((o) => o + 1)}
          style={navBtn}>›</button>
      </div>
      <div style={{ display: "flex", gap: 20 }}>
        <MonthGrid year={left.getFullYear()} month={left.getMonth()} startDate={startDate} endDate={endDate} holidays={holidays} today={today} onPick={handlePick} />
        <MonthGrid year={right.getFullYear()} month={right.getMonth()} startDate={startDate} endDate={endDate} holidays={holidays} today={today} onPick={handlePick} />
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)",
  background: "var(--bg-primary)", cursor: "pointer", color: "var(--fg-muted)", fontSize: 15, lineHeight: 1,
};
