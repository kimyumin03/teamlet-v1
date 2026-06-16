"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { NotificationItem } from "@teamlet/modules/notification";
import { markReadAction, markAllReadAction } from "@/lib/actions/notification";

const CATEGORY_COLOR: Record<string, string> = {
  APPROVAL:       "bg-blue-500",
  LEAVE:          "bg-success-500",
  HR:             "bg-blue-700",
  ANNOUNCEMENT:   "bg-warning-500",
  SYSTEM_SECURITY:"bg-destructive-600",
};

const CATEGORY_LABEL: Record<string, string> = {
  APPROVAL:       "결재",
  LEAVE:          "휴가",
  HR:             "HR",
  ANNOUNCEMENT:   "공지",
  SYSTEM_SECURITY:"보안",
};

export function NotificationBell({
  items,
  unreadCount: initialUnreadCount,
}: {
  items: NotificationItem[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [liveCount, setLiveCount] = useState(initialUnreadCount);
  // 패널에 표시할 항목 — 읽지 않은 것만, 확인 시 즉시 제거
  const [displayItems, setDisplayItems] = useState<NotificationItem[]>(
    () => items.filter((i) => !i.isRead),
  );
  const ref = useRef<HTMLDivElement>(null);

  // SSE 구독 — /api/notifications/stream 이 없으면 onerror 로 조용히 닫힘(안전 degrade)
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/notifications/stream");
      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data) as { unreadCount: number };
          setLiveCount(payload.unreadCount);
        } catch { /* SSE 파싱 실패는 무시 */ }
      };
      es.onerror = () => es?.close();
    } catch { /* EventSource 미지원/엔드포인트 없음 — 무시 */ }
    return () => es?.close();
  }, []);

  // 서버 데이터 갱신 시 동기화
  useEffect(() => {
    setLiveCount(initialUnreadCount);
    setDisplayItems(items.filter((i) => !i.isRead));
  }, [items, initialUnreadCount]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // 단건 확인 (이동 없이 읽음 처리)
  function handleConfirm(id: string) {
    setDisplayItems((prev) => prev.filter((i) => i.id !== id));
    setLiveCount((c) => Math.max(0, c - 1));
    startTransition(async () => {
      await markReadAction(id);
      router.refresh();
    });
  }

  // 단건 클릭 (읽음 + 이동)
  function handleClick(id: string, deepLink: string | null) {
    setDisplayItems((prev) => prev.filter((i) => i.id !== id));
    setLiveCount((c) => Math.max(0, c - 1));
    setOpen(false);
    startTransition(async () => {
      await markReadAction(id);
      router.refresh();
      if (deepLink) router.push(deepLink);
    });
  }

  // 모두 확인
  function handleMarkAllRead() {
    setDisplayItems([]);
    setLiveCount(0);
    startTransition(async () => {
      await markAllReadAction();
      router.refresh();
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-2 text-foreground-muted hover:bg-background-secondary"
        aria-label="알림"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {liveCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-white">
            {liveCount > 9 ? "9+" : liveCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-lg border border-border bg-background-primary shadow-lg">
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-sm font-medium text-foreground">
              알림 {displayItems.length > 0 && <span className="text-xs text-foreground-subtle">({displayItems.length})</span>}
            </span>
            {displayItems.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="text-xs text-foreground-muted hover:text-foreground disabled:opacity-50"
              >
                모두 확인
              </button>
            )}
          </div>

          {/* 알림 목록 */}
          <div className="max-h-80 overflow-y-auto">
            {displayItems.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-foreground-muted">새 알림이 없어요</p>
            ) : (
              displayItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 border-b border-border/50 px-4 py-3 last:border-0 hover:bg-background-secondary"
                >
                  {/* 카테고리 배지 */}
                  <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${CATEGORY_COLOR[item.category] ?? "bg-border"}`}>
                    {CATEGORY_LABEL[item.category] ?? item.category}
                  </span>
                  {/* 알림 내용 — 클릭 시 이동 + 확인 */}
                  <button
                    onClick={() => handleClick(item.id, item.deepLink)}
                    disabled={isPending}
                    className="min-w-0 flex-1 text-left disabled:opacity-50"
                  >
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="truncate text-xs text-foreground-muted">{item.body}</p>
                    <p className="mt-0.5 text-xs text-foreground-subtle">
                      {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                    </p>
                  </button>
                  {/* 단건 확인 버튼 (이동 없이 읽음만) */}
                  <button
                    onClick={() => handleConfirm(item.id)}
                    disabled={isPending}
                    title="확인"
                    className="shrink-0 rounded p-1 text-foreground-subtle hover:bg-background-secondary hover:text-foreground disabled:opacity-50"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
