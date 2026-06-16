"use client";

// 문서 추가 모달 — 원본 components/document/add-document-button.tsx.
// ⚠️ v1 에는 파일 업로드 인프라(uploadFile/upload-client)가 없어요 → 원본의 파일 업로드 대신
//    파일 URL 직접 입력으로 대체(증명서 템플릿 매니저와 동일 패턴). 나머지 동작은 동일해요.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button, Dialog, DialogClose, DialogContent,
  DialogFooter, DialogHeader, DialogTitle, Input,
} from "@teamlet/ui";
import { createCompanyDocumentAction } from "@/lib/actions/document";
import type { CompanyDocumentCategory } from "@/lib/modules/document";

const CATEGORIES: { value: CompanyDocumentCategory; label: string }[] = [
  { value: "GENERAL", label: "일반" },
  { value: "NOTICE", label: "공지" },
  { value: "POLICY", label: "정책" },
];

export function AddDocumentButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [category, setCategory] = useState<CompanyDocumentCategory>("GENERAL");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() { setTitle(""); setFileUrl(""); setCategory("GENERAL"); setError(null); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createCompanyDocumentAction({ title, fileUrl, category });
      if (!res.ok) { setError(res.error.message); return; }
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  const selectClass = "h-10 w-full rounded-[8px] border border-border bg-background-primary px-3 text-[13px] text-foreground focus-visible:border-border-focus focus-visible:outline-none";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (isPending) return; if (!o) reset(); setOpen(o); }}>
      <Button variant="secondary" onClick={() => setOpen(true)}>+ 문서 추가</Button>
      <DialogContent>
        <DialogHeader><DialogTitle>문서 추가</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-foreground-muted">제목</label>
            <Input required maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-foreground-muted">분류</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as CompanyDocumentCategory)} className={selectClass}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-foreground-muted">파일 URL</label>
            <Input required type="url" placeholder="https://..." value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
          </div>
          {error && <p role="alert" className="rounded-[14px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary" disabled={isPending}>취소</Button></DialogClose>
            <Button type="submit" disabled={isPending || !title.trim() || !fileUrl.trim()}>
              {isPending ? "추가 중…" : "추가"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
