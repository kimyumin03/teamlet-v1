// 직원(employee) 모듈 타입 — 원본 packages/modules/src/employee/index.ts 의 EmployeeListItem 등에서
// 타입만 추출. 워크플로우 컴포넌트는 Pick<EmployeeListItem, "id"|"name"|"departmentName"> 만 써요.
// Prisma enum(EmploymentStatus 등)은 평범한 string 유니온으로 대체.

export type EmploymentStatus =
  | "ACTIVE"
  | "PROBATION"
  | "ON_LEAVE"
  | "SECONDED"
  | "RESIGNED"
  | "SCHEDULED";

export type EmployeeListItem = {
  id: string;
  name: string;
  employeeNumber: string | null;
  companyEmail: string | null;
  hireDate: Date | null;
  employmentStatus: EmploymentStatus;
  employmentType: string;
  isActive: boolean;
  departmentId: string | null;
  departmentName: string | null;
  positionId: string | null;
  positionName: string | null;
  roleName: string | null;
};

export type EmployeeListFilter = {
  departmentId?: string | null;
};

// ── enum 대체 (원본 @teamlet/db 의 Prisma enum → 평범한 유니온) ──
export type Gender = "MALE" | "FEMALE" | "OTHER";
export type EmploymentType =
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACT"
  | "INTERN"
  | "DISPATCH";
export type EducationDegree =
  | "HIGH_SCHOOL"
  | "ASSOCIATE"
  | "BACHELOR"
  | "MASTER"
  | "DOCTOR"
  | "ETC";
export type RoleType =
  | "SYSTEM_SUPER_ADMIN"
  | "DYNAMIC_ORG_HEAD"
  | "DEFAULT"
  | "CUSTOM";

// ── 상세 / 역할 / 경력·학력·가족 ──
export type EmployeeRoleAssignment = {
  userRoleId: string;
  roleId: string;
  roleName: string;
  roleType: RoleType;
  isSystem: boolean;
  assignedAt: Date;
};

export type EmployeeDetail = EmployeeListItem & {
  personalEmail: string | null;
  phone: string | null;
  birthDate: Date | null;
  gender: Gender | null;
  employmentType: EmploymentType;
  probationEndDate: Date | null;
  resignedAt: Date | null;
  leaveBalances: {
    leaveTypeName: string;
    granted: number;
    adjusted: number;
    used: number;
    remaining: number;
  }[];
  createdAt: Date;
  roles: EmployeeRoleAssignment[];
  hasLinkedAccount: boolean;
};

export type CareerHistoryItem = {
  id: string;
  companyName: string;
  position: string;
  department: string;
  startDate: Date;
  endDate: Date | null;
  description: string;
  sortOrder: number;
};

export type CareerHistoryInput = {
  companyName: string;
  position: string;
  department?: string;
  startDate: string;
  endDate?: string | null;
  description?: string;
};

export type EducationHistoryItem = {
  id: string;
  schoolName: string;
  major: string;
  degree: EducationDegree;
  enrollDate: Date;
  graduateDate: Date | null;
  description: string;
  sortOrder: number;
};

export type EducationHistoryInput = {
  schoolName: string;
  major?: string;
  degree?: EducationDegree;
  enrollDate: string;
  graduateDate?: string | null;
  description?: string;
};

export type FamilyMemberItem = {
  id: string;
  name: string;
  relationship: string;
  birthDate: Date | null;
  isDependent: boolean;
  gender: Gender | null;
  sortOrder: number;
};

export type FamilyMemberInput = {
  name: string;
  relationship: string;
  birthDate?: string | null;
  isDependent?: boolean;
  gender?: Gender | null;
};
