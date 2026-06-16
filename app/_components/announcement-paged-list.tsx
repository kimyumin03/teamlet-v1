"use client";

import { useState } from "react";
import type { AnnouncementItem } from "@teamlet/modules/announcement";
import { AnnouncementActions } from "@/components/announcement/announcement-actions";
import { AnnouncementComments } from "@/components/announcement/announcement-comments";

const PAGE_SIZE = 4;

function formatRelative(d: Date) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (diff < 60) return `${diff}분 전`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
  return `${Math.floor(diff / 1440)}일 전`;
}

export function AnnouncementPagedList({
  announcements,
  currentEmployeeId,
}: {
  announcements: AnnouncementItem[];
  currentEmployeeId?: string;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(announcements.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const start = safePage * PAGE_SIZE;
  const shown = announcements.slice(start, start + PAGE_SIZE);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {shown.map((item) => (
        <article key={item.id} className="post">
          <div className="post-h">
            <div className="av">{item.authorName?.slice(-2) ?? "??"}</div>
            <div className="who-block">
              <div className="who">
                {item.authorName}
                <span className="role"> · 공지사항</span>
              </div>
              <div className="meta">{formatRelative(item.createdAt)}</div>
            </div>
            {item.isPinned && <span className="pin">📌 필독</span>}
            {currentEmployeeId === item.authorId && (
              <AnnouncementActions id={item.id} title={item.title} content={item.content} isPinned={item.isPinned} />
            )}
          </div>
          <div className="post-b">
            <h3>{item.title}</h3>
            <div className="text">{item.content}</div>
          </div>
          {currentEmployeeId && (
            <AnnouncementComments
              announcementId={item.id}
              initialCount={item.commentCount}
              currentEmployeeId={currentEmployeeId}
            />
          )}
        </article>
      ))}

      {/* 페이지네이션 — 2페이지 이상이면 노출 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="rounded-md border border-border px-2.5 py-1 text-[12.5px] text-foreground-muted transition-colors hover:bg-background-secondary disabled:opacity-40"
          >
            ‹ 이전
          </button>
          <span className="px-1 font-mono text-[12.5px] text-foreground-muted">
            {safePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="rounded-md border border-border px-2.5 py-1 text-[12.5px] text-foreground-muted transition-colors hover:bg-background-secondary disabled:opacity-40"
          >
            다음 ›
          </button>
        </div>
      )}
    </div>
  );
}
