// 권한(permission) 모듈 타입 — 원본 packages/modules/src/permission/role.ts·types.ts 추출.
// RoleType 은 Prisma enum → 평범한 string 유니온으로 대체.

export type RoleType =
  | "SYSTEM_SUPER_ADMIN"
  | "DYNAMIC_ORG_HEAD"
  | "DEFAULT"
  | "CUSTOM";

export type RoleListItem = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  type: RoleType;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  memberCount: number;
};
