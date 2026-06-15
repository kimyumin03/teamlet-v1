"use client";

import { useState, useTransition } from "react";
import { History } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@teamlet/ui";
import { listLeaveGrantHistoryAction } from "@/lib/actions/leave";
import type { LeaveGrantHistoryRow } from "@teamlet/modules/leave";

const TX_LABEL: Record<string, string> = { GRANT: "부여", ADJUST: "조정" };

function fmtDateTime(d: Date | string): string {
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}

export function GrantHistoryButton({ year }: { year: number }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<LeaveGrantHistoryRow[]>([]);
  const [filterYear, setFilterYear] = useState<number | "all">(year);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function load(y: number | "all") {
    setError(null);
    startTransition(async () => {
      const res = await listLeaveGrantHistoryAction(y === "all" ? {} : { year: y });
      if (res.ok) setRows(res.data);
      else setError(res.error?.message ?? "조회에 실패했어요");
    });
  }

  function handleOpen(o: boolean) {
    setOpen(o);
    if (o) load(filterYear);
  }

  function changeYear(y: number | "all") {
    setFilterYear(y);
    load(y);
  }

  const years = [year, year - 1, year - 2];

  return (
    <>
      <Button variant="secondary" onClick={() => handleOpen(true)}>
        <History className="mr-1 h-3.5 w-3.5" />
        부여 내역
      </Button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>부여·조정 내역</DialogTitle>
          </DialogHeader>

          {/* 연도 필터 */}
          <div className="flex items-center gap-1.5">
            {years.map((y) => (
              <button key={y} type="button" onClick={() => changeYear(y)}
                className={`rounded-md border px-2.5 py-1 text-[12.5px] transition-colors ${
                  filterYear === y ? "border-foreground bg-foreground text-background" : "border-border text-foreground-muted hover:bg-background-secondary"
                }`}>
                {y}
              </button>
            ))}
            <button type="button" onClick={() => changeYear("all")}
              className={`rounded-md border px-2.5 py-1 text-[12.5px] transition-colors ${
                filterYear === "all" ? "border-foreground bg-foreground text-background" : "border-border text-foreground-muted hover:bg-background-secondary"
              }`}>
              전체
            </button>
            <span className="ml-auto text-[11.5px] text-foreground-subtle">최근 300건</span>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {error ? (
              <p className="py-8 text-center text-[13px] text-destructive-600">{error}</p>
            ) : isPending ? (
              <p className="py-8 text-center text-[13px] text-foreground-muted">불러오는 중…</p>
            ) : rows.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-foreground-muted">부여·조정 내역이 없어요.</p>
            ) : (
              <table className="w-full border-collapse text-[12.5px]">
                <thead className="sticky top-0 bg-background-secondary">
                  <tr className="text-left text-foreground-muted">
                    <th className="px-2.5 py-2 font-semibold">일자</th>
                    <th className="px-2.5 py-2 font-semibold">대상자</th>
                    <th className="px-2.5 py-2 font-semibold">휴가 종류</th>
                    <th className="px-2.5 py-2 font-semibold">구분</th>
                    <th className="px-2.5 py-2 text-right font-semibold">일수</th>
                    <th className="px-2.5 py-2 font-semibold">사유</th>
                    <th className="px-2.5 py-2 font-semibold">처리자</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="whitespace-nowrap px-2.5 py-2 font-mono text-foreground-muted">{fmtDateTime(r.occurredAt)}</td>
                      <td className="px-2.5 py-2 font-medium text-foreground">{r.employeeName}</td>
                      <td className="px-2.5 py-2 text-foreground">{r.leaveTypeName}</td>
                      <td className="px-2.5 py-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${
                          r.txType === "ADJUST" ? "border-border text-foreground-muted" : "border-primary/30 text-primary"
                        }`}>
                          {TX_LABEL[r.txType] ?? r.txType}
                        </span>
                      </td>
                      <td className={`whitespace-nowrap px-2.5 py-2 text-right font-mono font-semibold ${
                        r.days < 0 ? "text-destructive-600" : "text-foreground"
                      }`}>
                        {r.days > 0 ? "+" : ""}{r.days}일
                      </td>
                      <td className="max-w-[180px] truncate px-2.5 py-2 text-foreground-muted" title={r.reason}>{r.reason}</td>
                      <td className="whitespace-nowrap px-2.5 py-2 text-foreground-subtle">{r.actorName ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
