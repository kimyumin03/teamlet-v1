/**
 * 공통 타입 (서버/클라이언트 공유).
 * 도메인 enum 은 Prisma 스키마(@teamlet/db)가 단일 출처 — 여기엔 횡단 타입만.
 */

/** 멤버십 상태 (docs/03 §13 UserCompanyMembership) */
export type MembershipStatus = "pending" | "active" | "suspended" | "left";

/** 가입 경로 */
export type JoinPath = "application" | "invite" | "company_code";

/** 권한 scope (docs/01 §5 / docs/03 §7) */
export type ScopeType = "all" | "department" | "direct_reports" | "self";

/** 인증된 세션 사용자 (회사 컨텍스트 포함 — 멀티 테넌시) */
export type SessionUser = {
  userId: string;
  email: string;
  name: string;
  /** 현재 활성 회사 컨텍스트 (멀티 테넌시 — 없으면 회사 미선택) */
  companyId: string | null;
  employeeId: string | null;
};

/** 페이지네이션 공통 */
export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
