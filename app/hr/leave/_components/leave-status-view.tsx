"use client";

import { useState, useMemo } from "react";
import type { CompanyLeaveBalanceRow, LeaveTypeItem } from "@teamlet/modules/leave";
import { completedMonthsSinceHire } from "@teamlet/shared";
import { GrantLeaveButton } from "@/components/hr/grant-leave-button";
import { AdjustLeaveButton } from "@/components/hr/adjust-leave-button";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]!;
}

function annualOf(row: CompanyLeaveBalanceRow) {
  return row.balances.find((b) => b.leaveTypeKey === "annual") ?? null;
}

/** 입사일로부터 현재까지 근속 — 개월(<12) 또는 "N년 M개월".
 *  연차 엔진과 동일한 completedMonthsSinceHire(민법 §160) 사용 → 부여 기준과 정확히 일치. */
function formatTenure(hire: Date | null): string {
  if (!hire) return "—";
  const h = new Date(hire);
  if (new Date() < h) return "입사 예정";
  const months = completedMonthsSinceHire(h, new Date());
  if (months < 12) return `${months}개월`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m === 0 ? `${y}년` : `${y}년 ${m}개월`;
}

function usageStatus(remaining: number, granted: number) {
  if (granted === 0) return { label: "미부여", cls: "border-border bg-background-secondary text-foreground-subtle" };
  if (remaining <= 0) return { label: "소진", cls: "border-destructive bg-destructive-50 text-destructive" };
  if (remaining <= 3) return { label: "임박", cls: "border-amber-400 bg-amber-50 text-amber-700" };
  if (remaining <= 7) return { label: "주의", cls: "border-amber-200 bg-amber-50/50 text-amber-600" };
  return { label: "정상", cls: "border-emerald-300 bg-emerald-50 text-emerald-700" };
}

