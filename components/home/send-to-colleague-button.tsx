"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@teamlet/ui";
import { Megaphone, Star, MessageSquare } from "lucide-react";
import { createAnnouncementAction } from "@/lib/actions/announcement";
import { sendRecognitionAction } from "@/lib/actions/recognition";
import type { RecognitionKindValue } from "@teamlet/modules/recognition";
import { TargetPicker, type PickerEmployee, type PickerDepartment } from "@/components/common/recipient-picker";

const REC_META: Record<RecognitionKindValue, { title: string; emoji: string; subtitle: string; placeholder: string }> = {
  RECOGNITION: {
    title: "인정 메시지 보내기",
    emoji: "⭐",
    subtitle: "동료의 멋진 점을 구체적으로 인정해 주세요. 받는 분에게 큰 힘이 돼요.",
    placeholder: "예: 이번 프로젝트에서 꼼꼼하게 리뷰해 주셔서 큰 도움이 됐어요!",
  },
  FEEDBACK: {
    title: "피드백 보내기",
    emoji: "💬",
    subtitle: "건설적인 피드백을 정중하게 전해 주세요. 받는 분만 확인할 수 있어요.",
    placeholder: "예: 회의 자료가 조금 더 간결하면 전달이 잘 될 것 같아요.",
  },
};

type ActionCard = {
  icon: React.ReactNode;
  label: string;
  desc: string;
  badge?: string;
  onClick: () => void;
};

