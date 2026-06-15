// 휴가(leave) 도메인 타입 — 원본 packages/modules/src/leave/types.ts 에서 추출.
// Prisma enum(LeaveRequestStatus 등)은 평범한 문자열 유니온으로 대체. 컴포넌트가 import 하는 타입의 단일 출처예요.
// (별칭 '@teamlet/modules/leave' → lib/modules/leave.ts 로 resolve)

export type LeaveRequestStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "CANCEL_PENDING";

export type LeavePromotionType = "ANNUAL" | "MONTHLY_1ST" | "MONTHLY_2ND";

export type LeavePromotionStatus =
  | "REQUESTED"
  | "ADMIN_WRITING"
  | "APPROVAL_PENDING"
  | "REJECTED"
  | "COMPLETED"
  | "EXPIRED"
  | "CANCELLED";

export type LeaveTxCategory = "MONTHLY" | "ANNUAL" | "EXTRA_GRANT" | "ADJUSTMENT";
export type LeaveTxType = "GRANT" | "EXPIRE" | "USE" | "ADJUST";

export type LeaveBalanceSummary = {
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeKey: string;
  grantedDays: number;
  usedDays: number;
  adjustedDays: number;
  remainingDays: number;
};

export type GrantLeaveInput = {
  employeeId: string;
  leaveTypeId: string;
  days: number;
  category: LeaveTxCategory;
  reason?: string;
  note?: string;
};

/** 날짜별 상세 일정 1줄 (다일 휴가 날짜마다 단위 개별 지정) */
export type LeaveScheduleEntry = {
  date: string; // YYYY-MM-DD
  unit: "FULL" | "AM_HALF" | "PM_HALF" | "HOURLY";
  startTime?: string; // HH:mm (반차/시간차)
  endTime?: string;
  days: number; // 이 날의 차감 일수 (종일 1 · 반차 0.5 · 시간차 시간/8)
};

export type RequestLeaveInput = {
  employeeId: string;
  leaveTypeId: string;
  /** 결재자 — undefined이면 즉시 자동 승인. 설정 시 FormDocument 결재 경유. */
  approverId?: string;
  startDate: Date;
  endDate: Date;
  days: number;
  reason?: string;
  evidenceFileUrl?: string;
  /** 날짜별 상세 일정 (비면 종일 균일). 있으면 days는 schedule 합산으로 검증. */
  schedule?: LeaveScheduleEntry[];
};

export type LeaveTypeItem = {
  id: string;
  name: string;
  key: string;
  grantAmount: number | null;
  grantMethod: string;
  grantUnit: string;
  paymentType: string;
  evidenceRequirement: string;
  approverEmployeeId: string | null;
  approverName: string | null;
  /** 고정 참조자 이름 */
  ccNames: string[];
  /** 한도 집계 주기 (monthly_* → 월 한도, null → 연 한도) */
  periodicCycle: string | null;
  /** 현재 주기(월/연) 사용량 — ON_REQUEST with grantAmount 일 때만 채워짐, 그 외 null */
  periodicUsed: number | null;
};

export type PendingLeaveRequestItem = {
  id: string;
  employeeName: string;
  leaveTypeName: string;
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  createdAt: Date;
};

export type LeaveRequestItem = {
  id: string;
  leaveTypeName: string;
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  status: LeaveRequestStatus;
  reviewNote: string | null;
  createdAt: Date;
  unitType: string;
  schedule: LeaveScheduleEntry[];
};

/** 연차 상세 — 월별 원장 한 행 */
export type AnnualLeaveLedgerRow = {
  month: number; // 1-12
  granted: number;
  expired: number;
  used: number;
  adjusted: number;
  remaining: number;
  isHireMonth: boolean;
  isCurrentMonth: boolean;
};

export type AnnualLeaveLedger = {
  year: number;
  hasAnnualType: boolean;
  rows: AnnualLeaveLedgerRow[];
  summary: { granted: number; expired: number; used: number; adjusted: number };
};

export type CompanyLeaveBalanceRow = {
  employeeId: string;
  employeeName: string;
  employeeNumber: string | null;
  departmentName: string | null;
  positionName: string | null;
  hireDate: Date | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  balances: {
    leaveTypeId: string;
    leaveTypeKey: string;
    leaveTypeName: string;
    grantedDays: number;
    usedDays: number;
    adjustedDays: number;
    remainingDays: number;
  }[];
};

export type MonthlyAnnualUsageRow = {
  employeeId: string;
  employeeName: string;
  employeeNumber: string | null;
  hireDate: Date | null;
  remainingDays: number;
  monthlyUsage: number[]; // 인덱스 0=1월 ~ 11=12월
};

export type CompanyLeaveRequestItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentName: string | null;
  leaveTypeName: string;
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  status: LeaveRequestStatus;
  createdAt: Date;
  formDocumentId: string | null;
  unitType: string;
  schedule: LeaveScheduleEntry[];
};

export type LeaveGrantHistoryRow = {
  id: string;
  occurredAt: Date;
  employeeId: string;
  employeeName: string;
  leaveTypeName: string;
  txType: string; // GRANT | ADJUST
  category: string;
  days: number;
  reason: string;
  actorName: string | null;
};

export type LeavePromotionItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string | null;
  departmentName: string | null;
  employmentStatus: string;
  year: number;
  promotionType: LeavePromotionType;
  targetDays: number;
  expiryDate: Date;
  status: LeavePromotionStatus;
  requestedAt: Date;
  submittedAt: Date | null;
  approvedAt: Date | null;
  planDates: Date[];
  formDocumentId: string | null;
};

/** 구성원 본인 — 내 휴가 > 연차 사용 계획 탭 */
export type MyLeavePromotionItem = {
  id: string;
  year: number;
  promotionType: LeavePromotionType;
  targetDays: number;
  expiryDate: Date;
  status: LeavePromotionStatus;
  requestedAt: Date;
  submittedAt: Date | null;
  planDates: Date[];
  formDocumentId: string | null;
  canSubmit: boolean;
};

export type LeavePlanActivityLog = {
  actorName: string;
  message: string;
  at: Date;
};

export type LeavePromotionDetail = {
  id: string;
  employeeName: string;
  employeeNumber: string | null;
  year: number;
  promotionType: LeavePromotionType;
  targetDays: number;
  expiryDate: Date;
  status: LeavePromotionStatus;
  requestedAt: Date;
  submittedAt: Date | null;
  approvedAt: Date | null;
  planDates: Date[];
  formDocumentId: string | null;
  activityLog: LeavePlanActivityLog[];
  approval: { step: number; approverName: string; status: string }[];
};
