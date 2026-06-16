// 회사(company)/공휴일(holiday)/보안(security)/프로필(profile) 모듈 타입 — 설정 영역 소유.
// 원본 packages/modules/src/tenancy/{company,holiday}.ts + security/{types,mfa}.ts + auth/profile.ts 의
// 공개 타입을 그대로 옮긴 거예요.
// ⚠️ lib/modules/tenancy.ts 는 다른 영역 소유라 건드리지 않고, 회사/보안/프로필 타입은 여기에 모아 정의해요.
//    (lib/modules/security.ts 경로는 쓰기 차단이라 보안 타입도 이 파일에 함께 둬요.)

export type CompanyInfo = {
  id: string;
  name: string;
  businessNumber: string;
  corporateNumber: string | null;
  phone: string | null;
  foundedAt: Date | null;
  addressRoad: string | null;
  addressDetail: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  companyCode: string;
  companyCodeActive: boolean;
  visionMission: string | null;
};

export type CompanyUpdateInput = {
  name?: string;
  phone?: string | null;
  foundedAt?: string | null;
  addressRoad?: string | null;
  addressDetail?: string | null;
  visionMission?: string | null;
  companyCodeActive?: boolean;
  logoUrl?: string | null;
};

export type HolidayItem = {
  id: string;
  date: Date;
  name: string;
  isNational: boolean;
};

// ── 보안(security) ── 원본 enum MfaMethod → 평범한 유니온
export type MfaMethod = "OTP" | "SMS" | "EMAIL";

export type SecurityPolicyItem = {
  mfaEnabled: boolean;
  mfaMethod: MfaMethod;
  mfaExemptIps: string[];
  ipRestrictionEnabled: boolean;
  allowedIps: string[];
  applyToSuperAdmin: boolean;
};

export type UpdateSecurityPolicyInput = Partial<SecurityPolicyItem>;

export type MfaStatus = {
  isEnabled: boolean;
  enabledAt: Date | null;
};

// ── 프로필(profile) ──
export type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  hasPassword: boolean;
};
