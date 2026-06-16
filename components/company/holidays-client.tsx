"use client";

// 공휴일 관리 클라이언트 — 원본 components/company/holidays-client.tsx 를 그대로 이식.
// import 만 v1 경로(@teamlet/modules/company, @/lib/actions/company)로 조정.

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@teamlet/ui";
import type { HolidayItem } from "@teamlet/modules/company";
import { addCompanyHolidayAction, deleteCompanyHolidayAction, syncStatutoryHolidaysRangeAction } from "@/lib/actions/company";

// 공휴일 데이터 시작 연도 (그 이전은 데이터 없음 → 네비게이션 차단)
const MIN_HOLIDAY_YEAR = 2023;

function formatDate(d: Date): string {
  const dt = new Date(d);
  return dt.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric", weekday: "short" });
}

function formatDateShort(d: Date): string {
  const dt = new Date(d);
  return `${dt.getFullYear()}. ${dt.getMonth() + 1}. ${dt.getDate()}`;
}

export function HolidaysClient({ initialHolidays, year }: { initialHolidays: HolidayItem[]; year: number }) {
  const router = useRouter();
  const [holidays, setHolidays] = useState(initialHolidays);
  useEffect(() => { setHolidays(initialHolidays); }, [initialHolidays]);
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [isNational, setIsNational] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSyncRange() {
    const from = year - 2;
    const to = year + 2;
    setSyncMsg(null);
    setIsSyncing(true);
    startTransition(async () => {
      const res = await syncStatutoryHolidaysRangeAction(from, to);
      setIsSyncing(false);
      if (!res.ok) { setSyncMsg({ kind: "err", text: res.error.message }); return; }
      const { added } = res.data;
      setSyncMsg({
        kind: "ok",
        text: added === 0 ? "법정공휴일이 이미 모두 등록돼 있어요." : `법정공휴일 ${added}건을 등록했어요.`,
      });
      router.refresh();
    });
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await addCompanyHolidayAction({ date, name, isNational });
      if (!res.ok) { setError(res.error.message); return; }
      setDate("");
      setName("");
      setIsNational(false);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteCompanyHolidayAction(id);
      if (!res.ok) { setError(res.error.message); return; }
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    });
  }

  const legalCount = holidays.filter((h) => h.isNational).length;
  const customCount = holidays.filter((h) => !h.isNational).length;

  return (
    <div className="flex flex-col gap-4">
      {/* 공휴일 목록 카드 */}
      <div className="rounded-[14px] border border-border bg-background-primary px-[26px] py-[22px]">
        <div className="mb-1.5 flex items-center gap-2">
          <h3 className="text-[15px] font-bold text-foreground">{year}년 공휴일</h3>
          <span className="text-[12px] font-normal text-foreground-muted">
            법정 {legalCount} · 회사 {customCount}
          </span>
        </div>
        <p className="mb-4 text-[12.5px] text-foreground-muted">
          공공데이터포털 법정공휴일을 연도별로 자동 등록할 수 있어요. 회사 자율 휴일은 직접 추가·삭제 가능해요.
        </p>

        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={year <= MIN_HOLIDAY_YEAR}
            onClick={() => router.push(`/settings/holidays?year=${year - 1}`)}
            className="rounded-md border border-border bg-background-primary px-2.5 py-1 text-[12.5px] text-foreground-muted hover:bg-background-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ‹ {year - 1}
          </button>
          <span className="px-2 font-mono text-[13px] font-semibold text-foreground">{year}</span>
          <button
            type="button"
            onClick={() => router.push(`/settings/holidays?year=${year + 1}`)}
            className="rounded-md border border-border bg-background-primary px-2.5 py-1 text-[12.5px] text-foreground-muted hover:bg-background-secondary transition-colors"
          >
            {year + 1} ›
          </button>
          <div className="ml-auto">
            <Button onClick={handleSyncRange} disabled={isSyncing || isPending}>
              {isSyncing ? "등록 중…" : "공휴일 등록"}
            </Button>
          </div>
        </div>
        {syncMsg && (
          <p
            className={`mb-3 text-[12px] ${syncMsg.kind === "ok" ? "text-foreground-muted" : "text-destructive-600"}`}
            role={syncMsg.kind === "err" ? "alert" : undefined}
          >
            {syncMsg.text}
          </p>
        )}

        {holidays.length === 0 ? (
          <div className="rounded-[10px] border border-border bg-background-secondary py-8 text-center text-[13px] text-foreground-muted">
            {year}년에 등록된 공휴일이 없어요.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {holidays.map((h) => (
              <div
                key={h.id}
                className="grid grid-cols-[120px_1fr_80px_72px] items-center gap-4 py-3"
              >
                <p className="font-mono text-[13px] font-bold text-foreground">
                  {formatDateShort(h.date)}
                </p>
                <div>
                  <p className="text-[13.5px] font-semibold text-foreground">{h.name}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-foreground-muted">
                    {formatDate(h.date)}
                  </p>
                </div>
                <div>
                  {h.isNational ? (
                    <span className="rounded-full border border-destructive/40 bg-destructive/5 px-2.5 py-0.5 text-[10.5px] font-semibold text-destructive">
                      법정
                    </span>
                  ) : (
                    <span className="rounded-full border border-purple-300 bg-purple-50 px-2.5 py-0.5 text-[10.5px] font-semibold text-purple-700">
                      회사
                    </span>
                  )}
                </div>
                <div className="flex justify-end">
                  {!h.isNational && (
                    <button
                      type="button"
                      onClick={() => handleDelete(h.id)}
                      disabled={isPending}
                      className="rounded-md border border-border px-2.5 py-1 text-[12px] text-foreground-muted hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive transition-colors disabled:opacity-50"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 추가 폼 카드 — 목록 위로 (order-first) */}
      <div className="order-first rounded-[14px] border border-border bg-background-primary px-[26px] py-[22px]">
        <h3 className="mb-4 text-[15px] font-bold text-foreground">회사 자율 휴일 추가</h3>
        <form onSubmit={handleAdd}>
          <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground-muted">날짜</label>
              <Input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground-muted">이름</label>
              <Input
                required
                maxLength={50}
                placeholder="예: 회사 창립일"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isPending || !date || !name.trim()}>
              {isPending ? "추가 중…" : "추가"}
            </Button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-[12px] text-destructive">{error}</p>
          )}
        </form>
      </div>
    </div>
  );
}
