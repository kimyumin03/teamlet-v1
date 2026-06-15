"use client";

/**
 * 상세 일정 편집 서브모달 (flexv2 #10~13 verbatim)
 * 다일 휴가에서 날짜마다 단위(하루종일/오전반차/오후반차/시간차)를 개별 지정.
 */

import { useState } from "react";
import { Dialog, DialogContent } from "@teamlet/ui";
import type { LeaveScheduleEntry } from "@teamlet/modules/leave";

type SchedUnit = "FULL" | "AM_HALF" | "PM_HALF" | "HOURLY";

const UNIT_LABEL: Record<SchedUnit, string> = {
  FULL: "하루 종일",
  AM_HALF: "오전 반차",
  PM_HALF: "오후 반차",
  HOURLY: "시간차",
};

const TIME_OPTIONS = (() => {
  const opts: { value: string; label: string }[] = [];
  for (let h = 7; h <= 22; h++) {
    for (const m of [0, 30]) {
      const hh = String(h).padStart(2, "0");
      const mm = m === 0 ? "00" : "30";
      const period = h < 12 ? "오전" : "오후";
      const dh = h <= 12 ? h : h - 12;
      opts.push({ value: `${hh}:${mm}`, label: `${period} ${dh}:${mm}` });
    }
  }
  return opts;
})();
function timeLabel(v: string) { return TIME_OPTIONS.find((o) => o.value === v)?.label ?? v; }
function minutesBetween(a: string, b: string) {
  const [ah = 0, am = 0] = a.split(":").map(Number);
  const [bh = 0, bm = 0] = b.split(":").map(Number);
  return (bh * 60 + bm) - (ah * 60 + am);
}

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK[d.getDay()]})`;
}

/** 한 행의 단위 → 차감 일수 */
function entryDays(e: { unit: SchedUnit; startTime?: string; endTime?: string }): number {
  if (e.unit === "FULL") return 1;
  if (e.unit === "AM_HALF" || e.unit === "PM_HALF") return 0.5;
  // HOURLY — 휴게(연속 2시간 이상 1시간) 제외한 시간 / 8
  if (e.startTime && e.endTime) {
    let mins = minutesBetween(e.startTime, e.endTime);
    if (mins >= 120) mins -= 60;
    return Math.max(0, Math.round((mins / 60 / 8) * 100) / 100);
  }
  return 0;
}

const DEFAULTS: Record<SchedUnit, { startTime?: string; endTime?: string }> = {
  FULL: {},
  AM_HALF: { startTime: "09:00", endTime: "14:00" },
  PM_HALF: { startTime: "14:00", endTime: "18:00" },
  HOURLY: { startTime: "09:00", endTime: "11:00" },
};

export function ScheduleEditor({
  dates, // 휴가 범위의 영업일 ISO 목록
  initial,
  onSave,
  onClose,
}: {
  dates: string[];
  initial: LeaveScheduleEntry[];
  onSave: (schedule: LeaveScheduleEntry[]) => void;
  onClose: () => void;
}) {
  // 초기값: 기존 schedule 또는 전부 하루 종일
  const [rows, setRows] = useState<Record<string, { unit: SchedUnit; startTime?: string; endTime?: string }>>(() => {
    const m: Record<string, { unit: SchedUnit; startTime?: string; endTime?: string }> = {};
    for (const d of dates) {
      const found = initial.find((e) => e.date === d);
      m[d] = found
        ? { unit: found.unit, startTime: found.startTime, endTime: found.endTime }
        : { unit: "FULL" };
    }
    return m;
  });

  function setUnit(date: string, unit: SchedUnit) {
    setRows((r) => ({ ...r, [date]: { unit, ...DEFAULTS[unit] } }));
  }
  function setTime(date: string, key: "startTime" | "endTime", v: string) {
    setRows((r) => ({ ...r, [date]: { ...r[date]!, [key]: v } }));
  }

  function handleSave() {
    const schedule: LeaveScheduleEntry[] = dates.map((d) => {
      const row = rows[d]!;
      return { date: d, unit: row.unit, startTime: row.startTime, endTime: row.endTime, days: entryDays(row) };
    });
    onSave(schedule);
  }

  const total = dates.reduce((s, d) => s + entryDays(rows[d]!), 0);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden" showClose={false}>
        <div>
          {/* 헤더 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 12px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 15.5, fontWeight: 700, margin: 0 }}>상세 일정 편집</h3>
            <button onClick={onClose} aria-label="닫기" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-subtle)", fontSize: 18, lineHeight: 1 }}>×</button>
          </div>

          {/* 날짜별 행 */}
          <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10, maxHeight: "60vh", overflowY: "auto" }}>
            {dates.map((d, i) => {
              const row = rows[d]!;
              const restIncluded = row.unit === "AM_HALF" || (row.unit === "HOURLY" && row.startTime && row.endTime && minutesBetween(row.startTime, row.endTime) >= 120);
              return (
                <div key={d} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "8px 0", borderBottom: i < dates.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, minWidth: 170 }}>{i + 1}. {fmtDate(d)}</span>
                  <select value={row.unit} onChange={(e) => setUnit(d, e.target.value as SchedUnit)}
                    style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid var(--border)", fontSize: 12.5, background: "var(--bg-primary)", color: "var(--fg)" }}>
                    {(Object.keys(UNIT_LABEL) as SchedUnit[]).map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
                  </select>
                  {row.unit !== "FULL" && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <select value={row.startTime ?? "09:00"} onChange={(e) => setTime(d, "startTime", e.target.value)}
                        style={{ padding: "5px 7px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12, background: "var(--bg-primary)", color: "var(--fg)" }}>
                        {TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>~</span>
                      <select value={row.endTime ?? "14:00"} onChange={(e) => setTime(d, "endTime", e.target.value)}
                        style={{ padding: "5px 7px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12, background: "var(--bg-primary)", color: "var(--fg)" }}>
                        {TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <span title={restIncluded ? "휴게 시간을 포함했어요. (1시간)" : "휴게 시간을 포함하지 않았어요."}
                        style={{ fontSize: 15, cursor: "help", opacity: restIncluded ? 1 : 0.35 }}>☕</span>
                    </span>
                  )}
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--fg-muted)", fontVariantNumeric: "tabular-nums" }}>{entryDays(row)}일</span>
                </div>
              );
            })}
          </div>

          {/* 합계 + 저장 */}
          <div style={{ padding: "12px 20px 16px", borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 12 }}>
              <span style={{ color: "var(--fg-muted)" }}>총 사용 일수</span>
              <b style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(total * 100) / 100}일</b>
            </div>
            <button type="button" onClick={handleSave}
              style={{ width: "100%", padding: "12px", borderRadius: 10, fontSize: 14.5, fontWeight: 700, background: "var(--primary)", color: "white", border: "none", cursor: "pointer" }}>
              적용
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** 휴가 범위(start~end)에서 주말·공휴일 제외한 영업일 ISO 목록 */
export function businessDays(startIso: string, endIso: string, holidays: Set<string>): string[] {
  const out: string[] = [];
  const s = new Date(startIso), e = new Date(endIso);
  const c = new Date(s);
  while (c <= e) {
    const iso = `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, "0")}-${String(c.getDate()).padStart(2, "0")}`;
    const dow = c.getDay();
    if (dow !== 0 && dow !== 6 && !holidays.has(iso)) out.push(iso);
    c.setDate(c.getDate() + 1);
  }
  return out;
}
