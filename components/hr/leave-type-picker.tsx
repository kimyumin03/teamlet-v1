"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@teamlet/ui";

type LeaveType = { id: string; name: string };

/**
 * 휴가 종류 선택 — 검색 + 스크롤 모달.
 * 종류가 18~19종이라 native select 가 너무 길어지는 문제 해결.
 */
export function LeaveTypePicker({
  leaveTypes,
  value,
  onChange,
  disabled,
  placeholder = "휴가 종류 선택",
}: {
  leaveTypes: LeaveType[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = leaveTypes.find((t) => t.id === value) ?? null;
  const ql = q.trim().toLowerCase();
  const filtered = ql ? leaveTypes.filter((t) => t.name.toLowerCase().includes(ql)) : leaveTypes;

  return (
    <>
      <button
        type="button"
        onClick={() => { if (!disabled) { setQ(""); setOpen(true); } }}
        disabled={disabled}
        className="flex w-full items-center rounded-[8px] border border-border bg-background-primary px-3 py-2 text-left text-[13px] transition-colors hover:border-border-strong disabled:cursor-default disabled:opacity-60"
      >
        <span className={selected ? "text-foreground" : "text-foreground-subtle"}>
          {selected ? selected.name : placeholder}
        </span>
        <span className="ml-auto text-foreground-subtle">›</span>
      </button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) setOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>휴가 종류 선택</DialogTitle>
          </DialogHeader>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="검색"
            className="mb-2 w-full rounded-[8px] border border-border bg-background-primary px-3 py-2 text-[13px] text-foreground outline-none focus:border-foreground-subtle"
          />
          <div className="-mx-1 max-h-[50vh] overflow-y-auto px-1">
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { onChange(t.id); setOpen(false); }}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] transition-colors hover:bg-background-secondary ${
                  t.id === value ? "bg-background-secondary font-medium text-foreground" : "text-foreground"
                }`}
              >
                {t.name}
                {t.id === value && <span className="ml-auto text-[12px] text-primary">✓</span>}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="py-6 text-center text-[12.5px] text-foreground-muted">검색 결과가 없어요</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
