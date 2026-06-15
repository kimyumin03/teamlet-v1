// 부서(department) 모듈 타입 — 원본 packages/modules/src/department/index.ts 의 DepartmentNode 추출.
// 트리 구성은 클라이언트 측에서 parentId 로 조립. (Prisma 타입은 평범한 타입으로 대체)

export type DepartmentNode = {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  memberCount: number;
};
