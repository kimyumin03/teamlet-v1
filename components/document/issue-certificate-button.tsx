"use client";

// 증명서 발급 모달 — 원본 components/document/issue-certificate-button.tsx 그대로(import 만 조정).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button, Dialog, DialogClose, DialogContent,
  DialogFooter, DialogHeader, DialogTitle, Input,
} from "@teamlet/ui";
import { issueCertificateAction } from "@/lib/actions/document";
import type { CertificateTemplateItem } from "@/lib/modules/document";

export function IssueCertificateButton({
  employees,
  selfEmployeeId,
  templates,
}: {
  employees: { id: string; name: string }[];
  selfEmployeeId: string;
  templates: CertificateTemplateItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState(selfEmployeeId);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setEmployeeId(selfEmployeeId);
    setTemplateId(templates[0]?.id ?? "");
    setPurpose("");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!templateId) return;
    setError(null);
    startTransition(async () => {
      const res = await issueCertificateAction({ employeeId, templateId, purpose });
      if (!res.ok) { setError(res.error.message); return; }
      reset();
      setOpen(false);
      router.refresh();
      // 발급 직후 파일 새 탭 열기
      if (res.data.fileUrl) window.open(res.data.fileUrl, "_blank", "noopener,noreferrer");
    });
  }

  const selectClass = "h-10 w-full rounded-[8px] border border-border bg-background-primary px-3 text-[13px] text-foreground focus-visible:border-border-focus focus-visible:outline-none";

  if (templates.length === 0) {
    return (
      <Button variant="secondary" disabled title="관리자가 증명서 종류를 먼저 등록해야 해요">
        + 발급 신청
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (isPending) return; if (!o) reset(); setOpen(o); }}>
      <Button variant="secondary" onClick={() => setOpen(true)}>+ 발급 신청</Button>
      <DialogContent>
        <DialogHeader><DialogTitle>증명서 발급</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 관리자만 타인 선택 가능 */}
          {employees.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] text-foreground-muted">대상 직원</label>
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={selectClass}>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}{emp.id === selfEmployeeId ? " (나)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-foreground-muted">증명서 종류</label>
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={selectClass}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-foreground-muted">발급 목적</label>
            <Input required maxLength={100} placeholder="예: 금융기관 제출용" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </div>
          {error && <p role="alert" className="rounded-[14px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary" disabled={isPending}>취소</Button></DialogClose>
            <Button type="submit" disabled={isPending || !purpose.trim() || !templateId}>
              {isPending ? "발급 중…" : "발급"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
