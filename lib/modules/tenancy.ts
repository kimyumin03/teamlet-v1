// 테넌시(tenancy) 모듈 타입 — 원본 packages/modules/src/tenancy/membership.ts 의 PendingMemberItem 추출.

export type PendingMemberItem = {
  membershipId: string;
  userId: string;
  userName: string;
  userEmail: string;
  requestedAt: Date;
};
