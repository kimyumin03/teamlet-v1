"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import type { MonthlyAnnualUsageRow } from "@teamlet/modules/leave";
import { UsageUploadModal } from "./usage-upload-modal";

const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

function fmt(n: number) {
  if (n === 0) return <span style={{ color: "var(--fg-subtle)" }}>—</span>;
  return <span>{n.toFixed(1)}</span>;
}

function fmtDate(d: Date | null) {
  if (!d) return "—";
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}

export function MonthlyAnnualTable({ rows }: { rows: MonthlyAnnualUsageRow[] }) {
  const [uploadOpen, setUploadOpen] = useState(false);

  const emptyContent = rows.length === 0 ? (
    <div style={{ padding: "60px 20px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "14px", color: "var(--fg-muted)" }}>
      <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--fg)", marginBottom: "6px" }}>연차 사용 내역이 없어요</div>
      <div style={{ fontSize: "12.5px" }}>이 해에 연차를 사용한 구성원이 없어요</div>
    </div>
  ) : null;

  return (
    <>
      {/* 탭 내부 헤더 */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "6px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: "var(--primary)", color: "#fff", border: "none", cursor: "pointer",
          }}
        >
          <Upload size={13} /> 연차 사용 내역 업로드
        </button>
      </div>

      {emptyContent ?? (
      <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th style={TH}>이름</th>
            <th style={TH}>사번</th>
            <th style={TH}>입사일</th>
            <th style={{ ...TH, textAlign: "right" }}>잔여</th>
            {MONTHS.map((m) => (
              <th key={m} style={{ ...TH, textAlign: "right", minWidth: "44px" }}>{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.employeeId} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={TD}>{row.employeeName}</td>
              <td style={{ ...TD, color: "var(--fg-muted)" }}>{row.employeeNumber ?? "—"}</td>
              <td style={{ ...TD, color: "var(--fg-muted)" }}>{fmtDate(row.hireDate)}</td>
              <td style={{ ...TD, textAlign: "right", fontWeight: 600,
                color: row.remainingDays <= 0 ? "var(--destructive)" : row.remainingDays <= 3 ? "#d97706" : "var(--fg)" }}>
                {row.remainingDays.toFixed(1)}일
              </td>
              {row.monthlyUsage.map((v, i) => (
                <td key={i} style={{ ...TD, textAlign: "right" }}>{fmt(v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
      )}

      <UsageUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </>
  );
}

const TH: React.CSSProperties = {
  padding: "8px 12px",
  fontWeight: 600,
  textAlign: "left",
  color: "var(--fg-muted)",
  whiteSpace: "nowrap",
  fontSize: "12px",
};

const TD: React.CSSProperties = {
  padding: "10px 12px",
  whiteSpace: "nowrap",
};
