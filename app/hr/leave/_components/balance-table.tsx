import { Fragment } from "react";
import type { CompanyLeaveBalanceRow } from "@teamlet/modules/leave";

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function num(n: number) {
  return n === 0 ? <span className="text-foreground-subtle">0</span> : n;
}

export function BalanceTable({
  rows,
}: {
  rows: CompanyLeaveBalanceRow[];
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-center">
        <p className="text-sm font-medium text-foreground">구성원 데이터가 없어요</p>
        <p className="text-xs text-foreground-muted">활성 구성원과 휴가 유형을 먼저 설정해 주세요</p>
      </div>
    );
  }

  const leaveTypes = rows[0]?.balances ?? [];

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-background-secondary">
            <th className="px-4 py-3 text-left text-xs font-medium text-foreground-muted whitespace-nowrap">이름</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-foreground-muted whitespace-nowrap">사번</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-foreground-muted whitespace-nowrap">부서</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-foreground-muted whitespace-nowrap">직책</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-foreground-muted whitespace-nowrap">입사일</th>
            {leaveTypes.map((lt) => (
              <th
                key={lt.leaveTypeId}
                colSpan={3}
                className="px-4 py-3 text-center text-xs font-medium text-foreground-muted whitespace-nowrap border-l border-border"
              >
                {lt.leaveTypeName}
              </th>
            ))}
          </tr>
          <tr className="border-b border-border bg-background-secondary">
            <th colSpan={5} />
            {leaveTypes.map((lt) => (
              <Fragment key={lt.leaveTypeId}>
                <th className="px-3 py-2 text-center text-xs text-foreground-subtle border-l border-border">부여</th>
                <th className="px-3 py-2 text-center text-xs text-foreground-subtle">사용</th>
                <th className="px-3 py-2 text-center text-xs text-foreground-subtle">잔여</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.employeeId} className="hover:bg-background-secondary/50 transition-colors">
              <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{row.employeeName}</td>
              <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">{row.employeeNumber ?? "—"}</td>
              <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">{row.departmentName ?? "—"}</td>
              <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">{row.positionName ?? "—"}</td>
              <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">{fmtDate(row.hireDate)}</td>
              {row.balances.map((bal) => (
                <Fragment key={`${row.employeeId}-${bal.leaveTypeId}`}>
                  <td className="px-3 py-3 text-center tabular-nums text-foreground-muted border-l border-border whitespace-nowrap">
                    {num(bal.grantedDays + bal.adjustedDays)}
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums text-foreground-muted whitespace-nowrap">
                    {num(bal.usedDays)}
                  </td>
                  <td className={`px-3 py-3 text-center tabular-nums font-medium whitespace-nowrap ${bal.remainingDays <= 3 && bal.remainingDays > 0 ? "text-amber-600" : bal.remainingDays <= 0 && bal.grantedDays > 0 ? "text-destructive-600" : "text-foreground"}`}>
                    {num(bal.remainingDays)}
                  </td>
                </Fragment>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
