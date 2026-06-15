"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const TABS = [
  { key: "", label: "전체" },
  { key: "active", label: "재직 중" },
  { key: "resigned", label: "퇴직" },
] as const;

const EMP_TYPES = [
  { value: "", label: "고용형태 전체" },
  { value: "FULL_TIME", label: "정규직" },
  { value: "PART_TIME", label: "파트타임" },
  { value: "CONTRACT", label: "계약직" },
  { value: "INTERN", label: "인턴" },
  { value: "DISPATCH", label: "파견" },
];

export function StatusTabs({ counts }: { counts: Record<string, number> }) {
  const params = useSearchParams();
  const currentStatus = params.get("status") ?? "";
  const currentEmpType = params.get("empType") ?? "";

  function buildHref(overrides: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    return `/members?${next.toString()}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* 상태 탭 */}
      <div className="flex rounded-[8px] border border-border bg-background-secondary p-0.5">
        {TABS.map(({ key, label }) => (
          <Link
            key={key}
            href={buildHref({ status: key, department: params.get("department") ?? "" })}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              currentStatus === key
                ? "bg-background-primary font-medium text-foreground shadow-sm"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            {label}
            {counts[key] !== undefined && (
              <span className={`ml-1.5 text-xs ${currentStatus === key ? "text-foreground-muted" : "text-foreground-subtle"}`}>
                {counts[key]}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* 고용형태 필터 */}
      <select
        value={currentEmpType}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value) next.set("empType", e.target.value);
          else next.delete("empType");
          window.location.href = `/members?${next.toString()}`;
        }}
        className="h-9 rounded-lg border border-border bg-background-primary px-3 text-sm text-foreground focus-visible:outline-none"
      >
        {EMP_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
    </div>
  );
}
