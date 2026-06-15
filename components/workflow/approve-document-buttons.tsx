"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveDocumentAction, rejectDocumentAction } from "@/lib/actions/workflow";

export function ApproveDocumentButtons({ lineId }: { lineId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "rejecting">("idle");
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    startTransition(async () => {
      await approveDocumentAction(lineId);
      router.refresh();
    });
  }

  function handleReject() {
    startTransition(async () => {
      await rejectDocumentAction(lineId, comment || undefined);
      setMode("idle");
      setComment("");
      router.refresh();
    });
  }

  if (mode === "rejecting") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", minWidth: 220 }}
        onClick={(e) => e.preventDefault()}>
        <input
          autoFocus
          placeholder="반려 사유 (선택)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleReject(); if (e.key === "Escape") setMode("idle"); }}
          disabled={isPending}
          style={{
            width: "100%", padding: "5px 9px", borderRadius: 7,
            border: "1px solid var(--destructive)", outline: "none",
            fontSize: 12, fontFamily: "inherit", background: "var(--bg-primary)", color: "var(--fg)",
          }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setMode("idle")} disabled={isPending}
            className="btn btn-outline sm" style={{ fontSize: 12 }}>취소</button>
          <button onClick={handleReject} disabled={isPending}
            className="btn btn-destructive sm" style={{ fontSize: 12 }}>
            {isPending ? "처리 중…" : "반려 확인"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.preventDefault()}>
      <button
        disabled={isPending}
        onClick={() => setMode("rejecting")}
        className="btn btn-destructive sm"
      >
        반려
      </button>
      <button
        disabled={isPending}
        onClick={handleApprove}
        className="btn btn-success sm"
      >
        {isPending ? "처리 중…" : "승인"}
      </button>
    </div>
  );
}
