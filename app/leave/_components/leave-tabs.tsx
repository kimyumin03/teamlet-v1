"use client";

import Link from "next/link";

const TABS = [
  { id: "overview", label: "휴가 개요" },
  { id: "detail", label: "연차 상세" },
  { id: "plan", label: "연차 사용 계획" },
  { id: "history", label: "신청 이력" },
] as const;

export function LeaveTabs({
  activeTab,
  pendingCount,
  year,
}: {
  activeTab: string;
  pendingCount: number;
  year?: number;
}) {
  const yearParam = year ? `&year=${year}` : "";
  return (
    <div className="tabs">
      {TABS.map((t) => (
        <Link
          key={t.id}
          href={`/leave?tab=${t.id}${yearParam}`}
          className={`tab${activeTab === t.id ? " active" : ""}`}
        >
          {t.label}
          {t.id === "history" && pendingCount > 0 && (
            <span className="count">{pendingCount}</span>
          )}
        </Link>
      ))}
    </div>
  );
}
