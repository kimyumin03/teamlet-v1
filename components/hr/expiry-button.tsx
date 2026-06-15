"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@teamlet/ui";
import { processLeaveExpiryAction } from "@/lib/actions/leave";

export function ExpiryButton({ year }: { year: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ expired: number; carriedOver: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRun() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await processLeaveExpiryAction(year);
      if (res.ok) {
        setResult(res.data);
        router.refresh();
      } else {
        setError(res.error?.message ?? "오류가 발생했어요");
      }
    });
  }

  return (
    <>
      <Button variant="secondary" onClick={() => { setResult(null); setError(null); setOpen(true); }}>
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
        연차 소멸·이월 처리
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!isPending) setOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{year}년 연차 소멸·이월 처리</DialogTitle>
          </DialogHeader>

          {result ? (
            <div className="rounded-lg bg-background-secondary px-4 py-3 text-sm">
              <p className="font-medium text-foreground">처리 완료</p>
              <p className="mt-1 text-foreground-muted">소멸 처리: <span className="font-medium text-foreground">{result.expired}건</span></p>
              <p className="text-foreground-muted">이월 처리: <span className="font-medium text-foreground">{result.carriedOver}건</span></p>
            </div>
          ) : (
            <div className="py-1 text-sm text-foreground-muted">
              <p>{year}년 연차 잔여 일수를 소멸·이월 처리합니다.</p>
              <ul className="mt-2 list-disc pl-4 text-xs space-y-1">
                <li>정책의 소멸 기준일이 지난 잔여 일수를 소멸합니다.</li>
                <li>이월 한도 설정 시 해당 일수를 {year + 1}년으로 이월합니다.</li>
                <li>이미 소멸 처리된 항목은 건너뜁니다 (멱등).</li>
              </ul>
              {error && <p className="mt-3 text-[12px] text-destructive">{error}</p>}
            </div>
          )}

          <DialogFooter>
            <Button variant="secondary" disabled={isPending} onClick={() => setOpen(false)}>
              {result ? "닫기" : "취소"}
            </Button>
            {!result && (
              <Button disabled={isPending} onClick={handleRun}>
                {isPending ? "처리 중…" : "처리 시작"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
