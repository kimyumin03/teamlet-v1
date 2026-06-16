"use client";

import { useState, useTransition, useRef } from "react";
import type { CommentItem } from "@teamlet/modules/announcement";
import {
  listCommentsAction,
  createCommentAction,
  deleteCommentAction,
} from "@/lib/actions/announcement";

function formatRelative(d: Date) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (diff < 1) return "방금";
  if (diff < 60) return `${diff}분 전`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
  return `${Math.floor(diff / 1440)}일 전`;
}

export function AnnouncementComments({
  announcementId,
  initialCount,
  currentEmployeeId,
}: {
  announcementId: string;
  initialCount: number;
  currentEmployeeId: string;
}) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function toggle() {
    if (!open && !loaded) {
      startTransition(async () => {
        const res = await listCommentsAction(announcementId);
        if (res.ok) {
          setComments(res.data);
          setCount(res.data.length);
        }
        setLoaded(true);
        setOpen(true);
      });
    } else {
      setOpen((v) => !v);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setError("");
    startTransition(async () => {
      const res = await createCommentAction(announcementId, text.trim());
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      // 목록 새로고침
      const list = await listCommentsAction(announcementId);
      if (list.ok) {
        setComments(list.data);
        setCount(list.data.length);
      }
      setText("");
    });
  }

  function handleDelete(commentId: string) {
    startTransition(async () => {
      const res = await deleteCommentAction(commentId);
      if (!res.ok) return;
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCount((n) => n - 1);
    });
  }

  return (
    <div className="comment-section">
      <button type="button" className="comment-toggle" onClick={toggle} disabled={isPending}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        댓글 {count > 0 && <span className="comment-count">{count}</span>}
        {isPending && <span style={{ marginLeft: 4, opacity: 0.5, fontSize: 11 }}>...</span>}
      </button>

      {open && (
        <div className="comment-list">
          {loaded && comments.length === 0 && (
            <p className="comment-empty">첫 댓글을 남겨보세요</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="comment-item">
              <div className="comment-av">{c.authorName?.slice(-2) ?? "??"}</div>
              <div className="comment-body">
                <div className="comment-meta">
                  <span className="comment-author">{c.authorName}</span>
                  <span className="comment-time">{formatRelative(c.createdAt)}</span>
                  {c.authorId === currentEmployeeId && (
                    <button
                      type="button"
                      className="comment-delete"
                      onClick={() => handleDelete(c.id)}
                      disabled={isPending}
                    >
                      삭제
                    </button>
                  )}
                </div>
                <p className="comment-text">{c.content}</p>
              </div>
            </div>
          ))}

          <form className="comment-form" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              className="comment-input"
              placeholder="댓글을 입력하세요…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={1}
              maxLength={500}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as unknown as React.FormEvent);
                }
              }}
            />
            <button
              type="submit"
              className="comment-submit"
              disabled={!text.trim() || isPending}
            >
              등록
            </button>
          </form>
          {error && <p className="comment-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
