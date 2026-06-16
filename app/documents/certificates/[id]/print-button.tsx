"use client";

// 증명서 인쇄 버튼 — 원본 certificates/[id]/print-button.tsx 그대로.

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-[8px] border border-border px-4 py-1.5 text-[13px] text-foreground hover:bg-background-secondary transition-colors"
    >
      인쇄하기
    </button>
  );
}
