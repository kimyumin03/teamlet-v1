// 알림(notification) 모듈 타입 — 원본 packages/modules/src/notification/types.ts 그대로
// (NotificationCategory 는 Prisma enum → 평범한 유니온으로 대체).
// 액션은 lib/actions/notification.ts 에서 drizzle 로 구현.

export type NotificationCategory =
  | "APPROVAL"
  | "LEAVE"
  | "HR"
  | "ANNOUNCEMENT"
  | "SYSTEM_SECURITY";

export type NotificationItem = {
  id: string;
  category: NotificationCategory;
  eventKey: string;
  title: string;
  body: string;
  deepLink: string | null;
  isRead: boolean;
  createdAt: Date;
};

export type CreateNotificationInput = {
  companyId: string;
  recipientEmployeeId: string;
  category: NotificationCategory;
  eventKey: string;
  title: string;
  body: string;
  deepLink?: string;
  relatedTargetType?: string;
  relatedTargetId?: string;
};
