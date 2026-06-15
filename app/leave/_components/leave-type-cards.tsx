"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@teamlet/ui";
import type { LeaveTypeItem, LeaveBalanceSummary } from "@teamlet/modules/leave";
import { requestLeaveAction, getHolidayDatesAction } from "@/lib/actions/leave";
import { DualCalendar } from "./dual-calendar";
import { ScheduleEditor, businessDays } from "./schedule-editor";
import type { LeaveScheduleEntry } from "@teamlet/modules/leave";

// ⚠️ v1 에는 /api/uploads 업로드 라우트가 없어요. 증명 자료 첨부는 선택 사항이라
//    업로드 시도 시 안내 메시지를 반환해 UI 가 깨지지 않게 인라인 stub 으로 처리해요.
type UploadResult = { ok: true; url: string; name: string; size: number } | { ok: false; error: string };
async function uploadFile(_file: File, _scope: string): Promise<UploadResult> {
  return { ok: false, error: "파일 업로드는 아직 지원되지 않아요. 증명 자료 없이 신청해 주세요." };
}

/* ── 부여 방식 레이블 ─────────────────────── */
export function grantLabel(t: LeaveTypeItem, balance?: LeaveBalanceSummary): string {
  if (balance && (balance.grantedDays > 0 || balance.adjustedDays > 0)) return `잔여 ${balance.remainingDays}일`;
  const amt = t.grantAmount;
  switch (t.grantMethod) {
    case "ON_REQUEST":         return amt ? `신청 시 ${amt}일 부여` : "신청 시 부여";
    case "ON_OTHER_EXHAUSTED": return amt ? `연차 소진 시 ${amt}일` : "연차 소진 시 부여";
    case "MANUAL":             return "관리자 직접 부여";
    case "ON_HIRE":            return amt ? `입사 시 ${amt}일 부여` : "입사 시 부여";
    case "PERIODIC":           return amt ? `매월 ${amt}일 부여` : "주기적 부여";
    case "ON_TENURE":          return amt ? `근속 시 ${amt}일 부여` : "근속 시 부여";
    default:                   return "부여";
  }
}

/** 한도 집계 주기가 월 단위인지 */
export function isMonthlyCycle(c: string | null): boolean {
  return !!c && c.startsWith("monthly");
}

/** ON_REQUEST with grantAmount — 잔여 계산 가능한 타입인지 */
export function periodicRemaining(t: LeaveTypeItem): number | null {
  if (t.grantAmount == null || t.periodicUsed == null) return null;
  return t.grantAmount - t.periodicUsed;
}

