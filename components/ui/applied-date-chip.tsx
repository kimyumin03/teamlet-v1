"use client";

import * as React from "react";
import { CalendarClock, AlertTriangle, Clock } from "lucide-react";
import { cn } from "./cn";

/**
 * AppliedDateChip (docs/05 §4-1) — 모든 인사 변경 모달 우측 상단.
 * "이 변경이 언제부터 적용되는지" 명시. Flex 대비 과거/미래 시각 차별화.
 */
export type AppliedDateChipProps = {
  value: Date;
  onChange: (date: Date) => void;
  presets?: { label: string; date: Date }[];
  warning?: "retroactive" | "future" | null;
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function defaultPresets(): { label: string; date: Date }[] {
  const today = startOfDay(new Date());
  const tomorrow = startOfDay(new Date(Date.now() + 86400000));
  const nextMonth1 = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    1,
  );
  return [
    { label: "오늘", date: today },
    { label: "내일", date: tomorrow },
    { label: "다음 달 1일", date: nextMonth1 },
  ];
}

function chipLabel(value: Date): string {
  const today = startOfDay(new Date());
  const v = startOfDay(value);
  const diff = Math.round((v.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "적용일 오늘";
  if (diff === 1) return "적용일 내일";
  if (diff === -1) return "적용일 어제";
  return `적용일 ${v.getFullYear()}.${v.getMonth() + 1}.${v.getDate()}`;
}

export function AppliedDateChip({
  value,
  onChange,
  presets,
  warning,
}: AppliedDateChipProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const items = presets ?? defaultPresets();

  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
          "border-warning-200 bg-warning-50 text-warning-800 hover:bg-warning-100",
        )}
      >
        <CalendarClock className="size-3.5" />
        {chipLabel(value)}
        {warning === "retroactive" && (
          <span
            title="소급 적용되어 과거 데이터에 영향"
            className="text-destructive-600"
          >
            <AlertTriangle className="size-3.5" />
          </span>
        )}
        {warning === "future" && (
          <span title="예약 변경" className="text-accent">
            <Clock className="size-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-border bg-background-primary p-3 shadow-md">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {items.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  onChange(startOfDay(p.date));
                  setOpen(false);
                }}
                className="rounded-full bg-background-secondary px-2.5 py-1 text-xs text-foreground-muted hover:bg-slate-200"
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={`${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`}
            onChange={(e) => {
              if (!e.target.value) return;
              onChange(startOfDay(new Date(e.target.value)));
            }}
            className="h-9 w-full rounded-md border border-border bg-background-primary px-2 text-sm text-foreground focus-visible:border-border-focus focus-visible:shadow-focus focus-visible:outline-none"
          />
        </div>
      )}
    </div>
  );
}