export function SendToColleagueButton({
  canAnnounce = false,
  employees = [],
  departments = [],
}: {
  canAnnounce?: boolean;
  employees?: PickerEmployee[];
  departments?: PickerDepartment[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // 공지사항 작성 인라인 상태
  const [subMode, setSubMode] = useState<"menu" | "announce" | "recognition">("menu");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 인정·피드백 상태
  const [recKind, setRecKind] = useState<RecognitionKindValue>("RECOGNITION");
  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const recipient = employees.find((e) => e.id === recipientId) ?? null;

  function openModal() {
    setSubMode("menu");
    setTitle(""); setContent(""); setIsPinned(false); setErr(null);
    setRecipientId(""); setMessage("");
    setOpen(true);
  }

  function openRecognition(kind: RecognitionKindValue) {
    setRecKind(kind);
    setRecipientId(""); setMessage(""); setErr(null);
    setSubMode("recognition");
  }

  async function submitAnnouncement() {
    if (!title.trim() || !content.trim()) return;
    setBusy(true);
    setErr(null);
    const res = await createAnnouncementAction({ title, content, isPinned });
    setBusy(false);
    if (res.ok) { setOpen(false); router.refresh(); }
    else setErr(res.error?.message ?? "오류가 발생했어요");
  }

  async function submitRecognition() {
    if (!recipientId || !message.trim()) return;
    setBusy(true);
    setErr(null);
    const res = await sendRecognitionAction({ recipientId, kind: recKind, message });
    setBusy(false);
    if (res.ok) { setOpen(false); router.refresh(); }
    else setErr(res.error?.message ?? "오류가 발생했어요");
  }

  const actions: ActionCard[] = [
    {
      icon: <Megaphone className="h-5 w-5" />,
      label: "공지사항",
      desc: "전 구성원에게 공지를 전달해요",
      badge: canAnnounce ? undefined : "권한 필요",
      onClick: () => { if (canAnnounce) setSubMode("announce"); },
    },
    {
      icon: <Star className="h-5 w-5" />,
      label: "인정 메시지",
      desc: "동료의 멋진 점을 인정해 주세요",
      onClick: () => openRecognition("RECOGNITION"),
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      label: "피드백",
      desc: "건설적인 피드백을 전달해요",
      onClick: () => openRecognition("FEEDBACK"),
    },
  ];

  return (
    <>
      <button className="btn-sm" onClick={openModal}>
        동료에게 전달하기
      </button>

      <Dialog open={open} onOpenChange={(o) => { if (!busy) setOpen(o); }}>
        <DialogContent style={{ maxWidth: 480 }}>
          {subMode === "menu" && (
            <>
              <DialogHeader>
                <DialogTitle>동료에게 전달하기</DialogTitle>
              </DialogHeader>
              <p style={{ fontSize: "13px", color: "var(--fg-muted)", margin: "0 0 16px" }}>
                어떤 내용을 전달할까요?
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {actions.map((a) => (
                  <button
                    key={a.label}
                    onClick={a.onClick}
                    disabled={!!a.badge}
                    style={{
                      display: "flex", alignItems: "center", gap: "14px",
                      padding: "14px 16px", borderRadius: "10px",
                      border: "1px solid var(--border)",
                      background: "var(--bg-primary)",
                      cursor: a.badge ? "default" : "pointer",
                      textAlign: "left", width: "100%",
                      opacity: a.badge ? 0.5 : 1,
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => { if (!a.badge) (e.currentTarget as HTMLElement).style.background = "var(--bg-secondary)"; }}
                    onMouseLeave={(e) => { if (!a.badge) (e.currentTarget as HTMLElement).style.background = "var(--bg-primary)"; }}
                  >
                    <span style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 38, height: 38, borderRadius: "9px",
                      background: "var(--bg-secondary)", color: "var(--fg)",
                      flexShrink: 0,
                    }}>
                      {a.icon}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--fg)", display: "flex", alignItems: "center", gap: "6px" }}>
                        {a.label}
                        {a.badge && (
                          <span style={{
                            fontSize: "10px", padding: "1px 6px", borderRadius: "4px",
                            border: "1px solid var(--border)", color: "var(--fg-muted)",
                          }}>
                            {a.badge}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--fg-muted)", marginTop: "2px" }}>{a.desc}</div>
                    </div>
                    {!a.badge && (
                      <span style={{ fontSize: "14px", color: "var(--fg-subtle)" }}>→</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {subMode === "announce" && (
            <>
              <DialogHeader>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    onClick={() => setSubMode("menu")}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-muted)", fontSize: "13px", padding: 0 }}
                  >
                    ← 뒤로
                  </button>
                  <DialogTitle>공지사항 작성</DialogTitle>
                </div>
              </DialogHeader>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", paddingTop: "4px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--fg-muted)" }}>제목</label>
                  <input
                    className="w-full rounded-[8px] border border-border bg-background-primary px-3 py-2 text-[13px] text-foreground placeholder:text-foreground-subtle outline-none focus:border-foreground-subtle transition-colors"
                    placeholder="공지사항 제목"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                    disabled={busy}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--fg-muted)" }}>내용</label>
                  <textarea
                    className="w-full rounded-[8px] border border-border bg-background-primary px-3 py-2 text-[13px] text-foreground placeholder:text-foreground-subtle outline-none focus:border-foreground-subtle transition-colors resize-none"
                    placeholder="공지 내용을 입력해 주세요"
                    rows={5}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={busy}
                  />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <div
                    onClick={() => setIsPinned((p) => !p)}
                    style={{
                      width: 16, height: 16, borderRadius: 4, border: "1.5px solid",
                      borderColor: isPinned ? "var(--fg)" : "var(--border)",
                      background: isPinned ? "var(--fg)" : "var(--bg-primary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {isPinned && <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 10, height: 10, color: "var(--bg-primary)" }}><path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" /></svg>}
                  </div>
                  <span style={{ fontSize: "13px", color: "var(--fg-muted)" }}>상단 고정</span>
                </label>
                {err && <p style={{ fontSize: "12px", color: "var(--destructive)" }}>{err}</p>}
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setSubMode("menu")}
                    disabled={busy}
                    style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--border)", background: "none", fontSize: "13px", cursor: "pointer" }}
                  >
                    취소
                  </button>
                  <button
                    onClick={submitAnnouncement}
                    disabled={busy || !title.trim() || !content.trim()}
                    style={{
                      padding: "8px 16px", borderRadius: "8px",
                      background: "var(--fg)", color: "var(--bg-primary)",
                      border: "none", fontSize: "13px", fontWeight: 600,
                      cursor: busy || !title.trim() || !content.trim() ? "not-allowed" : "pointer",
                      opacity: busy || !title.trim() || !content.trim() ? 0.5 : 1,
                    }}
                  >
                    {busy ? "등록 중…" : "등록"}
                  </button>
                </div>
              </div>
            </>
          )}

          {subMode === "recognition" && (() => {
            const meta = REC_META[recKind];
            return (
              <>
                <DialogHeader>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      onClick={() => setSubMode("menu")}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-muted)", fontSize: "13px", padding: 0 }}
                    >
                      ← 뒤로
                    </button>
                    <DialogTitle>{meta.title}</DialogTitle>
                  </div>
                </DialogHeader>

                {/* 종류 히어로 */}
                <div className="mb-1 flex items-start gap-3 rounded-[12px] border border-border bg-background-secondary/60 px-4 py-3">
                  <span className="text-[26px] leading-none">{meta.emoji}</span>
                  <p className="text-[12.5px] leading-relaxed text-foreground-muted">{meta.subtitle}</p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px", paddingTop: "2px" }}>
                  {/* 받는 사람 — 구성원/조직 선택 피커 */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--fg-muted)" }}>받는 사람</label>
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      disabled={busy}
                      className="flex items-center gap-2.5 rounded-[8px] border border-border bg-background-primary px-3 py-2 text-left transition-colors hover:border-border-strong"
                    >
                      {recipient ? (
                        <>
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-bold text-primary">
                            {recipient.name.slice(-2)}
                          </span>
                          <span className="text-[13px] font-medium text-foreground">{recipient.name}</span>
                          {recipient.departmentName && <span className="text-[11.5px] text-foreground-muted">· {recipient.departmentName}</span>}
                        </>
                      ) : (
                        <span className="text-[13px] text-foreground-subtle">구성원 선택</span>
                      )}
                      <span className="ml-auto text-[13px] text-foreground-subtle">›</span>
                    </button>
                  </div>

                  {/* 메시지 */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--fg-muted)" }}>메시지</label>
                    <textarea
                      className="w-full rounded-[8px] border border-border bg-background-primary px-3 py-2 text-[13px] text-foreground placeholder:text-foreground-subtle outline-none focus:border-foreground-subtle transition-colors resize-none"
                      placeholder={meta.placeholder}
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={1000}
                      disabled={busy}
                    />
                    <span style={{ fontSize: "11px", color: "var(--fg-subtle)" }}>받는 사람 본인만 확인할 수 있어요. ({message.length}/1000)</span>
                  </div>

                  {err && <p style={{ fontSize: "12px", color: "var(--destructive-600)" }}>{err}</p>}
                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => setSubMode("menu")}
                      disabled={busy}
                      style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--border)", background: "none", fontSize: "13px", cursor: "pointer" }}
                    >
                      취소
                    </button>
                    <button
                      onClick={submitRecognition}
                      disabled={busy || !recipientId || !message.trim()}
                      style={{
                        padding: "8px 16px", borderRadius: "8px",
                        background: "var(--fg)", color: "var(--bg-primary)",
                        border: "none", fontSize: "13px", fontWeight: 600,
                        cursor: busy || !recipientId || !message.trim() ? "not-allowed" : "pointer",
                        opacity: busy || !recipientId || !message.trim() ? 0.5 : 1,
                      }}
                    >
                      {busy ? "보내는 중…" : "보내기"}
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* 받는 사람 선택 피커 (구성원/조직) */}
      {pickerOpen && (
        <TargetPicker
          employees={employees}
          departments={departments}
          selectedIds={recipientId ? [recipientId] : []}
          onPick={(id) => { setRecipientId(id); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
          title="받는 사람 선택"
        />
      )}
    </>
  );
}
