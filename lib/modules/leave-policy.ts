// 설정/연차정책·휴가유형·회사휴가설정 도메인 타입 — 원본 packages/modules/src/leave/{policy,type,company-settings}.ts 에서
// 컴포넌트가 import 하는 타입만 추출해 정의해요. Prisma enum 은 평범한 문자열 유니온으로 대체.
// (별칭 '@teamlet/modules/leave-policy' → lib/modules/leave-policy.ts 로 resolve)
//
// ⚠️ 휴가/휴가관리(leave) 도메인 타입은 lib/modules/leave.ts 가 소유 — 여기는 "설정" 화면용 정책/유형 타입만 담아요.

/* ── 연차 정책 enum ───────────────────────────── */
export type LeavePolicyGrantMode = "FISCAL_YEAR" | "HIRE_DATE";
export type MonthlyGrantRule =
  | "MONTHLY_ON_ATTENDANCE"
  | "LUMP_SUM_ON_HIRE_11"
  | "LUMP_SUM_UNTIL_FISCAL";
export type AnnualFirstYearRule =
  | "PRORATED_ON_FIRST_FISCAL"
  | "DAYS_15_ON_FIRST_FISCAL"
  | "DAYS_15_ON_ANNIVERSARY"
  | "LUMP_SUM_ON_HIRE_15";
export type DecimalRule = "ROUND_UP_DAY" | "ROUND_UP_HALF" | "NO_ADJUSTMENT";
export type LeaveUseUnit = "DAY" | "HALF_DAY" | "HOUR";
export type MonthlyExpiryMode = "NONE" | "HIRE_DATE_1Y" | "HIRE_DATE_1Y_FISCAL";
export type AnnualExpiryMode = "NONE" | "GRANT_DATE_1Y";

/** 연차 정책 한 건 — 목록 카드 + 편집 폼 모두 사용 */
export type LeavePolicyItem = {
  id: string;
  name: string;
  leaveTypeId: string;
  grantMode: LeavePolicyGrantMode;
  fiscalStartMonth: number;
  monthlyGrantRule: MonthlyGrantRule;
  annualFirstYearRule: AnnualFirstYearRule;
  decimalRule: DecimalRule;
  expiryMonths: number;
  carryoverMaxDays: number | null;
  useUnit: LeaveUseUnit;
  hourUnitMinutes: number | null;
  overdraftEnabled: boolean;
  overdraftMaxDays: number | null;
  monthlyExpiryMode: MonthlyExpiryMode;
  monthlyGraceMonths: number | null;
  annualExpiryMode: AnnualExpiryMode;
  annualGraceMonths: number | null;
  approverEmployeeId: string | null;
  ccEmployeeIds: string[];
  approveOnRegister: boolean;
  approveOnCancel: boolean;
  smartPromotionEnabled: boolean;
  isDefault: boolean;
  isActive: boolean;
  assignedCount: number;
};

/* ── 맞춤 휴가(휴가 유형) enum ─────────────────── */
export type LeaveGrantMethod =
  | "ON_REQUEST"
  | "ON_OTHER_EXHAUSTED"
  | "MANUAL"
  | "ON_HIRE"
  | "PERIODIC"
  | "ON_TENURE";
export type LeaveGrantUnit = "DAY" | "HOUR" | "MINUTE" | "UNLIMITED";
export type LeavePaymentType = "PAID" | "UNPAID" | "PARTIAL_PAID";
export type LeaveGenderRestriction = "ALL" | "MALE" | "FEMALE";
export type LeaveEvidenceRequirement = "NONE" | "BEFORE" | "AFTER";

/** 휴가 유형 전체 항목 — 설정/맞춤휴가 목록 + 편집 다이얼로그 */
export type LeaveTypeFullItem = {
  id: string;
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
  isRequired: boolean;
  isActive: boolean;
  grantMethod: LeaveGrantMethod;
  grantUnit: LeaveGrantUnit;
  grantAmount: number | null;
  paymentType: LeavePaymentType;
  partialPayDays: number | null;
  genderRestriction: LeaveGenderRestriction;
  evidenceRequirement: LeaveEvidenceRequirement;
  useUnit: LeaveUseUnit;
  hourUnitMinutes: number | null;
  deductOnHoliday: boolean;
  periodicCycle: string | null;
  tenureYears: number | null;
  excludedEmploymentTypes: string[];
  approverEmployeeId: string | null;
  ccEmployeeIds: string[];
};

export type LeaveTypeCreateInput = {
  name: string;
  key: string;
  description: string;
  grantMethod: LeaveGrantMethod;
  grantUnit: LeaveGrantUnit;
  grantAmount: number | null;
  paymentType: LeavePaymentType;
  partialPayDays: number | null;
  genderRestriction: LeaveGenderRestriction;
  evidenceRequirement: LeaveEvidenceRequirement;
  useUnit: LeaveUseUnit;
  hourUnitMinutes: number | null;
  deductOnHoliday: boolean;
  periodicCycle: string | null;
  tenureYears: number | null;
  excludedEmploymentTypes: string[];
  approverEmployeeId: string | null;
  ccEmployeeIds: string[];
};

export type LeaveTypeUpdateInput = Partial<Omit<LeaveTypeCreateInput, "key">> & {
  isActive?: boolean;
};

/* ── 회사 휴가 설정 (퇴직자 조정 + 촉진) ───────── */
export type RetirementAdjustMode = "EMPLOYEE_FAVORABLE" | "LABOR_LAW";

export type CompanyLeaveSettingsItem = {
  retirementAdjustMode: RetirementAdjustMode;
  promotionApproverEmployeeId: string | null;
  promotionCcEmployeeIds: string[];
  memberRemindEnabled: boolean;
  adminRemindEnabled: boolean;
  planNoticeDaysBefore: number;
  annualPromotionMonthsBefore: number;
  annualPromotionOffsetDays: number;
  monthly1stPromotionMonthsBefore: number;
  monthly1stPromotionOffsetDays: number;
  monthly2ndPromotionMonthsBefore: number;
  monthly2ndPromotionOffsetDays: number;
};

export type CompanyLeaveSettingsUpdateInput = Partial<CompanyLeaveSettingsItem>;

/* ── 연차 자동부여 결과 ───────────────────────── */
export type AutoGrantResult = {
  year: number;
  grantedCount: number;
  grantedDays: number;
  alreadyGrantedCount: number;
  skippedNoAmountCount: number;
  noPolicyCount: number;
};
