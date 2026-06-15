/**
 * 승인·참조자 선택 공통 값 모델 (Flex verbatim — docs/_transcribe/flexv2.md §G, teamlet.md [32])
 *
 * 여러 도메인에서 재사용: 연차 정책 / 맞춤 휴가 / 연차 촉진 설정 (Anti-Pattern #10 통합).
 *
 * ⚠️ 현재 DB 스키마(LeavePolicy/LeaveType)는 단일 `approverEmployeeId` + `ccEmployeeIds[]`만 저장.
 *    다단계 승인선(steps 2개+) · 참조 알림모드는 UI에서 입력 가능하나, 저장은 1단계+cc로 평탄화한다.
 *    (다단계 영속화는 후속 스키마 확장 — toLegacy/fromLegacy 참고)
 */

/** 참조자 알림 모드 (flexv2 #25 "알림 설정" 드롭다운) */
export type NotifyMode = "REQUEST_AND_COMPLETE" | "COMPLETE_ONLY" | "NONE";

export const NOTIFY_MODE_LABELS: Record<NotifyMode, string> = {
  REQUEST_AND_COMPLETE: "승인 요청, 완료 시 알림",
  COMPLETE_ONLY: "승인 완료 시 알림",
  NONE: "알림 없음",
};

export type CcRecipient = { employeeId: string; notify: NotifyMode };

/** 승인 단계 — 단계당 승인자 1명 이상 (flex는 보통 1명) */
export type ApprovalStep = { approverIds: string[] };

export type RecipientPickerValue = {
  /** 상단 칩 "요청자별 승인" — 요청자 조직에 따라 승인자를 동적 적용 */
  requesterApproval: boolean;
  /** 상단 칩 "변경 허용" — 신청자가 승인선을 변경할 수 있음 */
  allowChange: boolean;
  cc: CcRecipient[];
  steps: ApprovalStep[];
};

export const EMPTY_PICKER_VALUE: RecipientPickerValue = {
  requesterApproval: false,
  allowChange: false,
  cc: [],
  steps: [{ approverIds: [] }],
};

/** 피커 값 → 기존 스키마(단일 승인자 + 참조 배열) 평탄화 */
export function toLegacy(v: RecipientPickerValue): {
  approverEmployeeId: string | null;
  ccEmployeeIds: string[];
} {
  const firstApprover = v.steps.find((s) => s.approverIds.length > 0)?.approverIds[0] ?? null;
  return {
    approverEmployeeId: firstApprover,
    ccEmployeeIds: v.cc.map((c) => c.employeeId),
  };
}

/** 기존 스키마(단일 승인자 + 참조 배열) → 피커 값 복원 */
export function fromLegacy(
  approverEmployeeId: string | null | undefined,
  ccEmployeeIds: string[] | null | undefined,
): RecipientPickerValue {
  return {
    requesterApproval: false,
    allowChange: false,
    cc: (ccEmployeeIds ?? []).map((id) => ({ employeeId: id, notify: "REQUEST_AND_COMPLETE" as NotifyMode })),
    steps: approverEmployeeId ? [{ approverIds: [approverEmployeeId] }] : [{ approverIds: [] }],
  };
}

/** 요약 문구 — 트리거 행에 표시 ("1 단계 · 참조 1" 또는 "사용 안 함") */
export function summarize(v: RecipientPickerValue): string {
  const stepCount = v.steps.filter((s) => s.approverIds.length > 0).length;
  const ccCount = v.cc.length;
  if (stepCount === 0 && ccCount === 0) return "사용 안 함";
  const parts: string[] = [];
  if (stepCount > 0) parts.push(`${stepCount}단계 승인`);
  if (ccCount > 0) parts.push(`참조 ${ccCount}`);
  return parts.join(" · ");
}
