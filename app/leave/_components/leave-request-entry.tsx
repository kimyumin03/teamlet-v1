"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@teamlet/ui";
import type { LeaveTypeItem, LeaveBalanceSummary } from "@teamlet/modules/leave";
import { RequestDialog, grantLabel, periodicRemaining, isMonthlyCycle } from "./leave-type-cards";

/**
 * 상단 "휴가 신청" 진입 — 종류 선택(세부) → 등록 2단계.
 * 휴가 종류를 고르면 등록 모달(RequestDialog)로 넘어감.
 */
export function LeaveRequestEntry({
  leaveTypes,
  balances,
  approverCandidates,
}: {
  leaveTypes: LeaveTypeItem[];
  balances: LeaveBalanceSummary[];
  approverCandidates: { id: string; name: string }[];
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<LeaveTypeItem | null>(null);
  const balanceMap = new Map(balances.map((b) => [b.leaveTypeId, b]));

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setPickerOpen(true)}>
        <Plus size={14} strokeWidth={2.4} /> 휴가 신청
      </button>

      {/* 1단계 — 휴가 종류 선택 */}
      <Dialog open={pickerOpen} onOpenChange={(o) => { if (!o) setPickerOpen(false); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>휴가 신청 — 종류 선택</DialogTitle>
          </DialogHeader>
          <p className="mb-3 text-[12.5px] text-foreground-muted">신청할 휴가 종류를 선택해 주세요.</p>
          <div className="types-grid">
            {leaveTypes.map((t) => {
              const balance = balanceMap.get(t.id);
              const rem = periodicRemaining(t);
              const isExhausted =
                (balance && balance.remainingDays <= 0 && balance.grantedDays > 0) ||
                (rem !== null && rem <= 0);
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`type${isExhausted ? " na" : ""}`}
                  onClick={() => { setSelected(t); setPickerOpen(false); }}
                  style={{
                    textAlign: "left", cursor: "pointer",
                    border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px",
                    background: isExhausted ? "var(--bg-secondary)" : "var(--bg-primary)",
                    minHeight: 84, display: "flex", flexDirection: "column", justifyContent: "center", gap: 2,
                  }}
                >
                  <div className="t">{t.name}</div>
                  {balance && balance.grantedDays > 0 ? (
                    <>
                      <div className="vt num" style={{ color: isExhausted ? "var(--fg-subtle)" : undefined }}>
                        {balance.remainingDays}<small>/ {balance.grantedDays + balance.adjustedDays}일</small>
                      </div>
                      <div className="s">사용 {balance.usedDays}일</div>
                    </>
                  ) : rem !== null ? (
                    <>
                      <div className="vt num" style={{ color: rem <= 0 ? "var(--fg-subtle)" : undefined }}>
                        {rem}<small>/ {t.grantAmount}일</small>
                      </div>
                      <div className="s">{isMonthlyCycle(t.periodicCycle) ? "이번 달 잔여" : "올해 잔여"}</div>
                    </>
                  ) : (
                    <div className="s" style={{ marginTop: 6, fontSize: 12, color: "var(--fg-muted)" }}>
                      {grantLabel(t, balance)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* 2단계 — 휴가 등록 */}
      {selected && (
        <Dialog open onOpenChange={(o) => { if (!o) setSelected(null); }}>
          <DialogContent className="max-w-md p-0 overflow-hidden" showClose={false}>
            <RequestDialog leaveType={selected} approverCandidates={approverCandidates} onClose={() => setSelected(null)} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
