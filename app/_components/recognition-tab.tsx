import type { ReceivedRecognition } from "@teamlet/modules/recognition";
import { MarkRecognitionsRead } from "./mark-recognitions-read";
import { DeleteRecognitionButton } from "./delete-recognition-button";

/**
 * 인정·피드백 — 개인화 영역(공용 아님).
 * "내가 동료에게서 받은" 인정·피드백 메시지만 보여요. 나만 볼 수 있어요.
 */

const KIND_META: Record<ReceivedRecognition["kind"], { label: string; emoji: string; cls: string }> = {
  RECOGNITION: { label: "인정", emoji: "⭐", cls: "border-warning-200 bg-warning-50 text-warning-700" },
  FEEDBACK: { label: "피드백", emoji: "💬", cls: "border-info-100 bg-info-50 text-info-700" },
};

function formatRelative(d: Date) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (diff < 60) return `${diff}분 전`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
  return `${Math.floor(diff / 1440)}일 전`;
}

export function RecognitionTab({ items = [] }: { items?: ReceivedRecognition[] }) {
  return (
    <section className="flex flex-col gap-3">
      <MarkRecognitionsRead />
      <div className="sec-divider">인정 · 피드백<span className="line" /></div>

      {items.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-border px-5 py-12 text-center text-foreground-muted">
          <div className="mb-2 text-[26px]">💬</div>
          <div className="mb-1.5 text-[15px] font-semibold text-foreground">받은 인정 · 피드백이 없어요</div>
          <p className="text-[12.5px] leading-relaxed">
            동료가 나에게 보낸 인정과 피드백 메시지가 여기에 표시돼요.
            <br />나만 볼 수 있는 개인화된 공간이에요.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((r) => {
            const meta = KIND_META[r.kind];
            return (
              <article key={r.id} className={`group rounded-[12px] border border-border bg-background-primary p-4 ${!r.isRead ? "ring-1 ring-primary/20" : ""}`}>
                <div className="mb-2 flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}>
                    {meta.emoji} {meta.label}
                  </span>
                  <span className="text-[12.5px] font-medium text-foreground">{r.senderName}님이 보냄</span>
                  {!r.isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary" title="새 메시지" />}
                  <span className="ml-auto text-[11px] text-foreground-subtle">{formatRelative(r.createdAt)}</span>
                  <DeleteRecognitionButton id={r.id} />
                </div>
                <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-foreground">{r.message}</p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