/* ── 시간 유틸 ──────────────────────────── */
const TIME_OPTIONS = (() => {
  const opts: { value: string; label: string }[] = [];
  for (let h = 7; h <= 22; h++) {
    for (const m of [0, 30]) {
      const hh = h.toString().padStart(2, "0");
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
  const ap = a.split(":").map(Number);
  const bp = b.split(":").map(Number);
  const [ah = 0, am = 0] = ap;
  const [bh = 0, bm = 0] = bp;
  return (bh * 60 + bm) - (ah * 60 + am);
}
function fmtDuration(start: string, end: string) {
  const m = minutesBetween(start, end);
  if (m <= 0) return "";
  return m % 60 === 0 ? `${m / 60}시간` : `${Math.floor(m / 60)}시간 ${m % 60}분`;
}

/* ── 영업일 계산 ─────────────────────────── */
function calcBusinessDays(start: string, end: string, holidays: Set<string>): number {
  if (!start || !end) return 0;
  const s = new Date(start), e = new Date(end);
  if (s > e) return 0;
  let n = 0;
  const c = new Date(s);
  while (c <= e) {
    const d = c.getDay();
    if (d !== 0 && d !== 6 && !holidays.has(c.toISOString().slice(0, 10))) n++;
    c.setDate(c.getDate() + 1);
  }
  return n;
}

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK[d.getDay()]})`;
}

type UnitType = "full" | "morning" | "afternoon" | "hourly";
const MORNING_S = "09:00", MORNING_E = "14:00";
const AFTERNOON_S = "14:00", AFTERNOON_E = "18:00";

/* ─────────────────────────────────────────
   RequestDialog — 2단계 플로우
   Step 1: 날짜 선택 + 사용 단위 (캘린더 영역 아래에 라디오)
   Step 2: 확인 (사유 + 증명자료 + 결재자)
───────────────────────────────────────── */
export function RequestDialog({
  leaveType,
  approverCandidates,
  onClose,
}: {
  leaveType: LeaveTypeItem;
  approverCandidates: { id: string; name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [step, setStep] = useState<"pick" | "confirm">("pick");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [unit, setUnit] = useState<UnitType>("full");
  const [hourStart, setHourStart] = useState("09:00");
  const [hourEnd, setHourEnd] = useState("10:00");
  const [reason, setReason] = useState("");
  // 휴가 종류에 고정 승인자가 있으면 우선 적용
  // approverEmployeeId가 설정된 경우만 승인 워크플로우 경유 (null = 자동 승인)
  const fixedApproverId = leaveType.approverEmployeeId ?? null;
  const fixedApproverName = leaveType.approverName ?? null;
  const [approverId, setApproverId] = useState(fixedApproverId ?? "");
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [evidenceFileUrl, setEvidenceFileUrl] = useState<string | null>(null);
  const [evidenceFileName, setEvidenceFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  // 상세 일정 편집 (다일 날짜별 단위) — null이면 미편집(균일)
  const [detailSchedule, setDetailSchedule] = useState<LeaveScheduleEntry[] | null>(null);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);

  useEffect(() => {
    getHolidayDatesAction(parseInt(startDate.slice(0, 4))).then((d) => setHolidays(new Set(d)));
  }, [startDate]);

  // 범위 변경 시 상세 일정 무효화
  useEffect(() => { setDetailSchedule(null); }, [startDate, endDate]);

  const isMultiDay = startDate !== endDate;
  const bizDays = calcBusinessDays(startDate, unit !== "full" ? startDate : endDate, holidays);
  const hourMins = minutesBetween(hourStart, hourEnd);
  const uniformDays =
    unit === "full" ? bizDays :
    unit === "morning" || unit === "afternoon" ? (bizDays > 0 ? 0.5 : 0) :
    bizDays > 0 && hourMins > 0 ? Math.round(hourMins / 60 * 10) / 10 : 0;
  // 상세 일정이 있으면 합산값 우선
  const computedDays = detailSchedule
    ? Math.round(detailSchedule.reduce((s, e) => s + e.days, 0) * 100) / 100
    : uniformDays;

  const restIncluded = unit === "morning" || (unit === "hourly" && hourMins >= 120);

  const unitHeaderLabel =
    unit === "full" ? "하루 종일" :
    unit === "morning" ? "오전 반차" :
    unit === "afternoon" ? "오후 반차" : "시간차";

  function handleNext() {
    if (computedDays <= 0) return;
    const rem = periodicRemaining(leaveType);
    if (rem !== null && computedDays > rem) {
      setError(`사용 가능 일수를 초과했어요. (${isMonthlyCycle(leaveType.periodicCycle) ? "이번 달" : "올해"} 잔여 ${rem}일)`);
      return;
    }
    setError(null);
    setStep("confirm");
  }

  // 날짜별 상세 일정 구성 — 상세편집 우선, 없으면 균일(단일 단위 / 다일 종일)
  function buildSchedule(): LeaveScheduleEntry[] {
    if (detailSchedule) return detailSchedule;
    if (isMultiDay) {
      return businessDays(startDate, endDate, holidays).map((d) => ({ date: d, unit: "FULL" as const, days: 1 }));
    }
    const u = unit === "full" ? "FULL" : unit === "morning" ? "AM_HALF" : unit === "afternoon" ? "PM_HALF" : "HOURLY";
    const st = unit === "morning" ? MORNING_S : unit === "afternoon" ? AFTERNOON_S : unit === "hourly" ? hourStart : undefined;
    const et = unit === "morning" ? MORNING_E : unit === "afternoon" ? AFTERNOON_E : unit === "hourly" ? hourEnd : undefined;
    return [{ date: startDate, unit: u, startTime: st, endTime: et, days: computedDays }];
  }

  function handleSubmit() {
    setError(null);
    if (computedDays <= 0) { setError("사용 일수가 0이에요. 날짜와 사용 단위를 확인해 주세요."); return; }
    startTransition(async () => {
      const effEnd = isMultiDay ? endDate : startDate;
      const res = await requestLeaveAction({
        leaveTypeId: leaveType.id,
        approverId: approverId || undefined,
        startDate,
        endDate: effEnd,
        days: computedDays,
        reason: reason || undefined,
        evidenceFileUrl: evidenceFileUrl || undefined,
        schedule: buildSchedule(),
      });
      if (!res.ok) { setError(res.error.message); return; }
      onClose(); router.refresh();
    });
  }

  const payLabel = leaveType.paymentType === "PAID" ? "유급" : leaveType.paymentType === "UNPAID" ? "무급" : "부분유급";

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px 12px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🏖</div>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 14.5 }}>{leaveType.name}</span>
          <span style={{ fontSize: 12, color: "var(--fg-muted)", marginLeft: 8 }}>
            {(() => {
              const rem = periodicRemaining(leaveType);
              if (rem !== null) return `잔여 ${rem}일 · ${payLabel}`;
              return `사용 가능 · ${payLabel}`;
            })()}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="닫기"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-subtle)", padding: 4, borderRadius: 4, lineHeight: 1, display: "flex", alignItems: "center" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/>
          </svg>
        </button>
      </div>

      {/* ── STEP 1: 날짜 + 사용 단위 ── */}
      {step === "pick" && (
        <div style={{ padding: "16px 20px 20px" }}>
          {/* 선택 요약 제목 (flexv2 #09 verbatim 형식) */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>
              {startDate !== endDate
                ? `${fmtDate(startDate)} – ${fmtDate(endDate)}`
                : `${fmtDate(startDate)} · ${unitHeaderLabel}`}
            </div>
            {startDate !== endDate ? (
              <div style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>총 {computedDays}일 · 주말·공휴일 제외</div>
            ) : leaveType.grantAmount ? (
              <div style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                {leaveType.grantMethod === "ON_REQUEST" ? `신청 시 ${leaveType.grantAmount}일 부여` : `최대 ${leaveType.grantAmount}일`}
              </div>
            ) : null}
          </div>

          {/* 듀얼 캘린더 (시작일 클릭 → 종료일 클릭) */}
          <div style={{ marginBottom: 14 }}>
            <DualCalendar
              startDate={startDate}
              endDate={endDate}
              holidays={holidays}
              onChange={(s, e) => {
                setStartDate(s);
                setEndDate(e);
                if (s !== e) setUnit("full"); // 다일은 하루 종일만
              }}
            />
          </div>

          {/* 일수 미리보기 */}
          {startDate && (
            <div style={{
              padding: "9px 12px", borderRadius: 8, marginBottom: 16, fontSize: 13,
              background: computedDays > 0 ? "var(--primary-soft)" : "#fef2f2",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              {computedDays > 0
                ? <><span style={{ fontWeight: 700, color: "var(--primary)", fontFamily: "var(--font-mono)" }}>{computedDays}일</span><span style={{ color: "var(--fg-muted)" }}>사용 예정 · 주말·공휴일 제외</span></>
                : <span style={{ color: "#dc2626" }}>선택 기간에 사용 가능한 날이 없어요</span>
              }
            </div>
          )}

          {/* 상세 일정 편집 (다일) — flexv2 #09/#10 */}
          {isMultiDay && (
            <div style={{ marginBottom: 16 }}>
              <button type="button" onClick={() => setShowScheduleEditor(true)}
                style={{ fontSize: 13, color: "var(--primary)", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                상세 일정 편집이 필요한가요? ›
              </button>
              {detailSchedule && (
                <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 4 }}>
                  날짜별 일정이 적용됐어요 · 총 {computedDays}일
                </div>
              )}
            </div>
          )}

          {/* 사용 단위 라디오 — 같은 날 2번 선택(단일 날짜)일 때만 표시 */}
          {startDate === endDate && <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
            {([
              { id: "full" as UnitType, label: "하루 종일" },
              ...(startDate === endDate ? [
                { id: "morning" as UnitType, label: "오전 반차" },
                { id: "afternoon" as UnitType, label: "오후 반차" },
                { id: "hourly" as UnitType, label: "시간차" },
              ] : []),
            ] as const).map(({ id, label }) => {
              const sel = unit === id;
              return (
                <div key={id}
                  onClick={() => {
                    setUnit(id);
                    if (id !== "full") setEndDate(startDate);
                  }}
                  style={{
                    border: `1.5px solid ${sel ? "var(--primary)" : "var(--border)"}`,
                    borderRadius: 10, padding: "11px 14px", cursor: "pointer",
                    background: sel ? "var(--primary-soft)" : "var(--bg-primary)",
                    display: "flex", alignItems: "center", gap: 10,
                    transition: "border-color 0.1s, background 0.1s",
                  }}
                >
                  {/* 라디오 */}
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                    border: `2px solid ${sel ? "var(--primary)" : "var(--border-strong)"}`,
                    background: sel ? "var(--primary)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {sel && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "white" }} />}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 14, color: sel ? "var(--primary)" : "var(--fg)" }}>{label}</span>

                  {/* 오전 반차 시간 */}
                  {id === "morning" && sel && (
                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12.5, color: "var(--fg-muted)", padding: "3px 8px", background: "var(--bg-secondary)", borderRadius: 6, border: "1px solid var(--border)" }}>{timeLabel(MORNING_S)}</span>
                      <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>~</span>
                      <span style={{ fontSize: 12.5, color: "var(--fg-muted)", padding: "3px 8px", background: "var(--bg-secondary)", borderRadius: 6, border: "1px solid var(--border)" }}>{timeLabel(MORNING_E)}</span>
                      <span title="휴게 시간을 포함했어요. (1시간)" style={{ fontSize: 15, cursor: "help" }}>☕</span>
                    </div>
                  )}

                  {/* 오후 반차 시간 */}
                  {id === "afternoon" && sel && (
                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12.5, color: "var(--fg-muted)", padding: "3px 8px", background: "var(--bg-secondary)", borderRadius: 6, border: "1px solid var(--border)" }}>{timeLabel(AFTERNOON_S)}</span>
                      <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>~</span>
                      <span style={{ fontSize: 12.5, color: "var(--fg-muted)", padding: "3px 8px", background: "var(--bg-secondary)", borderRadius: 6, border: "1px solid var(--border)" }}>{timeLabel(AFTERNOON_E)}</span>
                      <span title="휴게 시간을 포함하지 않았어요." style={{ fontSize: 15, cursor: "help", opacity: 0.35 }}>☕</span>
                    </div>
                  )}

                  {/* 시간차 드롭다운 */}
                  {id === "hourly" && sel && (
                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
                      <select value={hourStart} onChange={(e) => setHourStart(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ padding: "3px 6px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12, background: "var(--bg-primary)", color: "var(--fg)" }}>
                        {TIME_OPTIONS.filter((o) => o.value < hourEnd).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>~</span>
                      <select value={hourEnd} onChange={(e) => setHourEnd(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ padding: "3px 6px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12, background: "var(--bg-primary)", color: "var(--fg)" }}>
                        {TIME_OPTIONS.filter((o) => o.value > hourStart).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <span
                        title={restIncluded ? "휴게 시간을 포함했어요. (1시간)" : "휴게 시간을 포함하지 않았어요."}
                        style={{ fontSize: 15, cursor: "help", opacity: restIncluded ? 1 : 0.35 }}
                      >☕</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>}

          <button
            onClick={handleNext}
            disabled={computedDays <= 0}
            style={{
              width: "100%", padding: "13px", borderRadius: 10, fontSize: 15, fontWeight: 700,
              background: computedDays > 0 ? "var(--primary)" : "var(--bg-tertiary)",
              color: computedDays > 0 ? "white" : "var(--fg-muted)",
              border: "none", cursor: computedDays > 0 ? "pointer" : "default",
            }}
          >
            다음
          </button>
        </div>
      )}

      {/* ── STEP 2: 확인 ── */}
      {step === "confirm" && (
        <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>휴가를 등록할까요?</h3>

          {/* 선택 요약 */}
          <div style={{
            border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "var(--bg-primary)",
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                {fmtDate(startDate)}{startDate !== endDate ? ` – ${fmtDate(endDate)}` : ` · ${unitHeaderLabel}`}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--fg-muted)", marginTop: 2 }}>
                {unit === "morning" ? `${timeLabel(MORNING_S)} — ${timeLabel(MORNING_E)} (4시간)`
                  : unit === "afternoon" ? `${timeLabel(AFTERNOON_S)} — ${timeLabel(AFTERNOON_E)} (4시간)`
                  : unit === "hourly" ? `${timeLabel(hourStart)} — ${timeLabel(hourEnd)}${hourMins > 0 ? ` (${fmtDuration(hourStart, hourEnd)})` : ""}`
                  : `총 ${computedDays}일`}
              </div>
            </div>
            <button onClick={() => setStep("pick")}
              style={{ fontSize: 12.5, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>
              다시 선택하기 &gt;
            </button>
          </div>

          {/* 사유 */}
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 3 }}>사유</div>
            <p style={{ fontSize: 12.5, color: "var(--fg-muted)", margin: "0 0 6px" }}>휴가 사용 기록에 남길 수 있어요.</p>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)}
              maxLength={200} rows={3}
              style={{
                width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 8,
                fontSize: 13, resize: "none", background: "var(--bg-primary)", color: "var(--fg)", outline: "none", fontFamily: "inherit",
              }} />
          </div>

          {/* 증명 자료 첨부 */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>증명 자료</span>
              {leaveType.evidenceRequirement !== "NONE" && (
                <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 999, background: "var(--bg-tertiary)", color: "var(--fg-muted)", fontWeight: 500 }}>
                  {leaveType.evidenceRequirement === "AFTER" ? "나중 제출 가능" : "사전 제출"}
                </span>
              )}
            </div>
            {evidenceFileName ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--bg-secondary)", fontSize: 13 }}>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--fg)" }}>📎 {evidenceFileName}</span>
                <button type="button" onClick={() => { setEvidenceFileUrl(null); setEvidenceFileName(null); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-muted)", fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
              </div>
            ) : (
              <label style={{ display: "block", cursor: isUploading ? "wait" : "pointer" }}>
                <div style={{
                  border: "1.5px dashed var(--border)", borderRadius: 10, padding: "14px",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  color: "var(--fg-muted)", fontSize: 13, background: "var(--bg-secondary)",
                  opacity: isUploading ? 0.6 : 1,
                }}>
                  {isUploading ? "업로드 중…" : "⬆ 파일 선택 (PDF · 이미지 · 문서)"}
                </div>
                <input type="file" style={{ display: "none" }}
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.hwp"
                  disabled={isUploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsUploading(true);
                    const result = await uploadFile(file, "employee-documents");
                    setIsUploading(false);
                    if (result.ok) {
                      setEvidenceFileUrl(result.url);
                      setEvidenceFileName(file.name);
                    } else {
                      setError(result.error);
                    }
                    e.target.value = "";
                  }} />
              </label>
            )}
          </div>

          {/* 승인·참조 안내 — flexv2 #14/#97 verbatim 2분기 */}
          {(() => {
            const approverName = fixedApproverName ?? (approverCandidates[0]?.name);
            const ccNames = leaveType.ccNames ?? [];
            if (!approverName) return (
              <div style={{ fontSize: 12.5, color: "var(--fg-muted)", textAlign: "center" }}>
                승인 없이 바로 등록돼요.
              </div>
            );
            // 참조 있으면 "OOO님, OOO님에게 승인 · 참조를 요청해요." / 없으면 "OOO님에게 승인을 요청해요."
            const allNames = [approverName, ...ccNames];
            const text = ccNames.length > 0
              ? `${allNames.join("님, ")}님에게 승인 · 참조를 요청해요.`
              : `${approverName}님에게 승인을 요청해요.`;
            return (
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--bg-secondary)", border: "1px solid var(--border)", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 500, color: "var(--fg)" }}>{text}</span>
                <span style={{ marginLeft: "auto", color: "var(--fg-subtle)" }}>›</span>
              </div>
            );
          })()}

          {error && <p style={{ fontSize: 12.5, color: "#dc2626", margin: 0 }}>{error}</p>}

          <button onClick={handleSubmit} disabled={isPending}
            style={{
              width: "100%", padding: "13px", borderRadius: 10, fontSize: 15, fontWeight: 700,
              background: isPending ? "var(--bg-tertiary)" : "var(--primary)",
              color: isPending ? "var(--fg-muted)" : "white",
              border: "none", cursor: isPending ? "wait" : "pointer",
            }}>
            {isPending ? "신청 중…" : "승인 요청하기"}
          </button>
        </div>
      )}

      {/* 상세 일정 편집 서브모달 */}
      {showScheduleEditor && (
        <ScheduleEditor
          dates={businessDays(startDate, endDate, holidays)}
          initial={detailSchedule ?? []}
          onSave={(s) => { setDetailSchedule(s); setShowScheduleEditor(false); }}
          onClose={() => setShowScheduleEditor(false)}
        />
      )}
    </div>
  );
}

/* ── 카드 그리드 ─────────────────────────── */
export function LeaveTypeCards({
  leaveTypes,
  balances,
  approverCandidates,
}: {
  leaveTypes: LeaveTypeItem[];
  balances: LeaveBalanceSummary[];
  approverCandidates: { id: string; name: string }[];
}) {
  const [selected, setSelected] = useState<LeaveTypeItem | null>(null);
  const balanceMap = new Map(balances.map((b) => [b.leaveTypeId, b]));

  // 9개씩 페이지네이션 (처음에 너무 길어지지 않게)
  const PER_PAGE = 9;
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(leaveTypes.length / PER_PAGE);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const pageTypes = leaveTypes.slice(safePage * PER_PAGE, safePage * PER_PAGE + PER_PAGE);

  return (
    <>
      <div className="breakdown">
        <h3>휴가 등록</h3>
        <div className="types-grid">
          {pageTypes.map((t) => {
            const balance = balanceMap.get(t.id);
            const rem = periodicRemaining(t);
            const isExhausted =
              (balance && balance.remainingDays <= 0 && balance.grantedDays > 0) ||
              (rem !== null && rem <= 0);
            return (
              <button key={t.id} type="button" onClick={() => setSelected(t)}
                className={`type${isExhausted ? " na" : ""}`}
                style={{
                  textAlign: "left", cursor: "pointer",
                  border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px",
                  background: isExhausted ? "var(--bg-secondary)" : "var(--bg-primary)",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  minHeight: 84, display: "flex", flexDirection: "column", justifyContent: "center", gap: 2,
                }}
                onMouseEnter={(e) => {
                  if (!isExhausted) {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.borderColor = "var(--primary)"; el.style.boxShadow = "0 0 0 2px var(--primary-soft)";
                  }
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.borderColor = "var(--border)"; el.style.boxShadow = "none";
                }}
              >
                <div className="t">{t.name}</div>
                {balance && balance.grantedDays > 0 ? (
                  <>
                    <div className="vt num" style={{ color: isExhausted ? "var(--fg-subtle)" : undefined }}>
                      {balance.remainingDays}<small>/ {balance.grantedDays + balance.adjustedDays}일</small>
                    </div>
                    <div className="s">사용 {balance.usedDays}일</div>
                  </>
                ) : rem !== null ? (
                  <>
                    <div className="vt num" style={{ color: rem <= 0 ? "var(--fg-subtle)" : undefined }}>
                      {rem}<small>/ {t.grantAmount}일</small>
                    </div>
                    <div className="s">{isMonthlyCycle(t.periodicCycle) ? "이번 달 잔여" : "올해 잔여"}</div>
                  </>
                ) : (
                  <div className="s" style={{ marginTop: 6, fontSize: 12, color: "var(--fg-muted)" }}>
                    {grantLabel(t, balance)}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 }}>
            <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}
              style={{ borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-primary)", padding: "4px 10px", fontSize: 12.5, color: "var(--fg-muted)", cursor: safePage === 0 ? "default" : "pointer", opacity: safePage === 0 ? 0.4 : 1 }}>
              ‹ 이전
            </button>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--fg-muted)" }}>{safePage + 1} / {totalPages}</span>
            <button type="button" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1}
              style={{ borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-primary)", padding: "4px 10px", fontSize: 12.5, color: "var(--fg-muted)", cursor: safePage >= totalPages - 1 ? "default" : "pointer", opacity: safePage >= totalPages - 1 ? 0.4 : 1 }}>
              다음 ›
            </button>
          </div>
        )}
      </div>

      {selected && (
        <Dialog open onOpenChange={(o) => { if (!o) setSelected(null); }}>
          <DialogContent className="max-w-md p-0 overflow-hidden" showClose={false}>
            <RequestDialog leaveType={selected} approverCandidates={approverCandidates} onClose={() => setSelected(null)} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
