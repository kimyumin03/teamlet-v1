import Link from "next/link";
import type { AnnualLeaveLedger } from "@teamlet/modules/leave";

const MONTH_KR = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

function Num({ v, color }: { v: number; color?: string }) {
  if (v === 0) return <span style={{ color: "var(--fg-subtle)" }}>—</span>;
  return <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color }}>{v > 0 ? `+${v}` : v}일</span>;
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      flex: 1, padding: "14px 16px",
      border: "1px solid var(--border)", borderRadius: 12,
      background: "var(--bg-primary)",
    }}>
      <div style={{ fontSize: 11.5, color: "var(--fg-muted)", fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono)", color: value === 0 ? "var(--fg-subtle)" : color }}>
        {value === 0 ? "없음" : `${value > 0 ? "+" : ""}${value}일`}
      </div>
    </div>
  );
}

export function AnnualDetailTab({
  ledger,
  year,
  currentYear,
}: {
  ledger: AnnualLeaveLedger | null;
  year: number;
  currentYear: number;
}) {
  if (!ledger) {
    return (
      <div className="breakdown" style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ color: "var(--fg-muted)", fontSize: 14 }}>연차 상세 정보를 불러올 수 없어요.</div>
      </div>
    );
  }

  if (!ledger.hasAnnualType) {
    return (
      <div className="breakdown" style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ color: "var(--fg-muted)", fontSize: 14 }}>연차 정보가 없어요.</div>
        <div style={{ color: "var(--fg-subtle)", fontSize: 12.5, marginTop: 6 }}>관리자에게 연차 정책 배정을 요청해 주세요.</div>
      </div>
    );
  }

  const { summary, rows } = ledger;

  return (
    <>
      {/* 연도 네비게이터 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Link href={`/leave?tab=detail&year=${year - 1}`} className="btn-sm btn-sm-ghost">←</Link>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{year}년</span>
        {year < currentYear && (
          <Link href={`/leave?tab=detail&year=${year + 1}`} className="btn-sm btn-sm-ghost">→</Link>
        )}
      </div>

      {/* 요약 카드 4개 */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <SummaryCard label="자동 부여" value={summary.granted} color="var(--success)" />
        <SummaryCard label="소멸" value={summary.expired} color="var(--destructive)" />
        <SummaryCard label="사용" value={summary.used > 0 ? -summary.used : 0} color="var(--warn)" />
        <SummaryCard label="조정" value={summary.adjusted} color="var(--primary)" />
      </div>

      {/* 월별 원장 테이블 */}
      <div className="breakdown" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: 12, color: "var(--fg-muted)" }}>날짜</th>
              <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, fontSize: 12, color: "var(--fg-muted)" }}>자동 부여</th>
              <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, fontSize: 12, color: "var(--fg-muted)" }}>소멸</th>
              <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, fontSize: 12, color: "var(--fg-muted)" }}>사용</th>
              <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, fontSize: 12, color: "var(--fg-muted)" }}>조정</th>
              <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, fontSize: 12, color: "var(--fg-muted)" }}>잔여</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.month}
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: row.isCurrentMonth ? "var(--primary-soft)" : undefined,
                  opacity: row.month > new Date().getMonth() + 1 && year === currentYear ? 0.55 : 1,
                }}
              >
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ fontWeight: row.isCurrentMonth ? 700 : 500 }}>{year}년 {MONTH_KR[row.month - 1]}</span>
                  {row.isHireMonth && (
                    <span style={{
                      marginLeft: 8, fontSize: 10.5, padding: "2px 6px",
                      background: "var(--success-50)", color: "var(--success)",
                      borderRadius: 999, fontWeight: 600,
                    }}>입사월</span>
                  )}
                  {row.isCurrentMonth && (
                    <span style={{
                      marginLeft: 8, fontSize: 10.5, padding: "2px 6px",
                      background: "var(--primary)", color: "white",
                      borderRadius: 999, fontWeight: 600,
                    }}>이번 달</span>
                  )}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  <Num v={row.granted} color="var(--success)" />
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  {row.expired > 0 ? <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--destructive)" }}>-{row.expired}일</span> : <span style={{ color: "var(--fg-subtle)" }}>—</span>}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  {row.used > 0 ? <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--fg-muted)" }}>-{row.used}일</span> : <span style={{ color: "var(--fg-subtle)" }}>—</span>}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  <Num v={row.adjusted} color="var(--primary)" />
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{row.remaining}일</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: "10px 16px", fontSize: 11.5, color: "var(--fg-subtle)", borderTop: "1px solid var(--border)" }}>
          소수점 넷째 자리에서 반올림하여 표기한 결과입니다.
        </div>
      </div>
    </>
  );
}
