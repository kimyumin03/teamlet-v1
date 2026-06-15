/**
 * 날짜 유틸 — 근속연수 / 시점 비교 (docs/04 §2 /shared/utils/date.ts).
 * 음력 변환은 korean-lunar-calendar 도입 시 확장 (Phase 3 휴가).
 */

/** 근속 연수 (소수점, 입사일 기준) */
export function tenureYears(hireDate: Date, at: Date = new Date()): number {
  const ms = at.getTime() - hireDate.getTime();
  return ms / (1000 * 60 * 60 * 24 * 365.25);
}

/** 시점 기반 이력 조회 헬퍼: effective_date <= at < next_effective */
export function isEffectiveAt(
  effectiveDate: Date,
  nextEffective: Date | null,
  at: Date = new Date(),
): boolean {
  if (effectiveDate.getTime() > at.getTime()) return false;
  if (nextEffective === null) return true;
  return nextEffective.getTime() > at.getTime();
}

/** YYYY-MM-DD (KST 가정) */
export function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 오늘 00:00 (적용일 기본값 — AppliedDateChip "적용일 오늘") */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 입사일로부터 asOf 기준 완성된 개월 수 (민법§160 응당일).
 * 연차 부여 엔진(auto-grant.ts)과 동일 함수 — 표시와 계산이 항상 일치.
 * 클라이언트 번들에서 안전하게 사용 가능 (DB/fs 의존성 없음).
 */
export function completedMonthsSinceHire(hireDate: Date, asOf: Date): number {
  let months =
    (asOf.getUTCFullYear() - hireDate.getUTCFullYear()) * 12 +
    (asOf.getUTCMonth() - hireDate.getUTCMonth());
  const lastDayOfAsOfMonth = new Date(
    Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const anniversaryDay = Math.min(hireDate.getUTCDate(), lastDayOfAsOfMonth);
  if (asOf.getUTCDate() < anniversaryDay) months -= 1;
  return Math.max(0, months);
}

// ── 연차/월차 소멸 기준일 계산 (근로기준법 §60⑦ 발생일 기산) ───────────────
// 소멸과 이월은 별개 정책 축이다:
//  · 소멸 시점 = expiryMode(부여일/입사일/회계일) + 1년 + graceMonths(유예, "추가" 개월수)
//  · 이월 한도 = carryoverMaxDays (연차에만 적용, 월차는 이월 없음)
// 두 함수 모두 DB 의존 없는 순수 함수 — 표시·계산·테스트가 항상 일치.

export type AnnualExpiryModeStr = "NONE" | "GRANT_DATE_1Y";
export type MonthlyExpiryModeStr = "NONE" | "HIRE_DATE_1Y" | "HIRE_DATE_1Y_FISCAL";
export type LeaveGrantModeStr = "FISCAL_YEAR" | "HIRE_DATE";

/**
 * 연차 소멸 기준일 = (해당 연도) 부여일 + 1년 + 유예.
 * 부여일은 grantMode 가 결정: HIRE_DATE → 그 해 입사 응당일, FISCAL_YEAR → 회계연도 시작일.
 * graceMonths 는 1년에 **추가**되는 유예 개월수(없으면 0).
 */
export function computeAnnualExpiryDate(opts: {
  year: number;
  grantMode: LeaveGrantModeStr;
  fiscalStartMonth: number;
  hireDate: Date | null;
  graceMonths: number;
}): Date {
  const { year, grantMode, fiscalStartMonth, hireDate, graceMonths } = opts;
  let grantDate: Date;
  if (grantMode === "HIRE_DATE" && hireDate) {
    grantDate = new Date(hireDate);
    grantDate.setFullYear(year);
  } else {
    grantDate = new Date(year, fiscalStartMonth - 1, 1);
  }
  grantDate.setFullYear(grantDate.getFullYear() + 1);
  grantDate.setMonth(grantDate.getMonth() + graceMonths);
  return grantDate;
}

/**
 * 월차(1년 미만 매월 부여분) 소멸 기준일 — 항상 **입사일** 기준(grantMode 무관).
 *  · HIRE_DATE_1Y         : 입사일 + 1년 + 유예
 *  · HIRE_DATE_1Y_FISCAL  : 입사 1년 시점 이후 도래하는 첫 회계연도 시작일 + 유예
 */
export function computeMonthlyExpiryDate(opts: {
  mode: Exclude<MonthlyExpiryModeStr, "NONE">;
  hireDate: Date;
  fiscalStartMonth: number;
  graceMonths: number;
}): Date {
  const { mode, hireDate, fiscalStartMonth, graceMonths } = opts;
  const oneYear = new Date(hireDate);
  oneYear.setFullYear(oneYear.getFullYear() + 1);

  if (mode === "HIRE_DATE_1Y_FISCAL") {
    let fiscal = new Date(oneYear.getFullYear(), fiscalStartMonth - 1, 1);
    if (fiscal < oneYear) fiscal = new Date(oneYear.getFullYear() + 1, fiscalStartMonth - 1, 1);
    fiscal.setMonth(fiscal.getMonth() + graceMonths);
    return fiscal;
  }

  oneYear.setMonth(oneYear.getMonth() + graceMonths);
  return oneYear;
}
