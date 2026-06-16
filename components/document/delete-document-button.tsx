"use client";

// 문서 삭제 버튼 — 원본 components/document/delete-document-button.tsx 그대로(import 만 조정).

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCompanyDocumentAction } from "@/lib/actions/document";

export function DeleteDocumentButton({ documentId, title }: { documentId: string; title: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`"${title}" 문서를 삭제할까요?`)) return;
    startTransition(async () => {
      await deleteCompanyDocumentAction(documentId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="shrink-0 rounded px-2 py-1 text-xs text-foreground-muted hover:bg-destructive/5 hover:text-destructive disabled:opacity-50"
    >
      {isPending ? "…" : "삭제"}
    </button>
  );
}
