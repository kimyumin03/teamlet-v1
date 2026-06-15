import type { LeaveBalanceSummary } from "@teamlet/modules/leave";

function BreakdownBar({ used, total }: { used: number; total: number }) {
  const usedPct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const remaining = Math.max(0, total - used);
  return (
    <div>
      <div className="flex h-[10px] overflow-hidden rounded-full bg-background-tertiary">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${usedPct}%` }} />
      </div>
      <div className="mt-2 flex gap-4 text-[12px] text-foreground-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-primary" />
          사용 <b className="font-semibold text-foreground">{used}일</b>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-background-tertiary" />
          잔여 <b className="font-semibold text-foreground">{remaining}일</b>
        </span>
      </div>
    </div>
  );
}

function TypeCard({ b }: { b: LeaveBalanceSummary }) {
  const total = b.grantedDays + b.adjustedDays;
  const isExhausted = b.remainingDays <= 0 && total > 0;
  const isLow = !isExhausted && b.remainingDays <= 3 && b.remainingDays > 0;

  return (
    <div
      className={`rounded-[10px] border px-3.5 py-3 ${
        isExhausted
          ? "border-destructive/30 bg-destructive/5"
          : isLow
          ? "border-amber-200 bg-amber-50/40"
          : "border-border bg-background-primary"
      }`}
    >
      <p className="text-[12.5px] font-semibold text-foreground">{b.leaveTypeName}</p>
      <p
        className={`mt-0.5 text-[18px] font-bold tabular-nums leading-tight ${
          isExhausted ? "text-destructive" : isLow ? "text-amber-700" : "text-foreground"
        }`}
      >
        {b.remainingDays}
        <small className="ml-1 text-[11px] font-normal text-foreground-muted">
          / {total}일
        </small>
      </p>
      <p className="mt-0.5 font-mono text-[11px] text-foreground-muted">
        {isExhausted
          ? "소진 완료"
          : isLow
          ? `소진 임박 · 사용 ${b.usedDays}일`
          : `사용 ${b.usedDays}일`}
        {b.adjustedDays !== 0 && ` · 조정 ${b.adjustedDays > 0 ? "+" : ""}${b.adjustedDays}`}
      </p>
    </div>
  );
}

export function BalanceSection({
  balances,
  year,
}: {
  balances: LeaveBalanceSummary[];
  year: number;
}) {
  const annual = balances.find((b) => b.leaveTypeKey === "annual");
  const others = balances.filter((b) => b.leaveTypeKey !== "annual");
  const annualTotal = annual ? annual.grantedDays + annual.adjustedDays : 0;

  if (balances.length === 0) {
    return (
      <div className="rounded-[14px] border border-border bg-background-primary p-8 text-center">
        <p className="text-[14px] font-medium text-foreground">부여된 휴가가 없어요</p>
        <p className="mt-1 text-[12.5px] text-foreground-muted">관리자에게 연차 부여를 요청해 주세요</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 연간 사용 현황 분석 바 */}
      {annual && (
        <div className="rounded-[14px] border border-border bg-background-primary px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-foreground">연간 사용 현황</h3>
            <span className="font-mono text-[12px] text-foreground-muted">
              {year}. 1. 1 — {year}. 12. 31
            </span>
          </div>
          <BreakdownBar used={annual.usedDays} total={annualTotal} />
        </div>
      )}

      {/* 휴가 종류별 잔여 */}
      <div>
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-foreground-muted">
          휴가 종류별 잔여
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {annual && <TypeCard b={annual} />}
          {others.map((b) => (
            <TypeCard key={b.leaveTypeId} b={b} />
          ))}
        </div>
      </div>
    </div>
  );
}
