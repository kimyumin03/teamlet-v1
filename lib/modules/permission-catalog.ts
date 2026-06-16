// 권한 카탈로그 + 역할-권한 매핑 타입 — 원본 packages/modules/src/permission/{catalog,mapping}.ts 에서 타입 추출.
// (lib/modules/permission.ts 는 다른 영역 소유라 READ-only — 카탈로그/매핑 타입은 이 새 파일에 둬요.)
// '@teamlet/modules/permission-catalog' → lib/modules/permission-catalog.ts 로 resolve.
// Prisma enum(PermissionAction/Sensitivity/ScopeType)은 평범한 문자열 유니온으로 대체.

export type PermissionAction = "READ" | "MANAGE" | "EXECUTE";
export type PermissionSensitivity = "NORMAL" | "SENSITIVE" | "CRITICAL";
export type ScopeType = "ALL" | "DEPARTMENT" | "DIRECT_REPORTS" | "SELF";

/** 카테고리 메타 — 슬러그/순서는 원본 catalog.ts 와 동일 */
export const PERMISSION_CATEGORIES = [
  { slug: "company", label: "회사 정보" },
  { slug: "member", label: "구성원" },
  { slug: "leave", label: "휴가" },
  { slug: "workflow", label: "워크플로우" },
  { slug: "document", label: "문서·증명서" },
  { slug: "recruit", label: "채용" },
  { slug: "tenancy", label: "멤버십·가입" },
  { slug: "permission", label: "권한" },
  { slug: "settings", label: "보안" },
  { slug: "notification", label: "알림" },
  { slug: "integration", label: "외부 연동" },
  { slug: "audit", label: "감사 로그" },
] as const;

export type PermissionCategorySlug = (typeof PERMISSION_CATEGORIES)[number]["slug"];

export type CatalogPermission = {
  id: string;
  key: string;
  category: string;
  domain: string;
  action: PermissionAction;
  name: string;
  description: string | null;
  sensitivity: PermissionSensitivity;
  hasScope: boolean;
  dependsOnPermissionKeys: string[];
  warningText: string | null;
};

/** 같은 도메인의 read/manage(/execute) 묶음 — UI 에서 한 행으로 표시 */
export type CatalogDomain = {
  slug: string;
  permissions: CatalogPermission[];
};

export type CatalogCategory = {
  slug: string;
  label: string;
  domains: CatalogDomain[];
};

/** 역할에 현재 매핑된 권한 한 건 — 권한 매트릭스 편집 UI 초기 상태용 */
export type RolePermissionItem = {
  permissionKey: string;
  scopeType: ScopeType | null;
  departmentIds: string[];
  includeSubDepartments: boolean;
};
