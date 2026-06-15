// 직책(position) 모듈 타입 — 원본 packages/modules/src/position/index.ts 의 PositionItem 추출.

export type PositionItem = {
  id: string;
  name: string;
  isOrgHead: boolean;
  sortOrder: number;
  isActive: boolean;
  memberCount: number;
};