function ProgressBar({ remaining, total }: { remaining: number; total: number }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0;
  const barColor = pct < 10 ? "bg-destructive" : pct < 30 ? "bg-amber-400" : "bg-primary";
  return (
    <div className="h-[5px] w-16 shrink-0 overflow-hidden rounded-full bg-background-tertiary">
      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function LeaveStatusView({
  rows,
  leaveTypes,
}: {
  rows: CompanyLeaveBalanceRow[];
  leaveTypes: LeaveTypeItem[];
}) {
  const [selectedId, setSelectedId] = useState<string>(rows[0]?.employeeId ?? "");
  const [deptFilter, setDeptFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState<"" | "MALE" | "FEMALE">("") ;
  const [sortBy, setSortBy] = useState<"remaining_asc" | "name">("remaining_asc");

  const departments = useMemo(
    () => Array.from(new Set(rows.map((r) => r.departmentName).filter(Boolean) as string[])).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    let result = rows;
    if (deptFilter) result = result.filter((r) => r.departmentName === deptFilter);
    if (genderFilter) result = result.filter((r) => r.gender === genderFilter);
    if (sortBy === "remaining_asc") {
      result = [...result].sort((a, b) => {
        const ra = annualOf(a)?.remainingDays ?? 999;
        const rb = annualOf(b)?.remainingDays ?? 999;
        return ra - rb;
      });
    } else {
      result = [...result].sort((a, b) => a.employeeName.localeCompare(b.employeeName));
    }
    return result;
  }, [rows, deptFilter, sortBy]);

  const selected = rows.find((r) => r.employeeId === selectedId) ?? rows[0];
  const selectedAnnual = selected ? annualOf(selected) : null;
  const selectedOther = selected ? selected.balances.filter((b) => b.leaveTypeKey !== "annual") : [];

  const chipClass =
    "h-7 appearance-none rounded-full border border-border bg-background-primary pl-2.5 pr-6 text-[12px] text-foreground-muted hover:border-border-strong transition-colors cursor-pointer focus-visible:outline-none";

  return (
    <div className="grid grid-cols-[1fr_360px] flex-1 overflow-hidden">
      {/* 좌 — 테이블 */}
      <div className="flex flex-col overflow-hidden border-r border-border">
        {/* 필터 바 */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-6 py-3">
          <div className="relative inline-flex items-center">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className={chipClass}
            >
              <option value="">조직 · 전체</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <svg className="pointer-events-none absolute right-2 h-3 w-3 text-foreground-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>

          <div className="relative inline-flex items-center">
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as typeof genderFilter)}
              className={chipClass}
            >
              <option value="">성별 · 전체</option>
              <option value="MALE">남성</option>
              <option value="FEMALE">여성</option>
            </select>
            <svg className="pointer-events-none absolute right-2 h-3 w-3 text-foreground-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>

          <div className="relative inline-flex items-center">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className={chipClass}
            >
              <option value="remaining_asc">잔여 적은 순</option>
              <option value="name">이름순</option>
            </select>
            <svg className="pointer-events-none absolute right-2 h-3 w-3 text-foreground-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>

          <div className="flex-1" />
          <span className="font-mono text-[11.5px] text-foreground-subtle">{filtered.length}명 표시</span>
        </div>

        {/* 테이블 — 약 8명까지 보이고 그 이상은 스크롤 */}
        <div className="flex-1 overflow-auto" style={{ maxHeight: 464 }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-background-primary text-left">
                <th className="px-5 py-2.5 text-[11.5px] font-medium text-foreground-subtle">이름</th>
                <th className="px-3 py-2.5 text-[11.5px] font-medium text-foreground-subtle">사번</th>
                <th className="px-3 py-2.5 text-[11.5px] font-medium text-foreground-subtle">근속</th>
                <th className="px-3 py-2.5 text-right text-[11.5px] font-medium text-foreground-subtle">연차 잔여/부여</th>
                <th className="px-3 py-2.5 text-right text-[11.5px] font-medium text-foreground-subtle">사용</th>
                <th className="px-3 py-2.5 text-[11.5px] font-medium text-foreground-subtle">기타 휴가</th>
                <th className="px-3 py-2.5 text-[11.5px] font-medium text-foreground-subtle">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((row) => {
                const ann = annualOf(row);
                const total = ann ? ann.grantedDays + ann.adjustedDays : 0;
                const remaining = ann?.remainingDays ?? 0;
                const status = usageStatus(remaining, total);
                const isSelected = row.employeeId === selectedId;
                const otherBalances = row.balances.filter(
                  (b) => b.leaveTypeKey !== "annual" && (b.grantedDays > 0 || b.remainingDays > 0),
                );
                const appliedKeys = new Set(row.balances.map((b) => b.leaveTypeKey));
                const naTypes = leaveTypes.filter(
                  (t) => t.key !== "annual" && !appliedKeys.has(t.key),
                );

                return (
                  <tr
                    key={row.employeeId}
                    onClick={() => setSelectedId(row.employeeId)}
                    className={`cursor-pointer transition-colors hover:bg-background-secondary ${isSelected ? "bg-primary/5" : ""}`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarColor(row.employeeName)}`}>
                          {row.employeeName.slice(-2)}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[13.5px] font-semibold truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                            {row.employeeName}
                          </p>
                          <p className="text-[11.5px] text-foreground-muted truncate">{row.departmentName ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-[12px] text-foreground-muted">
                      {row.employeeNumber ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-[12px] text-foreground-muted whitespace-nowrap">
                      {formatTenure(row.hireDate)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <ProgressBar remaining={remaining} total={total} />
                        <span className="font-mono text-[13px] font-bold tabular-nums text-foreground">
                          {ann ? remaining : "—"}
                        </span>
                        <span className="font-mono text-[11.5px] text-foreground-subtle">
                          / {ann ? total : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[12px] text-foreground-muted">
                      {ann ? ann.usedDays : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {otherBalances.slice(0, 3).map((b) => (
                          <span key={b.leaveTypeId} className="rounded-full border border-border bg-background-secondary px-2 py-0.5 font-mono text-[10.5px] font-semibold text-foreground">
                            {b.leaveTypeName} {b.remainingDays}
                          </span>
                        ))}
                        {naTypes.slice(0, Math.max(0, 2 - otherBalances.length)).map((t) => (
                          <span key={t.id} className="rounded-full border border-dashed border-border px-2 py-0.5 font-mono text-[10.5px] text-foreground-subtle">
                            {t.name} ─
                          </span>
                        ))}
                        {otherBalances.length > 3 && (
                          <span className="font-mono text-[10.5px] text-foreground-muted">+{otherBalances.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-block rounded-[5px] border px-2 py-0.5 font-mono text-[11px] font-semibold ${status.cls}`}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 페이지 정보 */}
        <div className="shrink-0 border-t border-border bg-background-primary px-6 py-3">
          <span className="font-mono text-[11.5px] text-foreground-muted">
            전체 {rows.length}명 중 {filtered.length}명 표시
          </span>
        </div>
      </div>

      {/* 우 — 상세 패널 */}
      {selected && (
        <div className="flex flex-col overflow-y-auto bg-background px-6 py-5">
          {/* 헤더 */}
          <div className="mb-4 flex items-start gap-3 border-b border-border pb-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColor(selected.employeeName)}`}>
              {selected.employeeName.slice(-2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-bold leading-tight">{selected.employeeName}</p>
              <p className="mt-0.5 text-[12px] text-foreground-muted">
                {selected.employeeNumber && <span className="font-mono">{selected.employeeNumber}</span>}
                {selected.employeeNumber && selected.departmentName && " · "}
                {selected.departmentName}
                {selected.positionName && ` · ${selected.positionName}`}
              </p>
            </div>
          </div>

          {/* 연차 요약 */}
          <div className="mb-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-[10px] border border-border bg-background-primary px-3 py-2.5">
              <p className="text-[11px] text-foreground-muted">연차 잔여</p>
              <p className={`mt-0.5 text-[18px] font-bold tabular-nums ${selectedAnnual && selectedAnnual.remainingDays <= 3 && selectedAnnual.grantedDays > 0 ? "text-amber-600" : "text-foreground"}`}>
                {selectedAnnual ? selectedAnnual.remainingDays : "—"}
                {selectedAnnual && <small className="ml-1 text-[11.5px] font-normal text-foreground-muted">/ {selectedAnnual.grantedDays + selectedAnnual.adjustedDays}일</small>}
              </p>
            </div>
            <div className="rounded-[10px] border border-border bg-background-primary px-3 py-2.5">
              <p className="text-[11px] text-foreground-muted">사용일</p>
              <p className="mt-0.5 text-[18px] font-bold tabular-nums text-foreground">
                {selectedAnnual ? selectedAnnual.usedDays : "—"}
                <small className="ml-1 text-[11.5px] font-normal text-foreground-muted">일</small>
              </p>
            </div>
          </div>

          {/* 휴가 종류별 */}
          <div className="mb-4">
            <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-foreground-muted">
              휴가 종류별 잔여
            </p>
            <div className="flex flex-col gap-1.5" style={{ maxHeight: 320, overflowY: "auto", paddingRight: 2 }}>
              {selectedAnnual && (
                <div className="flex items-center justify-between rounded-[8px] border border-border bg-background-primary px-3 py-2.5">
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">연차</p>
                    <p className="text-[11px] text-foreground-muted">사용 {selectedAnnual.usedDays} / {selectedAnnual.grantedDays + selectedAnnual.adjustedDays}</p>
                  </div>
                  <span className="font-mono text-[13px] font-bold text-foreground">{selectedAnnual.remainingDays}일</span>
                </div>
              )}
              {selectedOther.map((b) => (
                <div key={b.leaveTypeId} className="flex items-center justify-between rounded-[8px] border border-border bg-background-primary px-3 py-2.5">
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">{b.leaveTypeName}</p>
                    <p className="text-[11px] text-foreground-muted">신청 시 부여</p>
                  </div>
                  <span className="font-mono text-[13px] font-bold text-foreground">{b.remainingDays}일</span>
                </div>
              ))}
              {selected.balances.length === 0 && (
                <p className="py-4 text-center text-[12.5px] text-foreground-muted">부여된 휴가가 없어요</p>
              )}
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="mt-auto flex gap-2 pt-4">
            <GrantLeaveButton
              employees={[{ id: selected.employeeId, name: selected.employeeName, departmentId: null, departmentName: selected.departmentName }]}
              departments={[]}
              leaveTypes={leaveTypes}
              presetEmployeeId={selected.employeeId}
            />
            <AdjustLeaveButton
              employees={[{ id: selected.employeeId, name: selected.employeeName, departmentId: null, departmentName: selected.departmentName }]}
              departments={[]}
              leaveTypes={leaveTypes}
              presetEmployeeId={selected.employeeId}
            />
          </div>
        </div>
      )}
    </div>
  );
}
