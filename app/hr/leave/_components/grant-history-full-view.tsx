"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { Download, ChevronDown } from "lucide-react";
import { listLeaveGrantHistoryAction } from "@/lib/actions/leave";
import type { LeaveGrantHistoryRow, LeaveTypeItem } from "@teamlet/modules/leave";
import { GrantDownloadModal } from "./grant-download-modal";

function fmtDate(d: Date | string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}. ${dt.getMonth() + 1}. ${dt.getDate()}.`;
}
function fmtDateTime(d: Date | string) {
  const dt = new Date(d);
  const h = dt.getHours();
  const m = String(dt.getMinutes()).padStart(2, "0");
  return `${fmtDate(dt)} ${h >= 12 ? "오후" : "오전"} ${h % 12 || 12}:${m}`;
}

type ViewMode = "by-grant" | "by-employee";
type Employee = { id: string; name: string; departmentName?: string | null };

export function GrantHistoryFullView({
  initialRows,
  leaveTypes,
  employees,
  currentYear,
}: {
  initialRows: LeaveGrantHistoryRow[];
  leaveTypes: LeaveTypeItem[];
  employees: Employee[];
  currentYear: number;
}) {
  const [rows, setRows] = useState<LeaveGrantHistoryRow[]>(initialRows);
  const [viewMode, setViewMode] = useState<ViewMode>("by-grant");
  const [filterYear, setFilterYear] = useState<number | "all">(currentYear);
  const [filterLeaveTypeId, setFilterLeaveTypeId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const years = [currentYear, currentYear - 1, currentYear - 2];

  function reload(year: number | "all", ltId?: string) {
    startTransition(async () => {
      const res = await listLeaveGrantHistoryAction(
        year === "all" ? {} : { year, ...(ltId ? { leaveTypeId: ltId } : {}) },
      );
      if (res.ok) setRows(res.data);
    });
  }

  function changeYear(y: number | "all") {
    setFilterYear(y);
    reload(y, filterLeaveTypeId || undefined);
  }

  function changeLeaveType(ltId: string) {
    setFilterLeaveTypeId(ltId);
    reload(filterYear, ltId || undefined);
  }

  const filtered = useMemo(() => {
    if (!filterLeaveTypeId) return rows;
    const type = leaveTypes.find((t) => t.id === filterLeaveTypeId);
    if (!type) return rows;
    return rows.filter((r) => r.leaveTypeName === type.name);
  }, [rows, filterLeaveTypeId, leaveTypes]);

  const allSelected = filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((r) => r.id)));
  }
  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const chipCls = (active: boolean) =>
    `rounded-full border px-3 py-1 text-[12px] font-semibold cursor-pointer transition-colors ${
      active
        ? "border-foreground bg-foreground text-background"
        : "border-border text-foreground-muted hover:bg-background-secondary"
    }`;

  return (
    <div className="page-body">
      {/* 브레드크럼 */}
      <div style={{ fontSize: 12.5, color: "var(--fg-subtle)", marginBottom: 8 }}>
        <Link href="/hr/leave" style={{ color: "var(--fg-muted)", textDecoration: "none" }}>
          휴가 보유 현황
        </Link>
        <span style={{ margin: "0 6px" }}>›</span>
        <span style={{ color: "var(--fg)" }}>맞춤 휴가 부여 내역</span>
      </div>

      {/* 헤더 */}
      <div className="page-h">
        <div>
          <h1 className="h-title">맞춤 휴가 부여 내역</h1>
          <div className="h-sub">부여 및 회수 내역을 확인할 수 있어요.</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setDownloadOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)",
              background: "var(--bg-primary)", fontSize: 13, fontWeight: 600,
              color: "var(--fg-muted)", cursor: "pointer",
            }}
          >
            <Download size={14} /> 다운로드
          </button>

          {/* 일괄 변경 ▾ */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setBulkOpen((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 12px", borderRadius: 8,
                border: "1px solid var(--primary)",
                background: "var(--primary)", fontSize: 13, fontWeight: 600,
                color: "#fff", cursor: "pointer",
              }}
            >
              일괄 변경 <ChevronDown size={13} />
            </button>
            {bulkOpen && viewMode === "by-grant" && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 50,
                background: "var(--bg-primary)", border: "1px solid var(--border)",
                borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", padding: "4px 0", minWidth: 200,
              }}>
                <div style={{ padding: "8px 12px", fontSize: 11.5, color: "var(--fg-subtle)" }}>
                  일괄 변경은 대상자별 내역에서만 가능해요.
                </div>
              </div>
            )}
            {bulkOpen && viewMode === "by-employee" && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 50,
                background: "var(--bg-primary)", border: "1px solid var(--border)",
                borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", padding: "4px 0", minWidth: 180,
              }}>
                <button
                  type="button"
                  onClick={() => { setBulkOpen(false); }}
                  style={{
                    width: "100%", textAlign: "left", padding: "8px 14px",
                    fontSize: 13, background: "none", border: "none",
                    cursor: "pointer", color: "var(--fg)",
                  }}
                >
                  📅 사용 기간 변경
                </button>
                <button
                  type="button"
                  onClick={() => { setBulkOpen(false); }}
                  style={{
                    width: "100%", textAlign: "left", padding: "8px 14px",
                    fontSize: 13, background: "none", border: "none",
                    cursor: "pointer", color: "var(--fg)",
                  }}
                >
                  ↩ 회수 — 잔여 시간이 있는 휴가만 회수해요.
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 필터 바 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {/* 연도 */}
        <div style={{ display: "flex", gap: 4 }}>
          {years.map((y) => (
            <button key={y} type="button" onClick={() => changeYear(y)} className={chipCls(filterYear === y)}>
              {y}년
            </button>
          ))}
          <button type="button" onClick={() => changeYear("all")} className={chipCls(filterYear === "all")}>
            전체
          </button>
        </div>

        {/* 휴가 종류 */}
        <select
          value={filterLeaveTypeId}
          onChange={(e) => changeLeaveType(e.target.value)}
          style={{
            borderRadius: 999, border: "1px solid var(--border)", background: "var(--bg-primary)",
            padding: "4px 12px", fontSize: 12, color: "var(--fg-muted)", cursor: "pointer",
          }}
        >
          <option value="">휴가 종류 · 전체</option>
          {leaveTypes.filter((t) => t.key !== "annual").map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--fg-subtle)", fontVariantNumeric: "tabular-nums" }}>
          {isPending ? "불러오는 중…" : `총 ${filtered.length}건`}
        </span>
      </div>

      {/* 뷰 토글 */}
      <div style={{ display: "flex", gap: 0, marginBottom: 12, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", width: "fit-content" }}>
        {(["by-grant", "by-employee"] as ViewMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setViewMode(m); setSelectedIds(new Set()); setBulkOpen(false); }}
            style={{
              padding: "6px 16px", fontSize: 12.5, fontWeight: 600, border: "none", cursor: "pointer",
              background: viewMode === m ? "var(--fg)" : "var(--bg-primary)",
              color: viewMode === m ? "var(--bg-primary)" : "var(--fg-muted)",
            }}
          >
            {m === "by-grant" ? "부여건별" : "대상자별"}
          </button>
        ))}
      </div>

      {/* 테이블 — 부여건별 */}
      {viewMode === "by-grant" && (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background-secondary text-left">
                <th className="px-4 py-2.5 text-[11.5px] font-medium text-foreground-subtle">부여 대상자</th>
                <th className="px-4 py-2.5 text-[11.5px] font-medium text-foreground-subtle">휴가 종류</th>
                <th className="px-4 py-2.5 text-[11.5px] font-medium text-foreground-subtle">부여자 · 부여 일시</th>
                <th className="px-4 py-2.5 text-right text-[11.5px] font-medium text-foreground-subtle">일수</th>
                <th className="px-4 py-2.5 text-[11.5px] font-medium text-foreground-subtle">구분</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[13px] text-foreground-muted">
                    부여 내역이 없어요.
                  </td>
                </tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="hover:bg-background-secondary/40 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-foreground">{r.employeeName}</td>
                  <td className="px-4 py-2.5 text-foreground">{r.leaveTypeName}</td>
                  <td className="px-4 py-2.5 text-foreground-muted text-[12px]">
                    {r.actorName ?? "자동 부여"} · {fmtDateTime(r.occurredAt)}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono font-semibold ${r.days < 0 ? "text-destructive-600" : "text-foreground"}`}>
                    {r.days > 0 ? "+" : ""}{r.days}일
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${
                      r.txType === "ADJUST" ? "border-border text-foreground-muted" : "border-primary/30 text-primary"
                    }`}>
                      {r.txType === "GRANT" ? "부여" : "조정"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 테이블 — 대상자별 */}
      {viewMode === "by-employee" && (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background-secondary text-left">
                <th className="px-3 py-2.5">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    className="h-3.5 w-3.5 rounded border-border" />
                </th>
                <th className="px-3 py-2.5 text-[11.5px] font-medium text-foreground-subtle">부여 대상자</th>
                <th className="px-3 py-2.5 text-[11.5px] font-medium text-foreground-subtle">휴가 종류</th>
                <th className="px-3 py-2.5 text-[11.5px] font-medium text-foreground-subtle">사용 가능 기간</th>
                <th className="px-3 py-2.5 text-[11.5px] font-medium text-foreground-subtle">휴가 상태</th>
                <th className="px-3 py-2.5 text-right text-[11.5px] font-medium text-foreground-subtle">부여</th>
                <th className="px-3 py-2.5 text-[11.5px] font-medium text-foreground-subtle">부여자 · 부여 일시</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[13px] text-foreground-muted">
                    부여 내역이 없어요.
                  </td>
                </tr>
              ) : filtered.map((r) => (
                <tr key={r.id}
                  className={`hover:bg-background-secondary/40 transition-colors ${selectedIds.has(r.id) ? "bg-primary/5" : ""}`}
                >
                  <td className="px-3 py-2.5">
                    <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleRow(r.id)}
                      className="h-3.5 w-3.5 rounded border-border" />
                  </td>
                  <td className="px-3 py-2.5 font-medium text-foreground">{r.employeeName}</td>
                  <td className="px-3 py-2.5 text-foreground">{r.leaveTypeName}</td>
                  <td className="px-3 py-2.5 text-[12px] text-foreground-muted">
                    언제든 사용 가능
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10.5px] font-semibold text-foreground-muted">
                      {r.days > 0 ? "미사용" : "조정"}
                    </span>
                  </td>
                  <td className={`px-3 py-2.5 text-right font-mono font-semibold ${r.days < 0 ? "text-destructive-600" : "text-foreground"}`}>
                    {r.days > 0 ? "+" : ""}{r.days}일
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-foreground-muted">
                    {r.actorName ?? "자동 부여"} · {fmtDate(r.occurredAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div style={{
          marginTop: 12, padding: "8px 14px", borderRadius: 10,
          background: "var(--bg-secondary)", border: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 10,
          fontSize: 12.5, color: "var(--fg-muted)",
        }}>
          {selectedIds.size}건 선택됨
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            style={{ fontSize: 12, color: "var(--primary)", background: "none", border: "none", cursor: "pointer" }}
          >
            선택 해제
          </button>
        </div>
      )}

      <GrantDownloadModal
        open={downloadOpen}
        onClose={() => setDownloadOpen(false)}
        employees={employees}
        leaveTypes={leaveTypes}
      />
    </div>
  );
}
