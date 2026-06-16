// 공지(announcement) 모듈 타입 — 원본 packages/modules/src/announcement/types.ts 그대로.
// (Prisma 타입 의존 없음 — 전부 평범한 타입). 액션은 lib/actions/announcement.ts 에서 drizzle 로 구현.

export type AnnouncementItem = {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  isPinned: boolean;
  createdAt: Date;
  commentCount: number;
};

export type CommentItem = {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
};

export type CreateAnnouncementInput = {
  companyId: string;
  authorId: string;
  title: string;
  content: string;
  isPinned?: boolean;
};

export type UpdateAnnouncementInput = {
  title?: string;
  content?: string;
  isPinned?: boolean;
};
