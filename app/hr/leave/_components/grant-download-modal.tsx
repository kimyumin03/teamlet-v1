"use client";

import { useState } from "react";
import { Download, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@teamlet/ui";
import type { LeaveTypeItem } from "@teamlet/modules/leave";

type Employee = { id: string; name: string; departmentName?: string | null };

function fmtDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}
function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 31);
  return fmtDateInput(d);
}

const STATUS_OPTS = [
  { key: "unused", label: "미사용" },
  { key: "partial", label: "부분 사용" },
  { key: "all", label: "모두 사용" },
] as const;

const EXPIRY_OPTS = [
  { key: "expired", label: "만료됨" },
  { key: "not_expired", label: "만료되지 않음" },
] as const;

export function GrantDownloadModal({
  open,
  onClose,
  employees,
  leaveTypes,
}: {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  leaveTypes: LeaveTypeItem[];
}) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(fmtDateInput(new Date()));
  const [actorId, setActorId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [selectedTypeNames, setSelectedTypeNames] = useState<Set<string>>(
    new Set(leaveTypes.filter((t) => t.key !== "annual").map((t) => t.name)),
  );
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(
    new Set(STATUS_OPTS.map((o) => o.key)),
  );
  const [selectedExpiry, setSelectedExpiry] = useState<Set<string>>(
    new Set(EXPIRY_OPTS.map((o) => o.key)),
  );

  function toggleSet<T extends string>(set: Set<T>, key: T): Set<T> {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  }

  function buildUrl() {
    const params = new URLSearchParams();
    params.set("from", from);
    params.set("to", to);
    if (actorId) params.set("actorId", actorId);
    if (employeeId) params.set("employeeId", employeeId);
    if (selectedTypeNames.size < leaveTypes.length) {
      params.set("leaveTypeIds", [...selectedTypeNames].join(","));
    }
    if (selectedStatuses.size < STATUS_OPTS.length) {
      params.set("statuses", [...selectedStatuses].join(","));
    }
    return `/api/hr/leave/export/grants?${params}`;
  }

  const customLeaveTypes = leaveTypes.filter((t) => t.key !== "annual");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ maxWidth: 520 }}>
        <DialogHeader>
          <DialogTitle>맞춤 휴가 부여 내역 엑셀 다운로드</DialogTitle>
        </DialogHeader>
        <p style={{ fontSize: 12.5, color: "var(--fg-muted)", marginTop: -4, marginBottom: 12 }}>
          부여 내역을 엑셀로 다운로드할 수 있어요.
        </p>

        <div className="flex flex-col gap-4">
          {/* 부여 기간 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground-muted">부여 기간 *</label>
            <div className="flex items-center gap-2">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="flex-1 rounded-[8px] border border-border bg-background-primary px-3 py-2 text-[13px] text-foreground outline-none focus:border-foreground-subtle" />
              <span className="text-foreground-subtle text-sm">~</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="flex-1 rounded-[8px] border border-border bg-background-primary px-3 py-2 text-[13px] text-foreground outline-none focus:border-foreground-subtle" />
            </div>
          </div>

          {/* 부여자 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground-muted">부여자 *</label>
            <select value={actorId} onChange={(e) => setActorId(e.target.value)}
              className="rounded-[8px] border border-border bg-background-primary px-3 py-2 text-[13px] text-foreground outline-none focus:border-foreground-subtle">
              <option value="">전체</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}{e.departmentName ? ` · ${e.departmentName}` : ""}</option>
              ))}
            </select>
          </div>

          {/* 부여 대상자 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground-muted">부여 대상자 *</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}
              className="rounded-[8px] border border-border bg-background-primary px-3 py-2 text-[13px] text-foreground outline-none focus:border-foreground-subtle">
              <option value="">전체</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}{e.departmentName ? ` · ${e.departmentName}` : ""}</option>
              ))}
            </select>
          </div>

          {/* 휴가 종류 */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground-muted">휴가 종류 *</label>
              <span className="text-[11px] text-foreground-subtle">
                {selectedTypeNames.size}개 선택
                {selectedTypeNames.size < customLeaveTypes.length && (
                  <button type="button" className="ml-2 text-primary" onClick={() =>
                    setSelectedTypeNames(new Set(customLeaveTypes.map((t) => t.name)))
                  }>전체 선택</button>
                )}
                {selectedTypeNames.size > 0 && (
                  <button type="button" className="ml-2 text-foreground-subtle" onClick={() =>
                    setSelectedTypeNames(new Set())
                  }>모두 지우기</button>
                )}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 rounded-[8px] border border-border bg-background-primary p-2">
              {customLeaveTypes.map((t) => (
                <button key={t.id} type="button"
                  onClick={() => setSelectedTypeNames((s) => toggleSet(s, t.name))}
                  className={`rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium transition-colors ${
                    selectedTypeNames.has(t.name)
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border text-foreground-muted"
                  }`}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* 휴가 상태 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground-muted">휴가 상태 *</label>
            <div className="flex gap-2">
              {STATUS_OPTS.map((o) => (
                <button key={o.key} type="button"
                  onClick={() => setSelectedStatuses((s) => toggleSet(s, o.key))}
                  className={`flex-1 rounded-[8px] border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                    selectedStatuses.has(o.key)
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-background-primary text-foreground-muted"
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* 만료 여부 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground-muted">만료 여부 *</label>
            <div className="flex gap-2">
              {EXPIRY_OPTS.map((o) => (
                <button key={o.key} type="button"
                  onClick={() => setSelectedExpiry((s) => toggleSet(s, o.key))}
                  className={`flex-1 rounded-[8px] border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                    selectedExpiry.has(o.key)
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-background-primary text-foreground-muted"
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 다운로드 버튼 */}
        <a
          href={buildUrl()}
          download
          style={{
            marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "10px 0", borderRadius: 10, fontSize: 14, fontWeight: 700,
            background: "var(--primary)", color: "#fff", textDecoration: "none",
          }}
          onClick={() => setTimeout(onClose, 400)}
        >
          <Download size={15} /> 부여 내역 다운로드
        </a>
      </DialogContent>
    </Dialog>
  );
}
